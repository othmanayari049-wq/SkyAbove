from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SkyAbove API"
    environment: str = "development"
    cors_origins: str = "http://localhost:3000"
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
    def opensky_authenticated(self) -> bool:
        return bool(self.opensky_client_id and self.opensky_client_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
