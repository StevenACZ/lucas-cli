# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- `LUCAS_CONFIG_DIR` selects an isolated private credentials directory for
  development and automated tests.
- Loans match the app: `loans create|update` take `--icon` (with the icon's
  own color unless `--color` is passed) and `--image` (a JPEG photo, at most
  256 KB and 1024 px per side); `loans update` also takes `--clear-icon` and
  `--clear-image`. `loans icons` lists the 32 icon names.
- `loans create --is-primary`, and `--disbursement-account` (with optional
  `--disbursement-amount` and `--disbursement-exchange-rate`) to book the money
  received as income when the loan is created.
- `loans get --payment-date` quotes what is owed on a given date, late fees
  included.
- `loans reorder <loan...>` puts the listed loans first; the rest keep their
  order.
- `settings update` sets the exchange rate, automatic exchange,
  excluded-account visibility, theme, primary timezone, language and the AI
  options (`--ai-enabled`, `--ai-smart-features-enabled`,
  `--ai-custom-context`).
- `categories create --name --icon --color` creates a custom category
  (`--dry-run` supported).
- `accounts reorder <account...>` puts the listed accounts first; the rest keep
  their order.
- `accounts convert-type <account> --type` converts an account to another type
  (`--credit-limit` and `--statement-closing-day` for CREDIT, `--dry-run`
  supported).
- `accounts permanent-delete <account> --yes` and `accounts empty-archive --yes`
  permanently remove an account, or every archived account, with their
  movements; exact name or id only.
- `accounts create` accepts `--current-debt` (CREDIT) and `--excluded`.
- `accounts list --include-archived` accepts `--limit` (1..50) and `--offset`
  and reports the archived page in `meta.archived`.

### Fixed

- Verified loan payments compare the recorded payment with the loan balance,
  including late fees and historical payment dates.
- `loans mark-paid` uses the paying account's currency and accepts an exchange
  rate, preserving the exact installment amount when currency cents round.
- A rejected number names the flag as typed (`--exchange-rate`, not
  `--exchangeRate`), and `settings update` without options is an error.

## [1.1.1] - 2026-09-29

### Security

- API URLs from `LUCAS_API_URL`, `auth login --api-url` and stored credentials
  must use `https://`; plain `http://` is accepted only for `localhost`,
  `127.0.0.1` and `::1`, or with `LUCAS_ALLOW_INSECURE_API=1`.
- A single stderr warning is printed whenever the CLI talks to an API other
  than `https://api.lucasapp.app`, including when `LUCAS_API_URL` overrides
  the API the stored credentials were issued for.
- `auth login` rejects a device `userCode` outside the expected format instead
  of printing it.
- `auth logout` clears local credentials even when the stored API URL is
  rejected, skipping only the remote revoke.

## [1.1.0] - 2026-09-28

### Added

- `lucas guide [topic]`: step-by-step recipes with the real traps for
  `expense`, `card-purchase`, `card-payment`, `transfer`, `loan-payment`,
  `subscription-charge`, `undo` and `bulk-import`. Every write step shows
  `--dry-run` first, and a test parses every step against the real command
  tree so a guide cannot drift from the CLI.
- `UNKNOWN_OPTION` and `UNKNOWN_COMMAND` errors carry a did-you-mean `hint`
  (prefix match first, then a small edit distance), e.g. `--from` suggests
  `--from-account`.
- Loans and subscriptions take a name or an id in every `<loan>` and
  `<subscription>` argument (`loans get|update|pay|mark-paid|unmark-paid|delete`,
  `subscriptions get|update|mark-paid|delete`), with the same `AMBIGUOUS` and
  `NOT_FOUND` errors as accounts. The permanent `delete` commands only accept
  the exact name or the id, never a partial match.
- `--dry-run` on `loans create`, `loans mark-paid`, `loans unmark-paid`,
  `subscriptions create`, `subscriptions mark-paid` and
  `subscription-charges pay|mark-paid`.
- `transactions create-many` sends each row's `notes`.

### Changed

- `subscriptions list` returns `meta.summary.upcomingPayments` as compact
  `{id, name, amount, currency, nextBilling, account}` rows.
- `subscriptions mark-paid`, `subscription-charges pay` and
  `subscription-charges mark-paid` describe whether they book an expense.

### Fixed

- Soft deletes (`transactions delete`, `transfers delete`,
  `investments trade-delete|cash-delete`) accept `--yes` as a no-op instead of
  failing with `UNKNOWN_OPTION`.

## [1.0.0] - 2026-09-28

### Breaking

