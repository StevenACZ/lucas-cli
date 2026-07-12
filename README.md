# LucasApp CLI

Manage LucasApp finances from the terminal. The CLI is built for humans,
scripts, and AI agents: command output is structured JSON unless a command is
explicitly interactive.

## Install

```bash
npm install -g lucasapp-cli
```

## Authenticate

```bash
lucas auth login
lucas auth status --remote
lucas auth logout
```

`login` prints a short device code and waits while you approve it from the
LucasApp iOS app: open LucasApp on your iPhone → Settings → Security → CLI
Access → enter the code. There is no browser step. When approving, you choose
the token's access level in the app:

- **Read-only** — `GET` commands plus `lucas auth logout`. Write commands fail
  with a hint to re-link with full access.
- **Full** — every CLI command.

On approval the CLI stores `~/.config/lucas/credentials.json` (owner-only
permissions) with the token, its scope, and its expiry, and prints a JSON
confirmation to stdout. Progress text goes to stderr, so scripted callers can
parse stdout only. `status` shows the local token info (including scope);
`--remote` also verifies the token against the API. `logout` revokes the token
server-side and deletes the local credentials.

## Common Commands

```bash
lucas accounts list --include-archived
lucas accounts create --name "Savings" --type SAVINGS --bank BCP --currency PEN
lucas accounts debt-detail <account-id> --mode current_cycle
lucas accounts stats
lucas accounts balance-history <account-id> --range month
lucas accounts pay-expense <credit-id> --transaction-id <tx-id> --source ACCOUNT --from-account-id <id>
lucas accounts pay-expenses <credit-id> --source CASHBACK --item <tx-1> --item <tx-2>=50
lucas accounts cashback-redeem <credit-id> --amount 25
lucas accounts cashback-adjust <credit-id> --balance 100
lucas accounts archive <account-id>

lucas transactions list --from 2026-05-01 --to 2026-05-31 --search rappi --limit 10
lucas transactions get <transaction-id>
lucas transactions create --account-id <id> --amount 35 --type EXPENSE --description "Lunch"

lucas transfers list --limit 10 --offset 0
lucas transfers create --from-account-id <id> --to-account-id <id> --amount 500
lucas transfers update <transfer-id> --amount 500 --to-account-id <id>

lucas subscriptions list --type SERVICE --limit 20
lucas subscriptions calendar --month 2026-05 --type SUBSCRIPTION --frequency MONTHLY
lucas subscriptions services
lucas subscriptions mark-paid <id>
lucas subscription-groups list
lucas subscription-charges pending --limit 10
lucas subscription-charges pay <charge-id>
lucas subscription-charges revert-payment <charge-id>

lucas settings get
lucas settings update --subscription-pending-advance-days 1

lucas loans list
lucas loans pay <id> --amount 750 --verified
lucas loans mark-paid <id> --verified

lucas stats summary
lucas stats overview --period MONTH --offset 1
lucas stats by-category --year 2026 --month 5
lucas exchange-rate convert --from USD --to PEN --amount 25
lucas exchange-rate bcr

lucas trash summary
lucas trash transactions --limit 20
lucas trash restore-transaction <transaction-id>
lucas trash restore-transfer <transfer-id>

lucas ai usage
lucas ai insights get
lucas ai insights generate --period MONTH
lucas ai parse-expenses "lunch at Pardos S/ 35" --date 2026-05-08 --account-id <id>
lucas ai parse-expenses-image receipt.jpg --date 2026-05-08 --account-id <id>
```

Command groups: `auth`, `accounts`, `transactions`, `transfers`,
`subscriptions`, `subscription-groups`, `subscription-charges`, `settings`,
`loans`, `stats`, `categories`, `exchange-rate`, `ai`, and `trash`.
The `ai` group is intentionally limited to usage, financial insights, and
text/image expense parsing.

List commands are intentionally agent-friendly:

