from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SkyAbove API"
    environment: str = "development"
    cors_origins: str = "http://localhost:3000"

    aircraft_providers: str = "airplaneslive,adsbfi,adsblol,opensky"

    airplaneslive_base_url: str = "https://api.airplanes.live/v2"
    airplaneslive_timeout_seconds: float = Field(default=12.0, gt=1, le=60)

    adsbfi_base_url: str = "https://opendata.adsb.fi/api"
    adsbfi_timeout_seconds: float = Field(default=12.0, gt=1, le=60)

    adsblol_base_url: str = "https://api.adsb.lol"
    adsblol_timeout_seconds: float = Field(default=12.0, gt=1, le=60)

    opensky_base_url: str = "https://opensky-network.org/api"
    opensky_token_url: str = (
        "https://auth.opensky-network.org/auth/realms/opensky-network/"
        "protocol/openid-connect/token"
    )
    opensky_client_id: str | None = None
    opensky_client_secret: str | None = None
    opensky_timeout_seconds: float = Field(default=12.0, gt=1, le=60)

    cache_ttl_seconds: float = Field(default=8.0, ge=0, le=60)
    overhead_threshold_km: float = Field(default=8.0, gt=0, le=25)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def aircraft_provider_list(self) -> list[str]:
        supported = {"airplaneslive", "adsbfi", "adsblol", "opensky"}
        providers: list[str] = []
        for raw_provider in self.aircraft_providers.split(","):
            provider = raw_provider.strip().lower()
            if provider in supported and provider not in providers:
                providers.append(provider)
        return providers or ["airplaneslive", "adsbfi", "adsblol", "opensky"]

    @property
    def opensky_authenticated(self) -> bool:
        return bool(self.opensky_client_id and self.opensky_client_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