- Every invocation prints exactly one JSON document on stdout, success and
  error alike: `{ok:true, data, meta?}` or
  `{ok:false, error:{code, message, status?, hint?, details?}}`. Errors no longer go to stderr and commander usage
  errors are JSON too (`UNKNOWN_OPTION` with `validOptions`, `UNKNOWN_COMMAND`
  with `commands`, `MISSING_OPTION`, `INVALID_VALUE`). Output is compact when
  piped and pretty on a TTY (`LUCAS_PRETTY=0|1` overrides).
- Exit codes: `0` ok, `1` failure, `2` usage or validation, `3` auth, `4` not
  found, `5` rate limited.
- List commands return `data` as an array, never a wrapper object, with
  pagination and summaries in `meta` (`count` always; `limit`, `offset`,
  `hasMore` or `truncated` when paginated): `accounts list`, `transactions list`,
  `transfers list`, `categories list`, `subscriptions list`,
  `subscription-charges list|pending|by-account`, `subscription-groups list`,
  `loans list`.
- `accounts list`, `transactions`, `transfers` and `categories` print compact
  views (`--full` keeps the raw object where offered). Transfers are one row
  per transfer with `from` and `to` accounts instead of two leg rows.
- Money-moving writes return the compact object plus the balances after the write
  (`account` or `accounts`), e.g. `transfers create` returns
  `{transfer, fee, accounts}`.
- Money flags take a positive amount with at most 2 decimals; the direction
  comes from `--type` or the command, never from a sign.
- `accounts delete`, `loans delete`, `subscriptions delete`,
  `subscription-groups delete`, `trash permanent-delete-*` and `trash empty-*`
  require `--yes`; without it they fail with `CONFIRMATION_REQUIRED` (exit 2).
- Enum flags reject unknown values with the allowed list instead of passing
  them to the API.
- `subscriptions list` defaults to 100 rows per page instead of the backend's 10.
- `accounts debt-detail` no longer forces `--mode current_cycle`; the backend
  picks `current_cycle` when the card has a closing day, else `custom`.

### Added

- Accounts and categories are accepted by name everywhere an id was: exact
  accent/case-insensitive match first, then a unique partial match; otherwise
  `AMBIGUOUS` or `NOT_FOUND` with candidates. Same-name default and custom
  categories resolve to the most recently used copy for writes and to every
  copy for filters. The old `--*-id` flags keep working as hidden aliases.
- `lucas overview`: accounts, totals by currency, this month's income, expense
  and net, and the pending charge count in one call.
- `lucas commands`: JSON catalog of every command, argument and option.
- `accounts get`, `transfers get`, `subscriptions get`, `loans get`.
- `transactions create-many --file <path|->`: validates every item first, then
  creates them through the bulk endpoint (50 per request, grouped per account),
  skipping duplicates; supports `--dry-run`.
- `transfers create --fee <amount>` records the fee as an expense on the source
  account atomically with the transfer (`--fee-description`,
  `--fee-category`); `--rate` replaces `--exchange-rate`.
- `--dry-run` on `transactions create`, `transactions create-many`,
  `transfers create`, `accounts pay-expense(s)` and `loans pay`.
- `--date` accepts `today`/`hoy`, `yesterday`/`ayer`, `YYYY-MM-DD` (12:00
  local), `YYYY-MM-DDTHH:mm` or ISO 8601 with offset; transaction and transfer
  views carry `localDate` in `LUCAS_TZ` or the machine timezone.
- `transactions list --all [--max n]` and exact `hasMore` on every paginated
  list.
- `categories list --type --search`, `subscriptions list --include-inactive`,
  `subscription-charges list --subscription --status`.

### Fixed

- Heavy blobs (`*Base64`, `ocrRawResponse`) never reach stdout, including
  `auth status --remote`, loans and subscriptions.
- `transfers update` without `--amount` resends the current amount, so a
  notes-only edit works.
- `accounts debt-detail` on a card without a statement closing day explains how
  to set it instead of a bare backend error.
- `auth status` without credentials exits `3` with `UNAUTHENTICATED`.

## [0.10.0] - 2026-08-15

### Added

- `accounts create --vault` and `accounts update --vault/--no-vault` set the
  savings-vault flag. A vault account keeps counting toward totals but the
  backend rejects it as the source of an expense, a card payment, a loan
  payment or a subscription with `422 VAULT_CANNOT_SEND`; transferring out of
  it stays allowed. CREDIT and INVESTMENT accounts answer
  `422 VAULT_TYPE_UNSUPPORTED`.

## [0.9.0] - 2026-08-12

### Added

- `transactions duplicate <id>` creates a copy of a movement through the new
  backend endpoint `POST /transactions/:id/duplicate`.

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
