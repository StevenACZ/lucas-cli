# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.8.0] - 2026-07-26

### Fixed

- `accounts create --balance` sends `initialBalance`, the field the API
  actually accepts; the opening balance used to be dropped silently.
- Numeric flags reject an empty or whitespace-only value instead of reading it
  as `0`, so `lucas loans pay <id> --amount "$UNSET_VAR"` no longer posts a
  zero payment.
- `subscriptions list` derives `computedStatus` from the oldest unpaid charge,
  so an overdue charge is still reported when a newer charge is already paid,
  and answers `UNKNOWN` instead of `PAID_UP_TO_DATE` when the subscription has
  no charge history at all.
- `loans pay --verified` and `loans mark-paid --verified` keep an accepted
  payment when the post-payment re-read fails. The re-read no longer ends the
  process, so a persisted payment is never reported as a failure that invites a
  retry of a non-idempotent POST.
- `auth status` no longer answers `authenticated: true` for a token that has
  already expired.
- The update notice can no longer fail a command: it runs after the command and
  an unwritable cache directory is ignored.

### Changed

- **Breaking:** `subscriptions list` mirrors the backend envelope. When the API
  answers `{ items, summary, pagination }`, `.data` is that object with the
  enriched subscriptions in `.data.items`; a bare array response still returns a
  bare array. In JS read `.data.items ?? .data`; with jq use
  `.data | if type=="array" then . else .items end`, because jq hard-errors when
  indexing an array with a string.
- **Breaking:** `loans pay --verified` and `loans mark-paid --verified` exit `0`
  when verification fails. An accepted payment is already persisted, so the
  outcome is reported in the payload instead of the exit code:
  `data.verification.verified` is `true`, `false` with a `reason`, or `null`
  when the re-read could not answer. Both commands used to exit `1` with a 409
  error envelope.
- `loans mark-paid` reports `data.markedInstallment.remainingAfter` and
  `fullyPaid`, so an installment left partially paid — for example when the
  server materialises a late fee inside the same payment — is visible.
  `remainingAmount` keeps reporting the amount that was paid.
- Loan verification tolerates a late fee added by the server during the payment
  and reports it as `data.verification.lateFeesAdded`.
- `auth status` adds `expired` and derives `authenticated` from it.
- `subscriptions list` `computedStatus` adds `UNKNOWN` for a subscription with
  no charge history.

### Removed

- **Breaking:** `ai parse-expenses-image` no longer accepts HEIC. The API
  accepts only JPEG, PNG, and WebP, so HEIC files are rejected locally; convert
  them first.

## [0.7.0] - 2026-07-11

### Added

- `lucas stats overview` — full stats for one period (`--period
WEEK|MONTH|SIX_MONTHS|YEAR`, `--currency`, `--offset` for historical
  windows) in a single call.
- `lucas accounts pay-expense` and `lucas accounts pay-expenses` — pay one or
  up to 50 credit-card expenses atomically from `ACCOUNT`, `EXTERNAL`, or
  `CASHBACK` funding sources (batch items via repeatable
  `--item <transactionId[=amount]>`).
- Credit-card cashback: `lucas accounts cashback-redeem` and
  `cashback-adjust`, `--cashback-enabled`/`--cashback-rate` on
  `accounts create`/`update`, and `--cashback-amount` on
  `transactions create`/`update`.
- `lucas ai insights get` and `lucas ai insights generate --period WEEK|MONTH`
  for the persisted AI financial insight.
- `lucas trash` group: `summary`, `transactions`, `transfers`,
  `restore-transaction`, `restore-transfer`, `permanent-delete-transaction`,
  `permanent-delete-transfer`, `empty-transactions`, and `empty-transfers`.
- `lucas accounts archive` / `unarchive`, `lucas accounts stats`, and
  `lucas accounts balance-history --range --anchor-date`.
- `lucas transactions get <id>` for a single transaction.
- `lucas transfers update --to-account-id` to correct the destination account.
- `lucas subscriptions create/update --payment-start-day` (and
  `--clear-payment-start-day`) for backend payment windows, plus
  `lucas subscriptions services` for the service catalog.
