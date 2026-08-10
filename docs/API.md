# SkyAbove API

Default local base URL: `http://localhost:8000`.

FastAPI generates interactive documentation at `/docs` and `/redoc`.

## `GET /health`

```json
{"status":"ok","service":"skyabove-api"}
```

## `GET /api/v1/aircraft/nearby`

Returns aircraft inside a circular radius around the provided WGS-84 point.

| Parameter | Type | Range | Required |
|---|---|---:|---|
| `lat` | float | -90 to 90 | yes |
| `lon` | float | -180 to 180 | yes |
| `radius_km` | float | 1 to 250 | no, default 50 |

Nullable OpenSky fields remain `null`; SkyAbove does not guess missing telemetry.

### Errors

- `429 Too Many Requests`: upstream OpenSky credits are exhausted. A `Retry-After` header is returned when available.
- `503 Service Unavailable`: upstream timeout, network error, or unusable response.
