# Changelog

All notable changes to this project will be documented in this file.

## [0.6.5] - 2026-05-19

### Changed

- `subscriptions list` now accepts the current backend paginated response shape
  and supports `--limit`, `--offset`, `--frequency`, `--type`, and `--group-id`.
- `transactions list` now exposes backend-supported filters for comma-separated
  account/category IDs, search text, amount ranges, and canonical
  `--limit`/`--offset` pagination.
- `transfers list` now supports backend pagination via `--limit` and
  `--offset` over transfer pairs while preserving both transaction rows.
- `accounts list --include-archived` now fetches archived accounts explicitly
  and returns archived account metadata while preserving active-account totals.
- `exchange-rate convert --amount` now adds a client-side `convertedAmount`
  using the backend rate.

### Fixed

- API network failures now return structured JSON errors instead of raw Node.js
  stack traces.
- `auth login` now reports a friendly connection error when a local or custom
  API URL is unreachable.

### Security

- Device authorization remains split between visible `userCode` and secret
  `deviceCode`; production smoke tests verified the visible code cannot poll
  for a token.

## [0.6.0] - 2026-05-09

### Added

- `lucas ai usage`, `parse-expenses`, `parse-expenses-image`, `insights`, and `chat-message` commands for the current LucasApp AI endpoints.

### Changed

- Public plan copy now exposes only `FREE` and `PREMIUM`; Premium is `$4/month` with unlimited accounts, unlimited subscriptions, and AI limits of 50/day, 300/week, and 1000/month.
- Receipt image parsing now documents and enforces a maximum of 10 images per request.
- Backend limit errors (`AI_PLAN_REQUIRED`, `AI_LIMIT_REACHED`, `SUBSCRIPTION_REQUIRED`, `ACCOUNT_LIMIT_EXCEEDED`) now map to CLI-friendly messages.

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
