# Deployment Guide

SkyAbove has two independently deployable services:

- `frontend/`: Next.js web application.
- `backend/`: FastAPI API proxy and geospatial processing service.

## Production requirements

- Serve the frontend over HTTPS. Modern browsers generally restrict precise geolocation to secure contexts.
- Serve the backend over HTTPS when the frontend is HTTPS to avoid mixed-content blocking.
- Set `CORS_ORIGINS` to the exact production frontend origin or a comma-separated list of trusted origins.
- Set `NEXT_PUBLIC_API_BASE_URL` at frontend build time to the public backend URL.
- Keep OpenSky credentials on the backend only.

## Environment

Backend example:

```dotenv
CORS_ORIGINS=https://skyabove.example.com
OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=
OPENSKY_TIMEOUT_SECONDS=12
CACHE_TTL_SECONDS=8
OVERHEAD_THRESHOLD_KM=8
```

Frontend build environment:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://api.skyabove.example.com
NEXT_PUBLIC_POLL_INTERVAL_MS=30000
```

## Docker Compose

For a single host:

```bash
cp .env.example .env
docker compose up --build -d
```

Put an HTTPS reverse proxy or managed ingress in front of ports 3000 and 8000 for public deployment.

## Separate hosting

The frontend can be deployed to a platform that supports Next.js. The backend can run on any platform that supports a Python web service or the provided Docker image.

When services are on different domains, verify both `NEXT_PUBLIC_API_BASE_URL` and `CORS_ORIGINS` before deployment.

## Privacy and logs

SkyAbove itself does not persist user coordinates. Infrastructure can still log HTTP query strings, which contain latitude and longitude for nearby-aircraft requests. Configure proxy, CDN, application-performance, and access logging with this privacy consideration in mind.

## Health check

The backend exposes:

```text
GET /health
```

A healthy instance returns HTTP 200 with `{"status":"ok","service":"skyabove-api"}`.

## OpenSky capacity

Public deployments should review current OpenSky API limits and terms before choosing polling intervals or expected traffic. The included short cache reduces duplicate calls but is process-local; multiple backend replicas should use a shared cache if upstream request deduplication is required across replicas.