- `transactions list` supports `--account-id`, `--account-ids`,
  `--category-id`, `--category-ids`, `--type`, `--search`, `--min-amount`,
  `--max-amount`, `--from`, `--to`, `--limit`, and `--offset`.
- `transfers list` supports `--limit` and `--offset` over transfer pairs. Each
  transfer pair still returns its two transaction rows.
- `subscriptions list` supports `--limit`, `--offset`, `--frequency`, `--type`,
  and `--group-id`.
- `subscriptions calendar` mirrors the backend monthly billing calendar, and
  `subscription-groups` exposes group list/create/update/delete/reorder.
- `subscription-charges` exposes generated charges, pending-charge pagination,
  account-scoped charges, and pay/confirm/manual-paid/revert actions.
- `accounts list --include-archived` includes archived accounts in the account
  array and adds `archivedAccounts` metadata. Balance/debt totals remain the
  active-account totals returned by LucasApp.
- `accounts list` adds `availableCredit` to CREDIT accounts:
  `max(0, creditLimit - currentDebt)`. A negative `currentDebt` (overpaid
  card) intentionally raises `availableCredit` above `creditLimit`.
- `exchange-rate convert --amount <n>` includes a client-side
  `convertedAmount` derived from the backend rate.
- Investments are hidden for launch. Setting `LUCAS_INVESTMENTS=1` exposes the
  experimental `investments` group, which only works against a backend with
  the investments feature enabled.

## For AI Agents

- Every non-interactive command prints exactly one JSON envelope:
  `{ "ok": true, "data": ... }` on stdout for success, or
  `{ "ok": false, "error": { message, statusCode?, details? } }` on stderr for
  failures. Human-readable progress (for example during `auth login`) goes to
  stderr only. Exception: argument-parsing errors (unknown flag, missing
  required option) print commander's plain-text usage message on stderr.
- Exit code is `0` on success and `1` on any failure — parse the error
  envelope for the reason. `error.details` carries the backend error `code`,
  the response `requestId` (`x-request-id`), and `retryAfterSeconds` on rate
  limits (HTTP 429).
- Requests time out after 30s (120s for `ai` commands) with a structured
  `TIMEOUT` error.
- A read-only token fails write commands with `CLI_READ_ONLY`; re-link with
  full access from the app to enable writes.
- `LUCAS_API_URL` overrides the API base URL (advanced/local development
  only); credentials live in `~/.config/lucas/credentials.json`.
- `LUCAS_DISABLE_UPDATE_NOTIFIER=1` suppresses the update banner (it is
  already suppressed when stdout/stderr are not TTYs or `CI=true`).

## JSON Output

Success:

```json
{ "ok": true, "data": { "example": true } }
```

Error:

```json
{
  "ok": false,
  "error": {
    "message": "Not authenticated. Run: lucas auth login",
    "statusCode": 401
  }
}
```

## Security Notes

- Do not pass arbitrary local files to agent-driven commands.
- `parse-expenses-image` accepts only real JPG, PNG, WebP, or HEIC files and
  rejects symlinks, suspicious credential paths, unsupported extensions, and
  oversized images.
- Resource IDs are validated before building API paths.
- Backend error details are summarized by default. Set `LUCAS_DEBUG=1` only
  while debugging locally; sensitive fields are redacted.
- Network failures return structured JSON instead of raw Node stack traces.
- The default production API is `https://api.lucasapp.app`.
- `LUCAS_API_URL` is intended for local development and advanced testing. Normal
  users should keep the default production URL.
- Never commit `.env`, `.npmrc`, credentials, keys, certificates, service
  account files, database dumps, or private fixtures.

## Development

```bash
bun install --frozen-lockfile
bun run format:check
bun run typecheck
bun run lint
bun run test
bun run build
npm pack --dry-run --json --ignore-scripts
```

The npm package publishes only the built CLI and package metadata. Releases use
npm Trusted Publishing with provenance; do not add long-lived npm tokens to the
repository or workflow.

## License

MIT
