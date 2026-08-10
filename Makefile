.PHONY: dev test lint backend-test backend-lint frontend-lint frontend-build

dev:
	docker compose up --build

test: backend-test

lint: backend-lint frontend-lint

backend-test:
	cd backend && pytest -q

backend-lint:
	cd backend && ruff check .

frontend-lint:
	cd frontend && npm run lint && npm run typecheck

frontend-build:
	cd frontend && npm run build
