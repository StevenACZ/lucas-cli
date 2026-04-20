# Changelog

All notable changes to this project will be documented in this file.

## [0.5.0] - 2026-04-20

### Added

- `lucas accounts debt-detail <id>` — credit-card debt breakdown per billing cycle (pass-through over `GET /api/accounts/:id/credit-debt-breakdown`). Flags: `--mode`, `--anchor-date`, `--start-date`, `--end-date`, `--search`, `--only-pending`, `--limit`, `--offset`. Default `--mode=current_cycle --limit=100` for AI-friendly single-page responses.
- `lucas accounts create --statement-closing-day <n>` — parity with `accounts update`. Required for credit cycle computations. Backend returns `creationWarning` on the created account when CREDIT accounts are created without this flag.
- `lucas accounts list` now returns `availableCredit` (`max(0, creditLimit - currentDebt)`) for CREDIT accounts with a non-null `creditLimit`. Field is omitted for all other account types.

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
