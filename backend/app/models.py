from datetime import datetime

from pydantic import BaseModel, Field


class Coordinate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class Aircraft(BaseModel):
    icao24: str
    callsign: str | None = None
    origin_country: str | None = None
    latitude: float
    longitude: float
    baro_altitude_m: float | None = None
    geo_altitude_m: float | None = None
    on_ground: bool = False
    velocity_mps: float | None = None
    track_deg: float | None = None
    vertical_rate_mps: float | None = None
    squawk: str | None = None
    position_source: str | None = None
    category: str | None = None
    last_contact: int | None = None
    distance_km: float = Field(ge=0)
    bearing_deg: float = Field(ge=0, lt=360)
    overhead_candidate: bool = False


class NearbyAircraftResponse(BaseModel):
    generated_at: datetime
    source_time: int | None = None
    data_provider: str = "unknown"
    center: Coordinate
    radius_km: float
    count: int
    cache_hit: bool = False
    upstream_rate_limit_remaining: int | None = None
    aircraft: list[Aircraft]