- `lucas exchange-rate bcr` for the USD→PEN reference rate.
- `lucas auth status --remote` verifies the token against `GET /api/auth/me`.
- API requests now time out (30s default, 120s for AI endpoints), expose the
  backend `x-request-id` in error details, and surface `Retry-After` on
  HTTP 429 as `retryAfterSeconds`.
- `auth login`/`logout` requests time out after 10s, and the login poll fails
  fast when the backend no longer recognizes the device code (404/410).
- A stderr warning is printed when `LUCAS_API_URL` overrides the API the
  stored credentials were issued for.

### Fixed

- `error.details.code` is always `RATE_LIMITED` on HTTP 429, even when the
  backend payload carries its own error code.

### Changed

- **Breaking:** `lucas auth login` uses the new device-auth flow approved from
  the LucasApp iOS app (Settings → Security → CLI Access). The browser/dashboard
  approval step is gone, tokens carry a user-chosen scope (`READ_ONLY` or
  `FULL`), and a denied request is reported explicitly. On success the CLI now
  prints the standard JSON envelope (`deviceName`, `scope`, `expiresAt`) to
  stdout. Existing tokens are invalid; run `lucas auth login` again.
- **Breaking:** removed `--merchant`/`--clear-merchant` from
  `transactions create`/`update`; the backend dropped the merchant field.
- `CLI_READ_ONLY` and `CLI_FORBIDDEN_ENDPOINT` backend errors map to
  actionable CLI messages on every command.
- Plan copy is no longer hardcoded: backend error messages pass through, with
  neutral fallbacks (no plan numbers or prices) when the backend sends none.
- CLI version is read from `package.json` instead of a hand-maintained
  constant.
- Toolchain: commander 15 (Node >= 22.12), typecheck via TypeScript 7,
  eslint 10.7, typescript-eslint 8.63, vitest 4.1.10, prettier 3.9.5.
- Homepage now points to the GitHub repository (the web dashboard was
  retired).

### Removed

- Removed hardcoded plan copy (`PLAN_FEATURES`) and the obsolete dependency
  `overrides` block.

## [0.6.8] - 2026-05-28

### Changed

- Removed the final legacy LucasApp production API URL alias from CLI config
  resolution. Stored credentials should point directly to
  `https://api.lucasapp.app`.

## [0.6.7] - 2026-05-28

### Added

- Added `lucas investments` commands for instrument discovery, portfolio
  overview, positions, activity, trades, cash adjustments, and archived
  investment recovery.
- Added investment history and permanent archive cleanup commands.
- Added `lucas investments refresh` for backend catalog/EOD/snapshot refresh
  jobs.
- Added `lucas subscriptions calendar` for the backend monthly billing
  calendar.
- Added `lucas subscription-groups` list/create/update/delete/reorder commands.
- Added `lucas subscription-charges` commands for pending charges, account
  charges, pay, confirm, and manual paid actions.

### Changed

- Changed the default production API URL to `https://api.lucasapp.app` and the
  CLI landing/approval URL to `https://dashboard.lucasapp.app/cli`.
- `accounts update` now supports `--currency` to match backend account currency
  edits.
- `subscriptions create` and `subscriptions update` now support `--group-id`.

### Fixed

- Existing credentials that still reference the legacy production API now
  resolve to `https://api.lucasapp.app`, and `LUCAS_API_URL` can override stored
  credential URLs for local testing.

## [0.6.6] - 2026-05-20

### Removed

- Removed the retired `lucas ai chat-message` command to match the backend AI
  surface. LucasApp CLI AI now exposes only `usage`, `parse-expenses`,
  `parse-expenses-image`, and `insights`.

### Changed

- `lucas ai usage` examples and tests now use the supported `lite` service type
  instead of the removed `chat` type.

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

- `lucas ai usage`, `parse-expenses`, `parse-expenses-image`, and `insights` commands for the current LucasApp AI endpoints.

### Changed

- Public plan copy now exposes only `FREE` and `PREMIUM`.
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
