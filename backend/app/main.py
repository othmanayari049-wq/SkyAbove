from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .adsblol import AdsbLolClient
from .config import get_settings
from .models import NearbyAircraftResponse
from .opensky import OpenSkyClient, OpenSkyRateLimitError
from .service import AircraftDataError, AircraftService

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    opensky = OpenSkyClient(settings)
    adsblol = AdsbLolClient(settings)
    app.state.aircraft_service = AircraftService(settings, opensky, adsblol)
    yield
    await adsblol.close()
    await opensky.close()


app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description="Location-scoped live aircraft data for the SkyAbove web application.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "skyabove-api"}


@app.get("/api/v1/aircraft/nearby", response_model=NearbyAircraftResponse, tags=["aircraft"])
async def nearby_aircraft(
    request: Request,
    response: Response,
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    radius_km: float = Query(default=50.0, ge=1, le=250),
) -> NearbyAircraftResponse:
    service: AircraftService = request.app.state.aircraft_service
    try:
        result = await service.nearby(lat, lon, radius_km)
    except OpenSkyRateLimitError as exc:
        headers = {}
        if exc.retry_after_seconds is not None:
            headers["Retry-After"] = str(exc.retry_after_seconds)
        raise HTTPException(
            status_code=429,
            detail="OpenSky API credit limit reached. Try again after the upstream retry window.",
            headers=headers,
        ) from exc
    except AircraftDataError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    response.headers["Cache-Control"] = "private, max-age=5"
    return result
