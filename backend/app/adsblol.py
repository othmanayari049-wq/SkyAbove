from __future__ import annotations

from dataclasses import dataclass
from typing import Any, type[RuntimeError]

import httpx

from .config import Settings

KM_PER_NAUTICAL_MILE = 1.852


class AdsbLolError(RuntimeError):
    """Raised when ADSB.lol cannot provide a usable response."""


class AdsbFiError(RuntimeError):
    """Raised when adsb.fi cannot provide a usable response."""


@dataclass(slots=True)
class AdsbPayload:
    source_time: int | None
    aircraft: list[dict[str, Any]]


def _parse_payload(payload: Any, error_type: type[RuntimeError], provider: str) -> AdsbPayload:
    if not isinstance(payload, dict):
        raise error_type(f"{provider} returned an unexpected response shape")

    aircraft_raw = payload.get("ac") or []
    if not isinstance(aircraft_raw, list):
        raise error_type(f"{provider} returned an invalid aircraft collection")

    aircraft = [item for item in aircraft_raw if isinstance(item, dict)]
    now_raw = payload.get("now")
    source_time: int | None = None
    if isinstance(now_raw, (int, float)):
        source_time = int(now_raw / 1000) if now_raw > 10_000_000_000 else int(now_raw)

    return AdsbPayload(source_time=source_time, aircraft=aircraft)


class AdsbLolClient:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._owns_client = client is None
        self.client = client or httpx.AsyncClient(
            timeout=httpx.Timeout(settings.adsblol_timeout_seconds),
            headers={"User-Agent": "SkyAbove/0.3 (+https://github.com/othmanayari049-wq/SkyAbove)"},
        )

    async def close(self) -> None:
        if self._owns_client:
            await self.client.aclose()

    async def fetch_nearby(self, lat: float, lon: float, radius_km: float) -> AdsbPayload:
        radius_nm = max(1.0, min(250.0, radius_km / KM_PER_NAUTICAL_MILE))
        url = (
            f"{self.settings.adsblol_base_url.rstrip('/')}/v2/lat/{lat:.6f}/"
            f"lon/{lon:.6f}/dist/{radius_nm:.2f}"
        )
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            payload = response.json()
        except httpx.TimeoutException as exc:
            raise AdsbLolError("ADSB.lol request timed out") from exc
        except httpx.HTTPError as exc:
            raise AdsbLolError("ADSB.lol network request failed") from exc
        except ValueError as exc:
            raise AdsbLolError("ADSB.lol returned invalid JSON") from exc

        return _parse_payload(payload, AdsbLolError, "ADSB.lol")


class AdsbFiClient:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._owns_client = client is None
        self.client = client or httpx.AsyncClient(
            timeout=httpx.Timeout(settings.adsbfi_timeout_seconds),
            headers={"User-Agent": "SkyAbove/0.3 (+https://github.com/othmanayari049-wq/SkyAbove)"},
        )

    async def close(self) -> None:
        if self._owns_client:
            await self.client.aclose()

    async def fetch_nearby(self, lat: float, lon: float, radius_km: float) -> AdsbPayload:
        radius_nm = max(1.0, min(250.0, radius_km / KM_PER_NAUTICAL_MILE))
        url = (
            f"{self.settings.adsbfi_base_url.rstrip('/')}/v3/lat/{lat:.6f}/"
            f"lon/{lon:.6f}/dist/{radius_nm:.2f}"
        )
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            payload = response.json()
        except httpx.TimeoutException as exc:
            raise AdsbFiError("adsb.fi request timed out") from exc
        except httpx.HTTPError as exc:
            raise AdsbFiError("adsb.fi network request failed") from exc
        except ValueError as exc:
            raise AdsbFiError("adsb.fi returned invalid JSON") from exc

        return _parse_payload(payload, AdsbFiError, "adsb.fi")
