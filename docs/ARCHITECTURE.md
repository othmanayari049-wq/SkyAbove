# SkyAbove Architecture

## Design goals

SkyAbove is organized around four goals:

1. Keep device geolocation on a minimal data path.
2. Hide upstream credentials from the browser.
3. Limit unnecessary OpenSky API-credit consumption.
4. Make geospatial calculations deterministic and testable.

## Request flow

1. The browser requests geolocation permission.
2. The frontend receives latitude/longitude from `navigator.geolocation`.
3. It calls `GET /api/v1/aircraft/nearby` with coordinates and a radius.
4. FastAPI validates coordinates and radius.
5. The backend turns the radius into one or two WGS-84 bounding boxes, including anti-meridian handling.
6. The OpenSky client requests live state vectors with `extended=1`.
7. The backend normalizes the positional response into named fields.
8. State vectors without coordinates are discarded.
9. Haversine distance is calculated from the user to each aircraft.
10. Results outside the requested circular radius are discarded.
11. Bearing, category/source labels, and an `overhead_candidate` flag are added.
12. Aircraft are returned sorted by distance.
13. The frontend updates markers and extends the selected aircraft's in-memory trail.

## Cache strategy

OpenSky meters `/states/all` with API credits. SkyAbove keeps a small in-memory cache keyed by a tightly rounded center and radius. The default TTL is 8 seconds.

The cache is process-local. A multi-replica deployment should use a shared cache if cross-replica deduplication matters.

## Privacy boundary

There is no application database in the default architecture. Device coordinates exist in browser memory, HTTP request parameters, backend request memory, and transient cache keys. Operators should configure reverse-proxy/access logging with location privacy in mind because query strings can appear in infrastructure logs.

## Failure behavior

- OpenSky timeout/network failure -> `503`.
- OpenSky rate limit -> `429` with retry information when available.
- Invalid coordinates/radius -> FastAPI `422`.
- Browser permission denied/unavailable -> frontend displays an error and stops polling.
