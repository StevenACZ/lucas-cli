# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-21

### Added

- Device authorization flow (`lucas auth login`) with browser-based approval
- Full CRUD commands for accounts, transactions, transfers, subscriptions, and loans
- Financial statistics: summary, monthly, and by-category
- Categories listing and currency exchange rate conversion
- JSON-only output designed for AI agent consumption
- Credential storage at `~/.config/lucas/credentials.json` with `chmod 600`
- Token expiration validation before API requests
- GitHub Actions CI pipeline and npm publish workflow

### Security

- Browser launch uses `execFile` instead of `exec` to prevent command injection
- CLI tokens hashed with SHA-256 server-side (raw token never stored on server)
- Tokens expire after 90 days with automatic expiration check
