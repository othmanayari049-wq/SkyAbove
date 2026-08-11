from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from .config import Settings

KM_PER_NAUTICAL_MILE = 1.852


class AirplanesLiveError(RuntimeError):
    """Raised when Airplanes.live cannot provide a usable response."""


@dataclass(slots=True)
class AirplanesLivePayload:
    source_time: int | None
    aircraft: list[dict[str, Any]]


class AirplanesLiveClient:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._owns_client = client is None
        self.client = client or httpx.AsyncClient(
            timeout=httpx.Timeout(settings.airplaneslive_timeout_seconds),
            headers={"User-Agent": "SkyAbove/0.4 (+https://github.com/othmanayari049-wq/SkyAbove)"},
        )

    async def close(self) -> None:
        if self._owns_client:
            await self.client.aclose()

    async def fetch_nearby(
        self,
        lat: float,
        lon: float,
        radius_km: float,
    ) -> AirplanesLivePayload:
        radius_nm = max(1.0, min(250.0, radius_km / KM_PER_NAUTICAL_MILE))
        url = (
            f"{self.settings.airplaneslive_base_url.rstrip('/')}/point/"
            f"{lat:.6f}/{lon:.6f}/{radius_nm:.2f}"
        )

        try:
            response = await self.client.get(url)
            response.raise_for_status()
            payload = response.json()
        except httpx.TimeoutException as exc:
            raise AirplanesLiveError("Airplanes.live request timed out") from exc
        except httpx.HTTPError as exc:
            raise AirplanesLiveError("Airplanes.live network request failed") from exc
        except ValueError as exc:
            raise AirplanesLiveError("Airplanes.live returned invalid JSON") from exc

        if not isinstance(payload, dict):
            raise AirplanesLiveError("Airplanes.live returned an unexpected response shape")

        aircraft_raw = payload.get("ac") or []
        if not isinstance(aircraft_raw, list):
            raise AirplanesLiveError("Airplanes.live returned an invalid aircraft collection")

        aircraft = [item for item in aircraft_raw if isinstance(item, dict)]
        now_raw = payload.get("now")
        source_time: int | None = None
        if isinstance(now_raw, (int, float)):
            source_time = int(now_raw / 1000) if now_raw > 10_000_000_000 else int(now_raw)

        return AirplanesLivePayload(source_time=source_time, aircraft=aircraft)
