from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from .config import Settings
from .geo import haversine_km, initial_bearing_deg, radius_to_bounding_boxes
from .models import Aircraft, Coordinate, NearbyAircraftResponse
from .opensky import OpenSkyClient

POSITION_SOURCES = {0: "ADS-B", 1: "ASTERIX", 2: "MLAT", 3: "FLARM"}
AIRCRAFT_CATEGORIES = {
    0: "No information", 1: "No ADS-B emitter category", 2: "Light", 3: "Small",
    4: "Large", 5: "High vortex large", 6: "Heavy", 7: "High performance",
    8: "Rotorcraft", 9: "Glider / sailplane", 10: "Lighter-than-air",
    11: "Parachutist / skydiver", 12: "Ultralight / hang-glider / paraglider",
    13: "Reserved", 14: "Unmanned aerial vehicle", 15: "Space / trans-atmospheric vehicle",
    16: "Surface emergency vehicle", 17: "Surface service vehicle", 18: "Point obstacle",
    19: "Cluster obstacle", 20: "Line obstacle",
}


@dataclass(slots=True)
class CacheEntry:
    expires_at: float
    response: NearbyAircraftResponse


def _value(state: list[Any], index: int) -> Any:
    return state[index] if len(state) > index else None


def normalize_state(state: list[Any], *, center_lat: float, center_lon: float, radius_km: float, overhead_threshold_km: float) -> Aircraft | None:
    if not isinstance(state, list):
        return None
    longitude, latitude, icao24 = _value(state, 5), _value(state, 6), _value(state, 0)
    if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
        return None
    if not isinstance(icao24, str) or not icao24:
        return None
    distance_km = haversine_km(center_lat, center_lon, float(latitude), float(longitude))
    if distance_km > radius_km:
        return None
    callsign_raw = _value(state, 1)
    callsign = callsign_raw.strip() if isinstance(callsign_raw, str) else None
    callsign = callsign or None
    position_source_raw, category_raw = _value(state, 16), _value(state, 17)
    on_ground = bool(_value(state, 8))

    def number(index: int) -> float | None:
        value = _value(state, index)
        return float(value) if isinstance(value, (int, float)) else None

    last_contact_raw = _value(state, 4)
    last_contact = int(last_contact_raw) if isinstance(last_contact_raw, (int, float)) else None
    squawk_raw = _value(state, 14)
    squawk = str(squawk_raw) if squawk_raw is not None else None
    return Aircraft(
        icao24=icao24.lower(), callsign=callsign,
        origin_country=_value(state, 2) if isinstance(_value(state, 2), str) else None,
        latitude=float(latitude), longitude=float(longitude), baro_altitude_m=number(7),
        geo_altitude_m=number(13), on_ground=on_ground, velocity_mps=number(9),
        track_deg=number(10), vertical_rate_mps=number(11), squawk=squawk,
        position_source=POSITION_SOURCES.get(position_source_raw),
        category=AIRCRAFT_CATEGORIES.get(category_raw), last_contact=last_contact,
        distance_km=round(distance_km, 3),
        bearing_deg=round(initial_bearing_deg(center_lat, center_lon, float(latitude), float(longitude)), 2),
        overhead_candidate=(not on_ground and distance_km <= overhead_threshold_km),
    )


class AircraftService:
    def __init__(self, settings: Settings, opensky: OpenSkyClient) -> None:
        self.settings, self.opensky = settings, opensky
        self._cache: dict[tuple[float, float, float], CacheEntry] = {}
        self._cache_lock = asyncio.Lock()

    @staticmethod
    def _cache_key(lat: float, lon: float, radius_km: float) -> tuple[float, float, float]:
        return (round(lat, 4), round(lon, 4), round(radius_km, 1))

    async def nearby(self, lat: float, lon: float, radius_km: float) -> NearbyAircraftResponse:
        key, now = self._cache_key(lat, lon, radius_km), time.monotonic()
        async with self._cache_lock:
            cached = self._cache.get(key)
            if cached and cached.expires_at > now:
                return cached.response.model_copy(update={"cache_hit": True})
            if cached:
                self._cache.pop(key, None)
        boxes = radius_to_bounding_boxes(lat, lon, radius_km)
        payloads = await asyncio.gather(*(self.opensky.fetch_states(box) for box in boxes))
        source_times = [p.source_time for p in payloads if p.source_time is not None]
        remaining_values = [p.rate_limit_remaining for p in payloads if p.rate_limit_remaining is not None]
        by_icao: dict[str, Aircraft] = {}
        for payload in payloads:
            for state in payload.states:
                aircraft = normalize_state(state, center_lat=lat, center_lon=lon, radius_km=radius_km, overhead_threshold_km=self.settings.overhead_threshold_km)
                if aircraft is None:
                    continue
                existing = by_icao.get(aircraft.icao24)
                if existing is None or (aircraft.last_contact or 0) > (existing.last_contact or 0):
                    by_icao[aircraft.icao24] = aircraft
        aircraft_list = sorted(by_icao.values(), key=lambda item: item.distance_km)
        result = NearbyAircraftResponse(
            generated_at=datetime.now(UTC), source_time=max(source_times) if source_times else None,
            center=Coordinate(lat=lat, lon=lon), radius_km=radius_km, count=len(aircraft_list),
            cache_hit=False, upstream_rate_limit_remaining=min(remaining_values) if remaining_values else None,
            aircraft=aircraft_list,
        )
        if self.settings.cache_ttl_seconds > 0:
            async with self._cache_lock:
                self._cache[key] = CacheEntry(time.monotonic() + self.settings.cache_ttl_seconds, result)
        return result
