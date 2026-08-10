# Security Policy

## Reporting a vulnerability

Avoid filing a public issue for vulnerabilities that could expose credentials, private locations, or infrastructure secrets. Use GitHub private vulnerability reporting if enabled for this repository.

## Secrets

- Keep `OPENSKY_CLIENT_SECRET` on the backend only.
- Never place secrets in variables prefixed with `NEXT_PUBLIC_`.
- Never commit `.env` files.
- Rotate any credential that is accidentally exposed.

## Location privacy

SkyAbove does not include persistence for user locations. Contributors should preserve that default and clearly document any future feature that stores, logs, or sends location data elsewhere.
