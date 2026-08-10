from __future__ import annotations

from math import asin, atan2, cos, degrees, radians, sin, sqrt

EARTH_RADIUS_KM = 6371.0088
KM_PER_DEGREE_LAT = 111.32


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in kilometres between two WGS-84 points."""
    phi1, phi2 = radians(lat1), radians(lat2)
    d_phi = radians(lat2 - lat1)
    d_lambda = radians(lon2 - lon1)
    a = sin(d_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(a))


def initial_bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return initial great-circle bearing clockwise from true north."""
    phi1, phi2 = radians(lat1), radians(lat2)
    d_lambda = radians(lon2 - lon1)
    y = sin(d_lambda) * cos(phi2)
    x = cos(phi1) * sin(phi2) - sin(phi1) * cos(phi2) * cos(d_lambda)
    return (degrees(atan2(y, x)) + 360.0) % 360.0


def radius_to_bounding_boxes(lat: float, lon: float, radius_km: float) -> list[tuple[float, float, float, float]]:
    """Return OpenSky-compatible bounding boxes and split at the anti-meridian."""
    lat_delta = radius_km / KM_PER_DEGREE_LAT
    min_lat = max(-90.0, lat - lat_delta)
    max_lat = min(90.0, lat + lat_delta)
    cos_lat = max(abs(cos(radians(lat))), 0.01)
    lon_delta = min(180.0, radius_km / (KM_PER_DEGREE_LAT * cos_lat))
    raw_min_lon = lon - lon_delta
    raw_max_lon = lon + lon_delta

    if raw_min_lon >= -180.0 and raw_max_lon <= 180.0:
        return [(min_lat, raw_min_lon, max_lat, raw_max_lon)]
    if raw_min_lon < -180.0:
        return [
            (min_lat, -180.0, max_lat, raw_max_lon),
            (min_lat, raw_min_lon + 360.0, max_lat, 180.0),
        ]
    return [
        (min_lat, raw_min_lon, max_lat, 180.0),
        (min_lat, -180.0, max_lat, raw_max_lon - 360.0),
    ]
