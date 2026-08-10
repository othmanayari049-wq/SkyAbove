# Contributing to SkyAbove

Thanks for improving SkyAbove.

## Development workflow

1. Fork or branch from `main`.
2. Keep each pull request focused on one feature or fix.
3. Add or update tests for backend logic.
4. Run the project checks before opening a PR.
5. Never commit API credentials, browser location logs, or user-identifying data.

## Checks

```bash
cd backend
ruff check .
pytest -q

cd ../frontend
npm run lint
npm run typecheck
npm run build
```

Prefer short imperative commits such as `Add aircraft radius filtering` or `Handle OpenSky rate limits`.

Do not post OpenSky client secrets or precise personal locations in public issues.
