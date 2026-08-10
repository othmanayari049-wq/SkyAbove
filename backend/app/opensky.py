from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any

import httpx

from .config import Settings


class OpenSkyError(RuntimeError):
    """Base upstream error."""


class OpenSkyRateLimitError(OpenSkyError):
    def __init__(self, retry_after_seconds: int | None = None) -> None:
        super().__init__("OpenSky API rate limit reached")
        self.retry_after_seconds = retry_after_seconds


@dataclass(slots=True)
class OpenSkyPayload:
    source_time: int | None
    states: list[list[Any]]
    rate_limit_remaining: int | None


class OpenSkyClient:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._owns_client = client is None
        self.client = client or httpx.AsyncClient(
            timeout=httpx.Timeout(settings.opensky_timeout_seconds),
            headers={"User-Agent": "SkyAbove/0.1 (+https://github.com/othmanayari049-wq/SkyAbove)"},
        )
        self._access_token: str | None = None
        self._token_expires_at = 0.0
        self._token_lock = asyncio.Lock()

    async def close(self) -> None:
        if self._owns_client:
            await self.client.aclose()

    async def _token(self, force: bool = False) -> str | None:
        if not self.settings.opensky_authenticated:
            return None

        now = time.monotonic()
        if not force and self._access_token and now < self._token_expires_at:
            return self._access_token

        async with self._token_lock:
            now = time.monotonic()
            if not force and self._access_token and now < self._token_expires_at:
                return self._access_token

            try:
                response = await self.client.post(
                    self.settings.opensky_token_url,
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self.settings.opensky_client_id,
                        "client_secret": self.settings.opensky_client_secret,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                response.raise_for_status()
                payload = response.json()
                token = payload["access_token"]
                expires_in = float(payload.get("expires_in", 1800))
            except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
                raise OpenSkyError("Unable to authenticate with OpenSky") from exc

            self._access_token = str(token)
            self._token_expires_at = time.monotonic() + max(30.0, expires_in - 60.0)
            return self._access_token

    async def _request_states(
        self,
        bbox: tuple[float, float, float, float],
        *,
        force_token_refresh: bool = False,
    ) -> httpx.Response:
        lamin, lomin, lamax, lomax = bbox
        headers: dict[str, str] = {}
        token = await self._token(force=force_token_refresh)
        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            return await self.client.get(
                f"{self.settings.opensky_base_url.rstrip('/')}/states/all",
                params={
                    "lamin": lamin,
                    "lomin": lomin,
                    "lamax": lamax,
                    "lomax": lomax,
                    "extended": 1,
                },
                headers=headers,
            )
        except httpx.TimeoutException as exc:
            raise OpenSkyError("OpenSky request timed out") from exc
        except httpx.HTTPError as exc:
            raise OpenSkyError("OpenSky network request failed") from exc

    async def fetch_states(
        self, bbox: tuple[float, float, float, float]
    ) -> OpenSkyPayload:
        response = await self._request_states(bbox)

        if response.status_code == 401 and self.settings.opensky_authenticated:
            response = await self._request_states(bbox, force_token_refresh=True)

        if response.status_code == 429:
            raw_retry = response.headers.get("X-Rate-Limit-Retry-After-Seconds")
            try:
                retry_after = int(raw_retry) if raw_retry is not None else None
            except ValueError:
                retry_after = None
            raise OpenSkyRateLimitError(retry_after)

        try:
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise OpenSkyError(f"OpenSky returned HTTP {response.status_code}") from exc

        if not isinstance(payload, dict):
            raise OpenSkyError("OpenSky returned an unexpected response shape")

        states = payload.get("states") or []
        if not isinstance(states, list):
            raise OpenSkyError("OpenSky returned an invalid states collection")

        remaining_raw = response.headers.get("X-Rate-Limit-Remaining")
        try:
            remaining = int(remaining_raw) if remaining_raw is not None else None
        except ValueError:
            remaining = None

        source_time_raw = payload.get("time")
        source_time = source_time_raw if isinstance(source_time_raw, int) else None
        return OpenSkyPayload(source_time, states, remaining)
