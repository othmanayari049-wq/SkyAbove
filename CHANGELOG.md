# Changelog

All notable changes to SkyAbove are documented here.

The project follows semantic versioning for published releases.

## [0.1.0] - 2026-08-10

### Added

- Live nearby-aircraft tracking using OpenSky state vectors.
- Automatic browser geolocation and configurable 25–200 km radar radius.
- Interactive Leaflet map with heading-aware aircraft markers and range rings.
- Closest overhead-candidate detection, bearing, distance, altitude, speed, and telemetry details.
- In-memory selected-aircraft trail history.
- FastAPI backend with OpenSky anonymous and OAuth2 client-credentials modes.
- Geographic bounding-box generation, anti-meridian handling, Haversine radius filtering, and bearing calculations.
- API-credit-aware short cache and upstream rate-limit handling.
- Responsive dark radar interface for desktop and mobile.
- Dockerfiles, Docker Compose, automated CI, Ruff, Pytest, ESLint, and TypeScript checks.
- Security, contribution, API, architecture, deployment, issue, and pull-request documentation.
