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

## Commands

Accounts, categories, loans and subscriptions are accepted by name or id everywhere (see
[Name resolution](#name-resolution)). Run `lucas commands` for the full JSON
catalog or `lucas <group> <command> --help` for one command.

```bash
lucas overview                                  # accounts, totals, this month, pending charges
lucas commands                                  # every command, argument and option as JSON
lucas guide [topic]                             # write recipes and their traps

lucas accounts list [--include-archived] [--full]
lucas accounts get "ITK Soles"
lucas accounts create --name "Savings" --type SAVINGS --bank BCP --currency PEN
lucas accounts update "Visa Signature" --statement-closing-day 20
lucas accounts delete "Old card" --yes
lucas accounts archive|unarchive <account>
lucas accounts stats
lucas accounts balance-history "ITK Soles" --range month
lucas accounts debt-detail "Visa Signature" [--mode current_cycle|last_statement|custom]
lucas accounts pay-expense "Visa Signature" --transaction-id <tx> --source ACCOUNT --from-account "ITK Soles" [--dry-run]
lucas accounts pay-expenses "Visa Signature" --source CASHBACK --item <tx-1> --item <tx-2>=50 [--dry-run]
lucas accounts cashback-redeem "Visa Signature" --amount 25
lucas accounts cashback-adjust "Visa Signature" --balance 100

lucas transactions list --account "ITK Soles" --from 2026-09-01 --to today [--all]
lucas transactions get <id>
lucas transactions create --account "ITK Soles" --type EXPENSE --amount 35 --description "Lunch" --category Food [--dry-run]
lucas transactions create-many --file expenses.json [--dry-run]
lucas transactions update <id> --category Food --date yesterday
lucas transactions delete <id>                  # to the trash
lucas transactions duplicate <id>

lucas transfers list --limit 20
lucas transfers get <id>
lucas transfers create --from-account "ITK Soles" --to-account "ITK Dólares" --amount 370 --to-amount 100 [--fee 2.50] [--dry-run]
lucas transfers update <id> --notes "Rent"
lucas transfers delete <id>                     # to the trash

lucas categories list [--type INCOME|EXPENSE] [--search food]

lucas subscriptions list [--include-inactive] [--type SERVICE]
lucas subscriptions get Netflix
lucas subscriptions create --name Netflix --amount 44.90 --frequency MONTHLY --billing-day 15 --account "Visa Signature" [--dry-run]
lucas subscriptions update Netflix --billing-day 30
lucas subscriptions delete Netflix --yes
lucas subscriptions mark-paid Netflix [--dry-run]    # pays the current charge
lucas subscriptions calendar --month 2026-05 --type SUBSCRIPTION --frequency MONTHLY
lucas subscriptions services
lucas subscription-groups list|create|update|delete|reorder
lucas subscription-charges list [--subscription <id>] [--status PENDING|OVERDUE|PAID]
lucas subscription-charges pending --limit 10
lucas subscription-charges by-account "Visa Signature"
lucas subscription-charges pay|mark-paid <charge-id> [--dry-run]
lucas subscription-charges confirm|revert-payment <charge-id>

lucas loans list
lucas loans get "Car loan"
lucas loans create|update ... [--account "ITK Soles"]   # create takes --dry-run
lucas loans pay "Car loan" --amount 750 --account "ITK Soles" [--verified] [--dry-run]
lucas loans mark-paid "Car loan" --verified [--dry-run]
lucas loans unmark-paid "Car loan" [--dry-run]
lucas loans delete "Car loan" --yes

lucas stats summary|overview|monthly|by-category
lucas settings get|update
lucas exchange-rate convert --from USD --to PEN --amount 25
lucas exchange-rate bcr

lucas trash summary|transactions|transfers
lucas trash restore-transaction|restore-transfer <id>
lucas trash permanent-delete-transaction|permanent-delete-transfer <id> --yes
lucas trash empty-transactions|empty-transfers --yes

lucas ai usage
lucas ai insights get|generate
lucas ai parse-expenses "lunch at Pardos S/ 35" --date 2026-05-08 --account-id <id>
lucas ai parse-expenses-image receipt.jpg --date 2026-05-08 --account-id <id>
```

Notes:

- `accounts list` adds `availableCredit` to CREDIT accounts:
  `max(0, creditLimit - currentDebt)`. A negative `currentDebt` (overpaid
  card) intentionally raises it above `creditLimit`. `meta` carries
  `balancesByCurrency` and `debtByCurrency` for active accounts.
- `accounts` exposes the `vault` flag (`create --vault`,
  `update --vault/--no-vault`). A vault account counts toward totals and can
  receive money, but the backend rejects it as the source of an expense, card
  payment, loan payment or subscription; only transfers out of it are allowed.
- `accounts debt-detail` modes `current_cycle` and `last_statement` need a
  statement closing day: `lucas accounts update <card> --statement-closing-day <1..31>`.
- `transactions create-many` reads a JSON array of
  `{account, type, amount, description, category?, date?, notes?}` from a file or `-`
  for stdin. Every item is validated before anything is written; items are
  sent 50 per request per account, and movements that already exist (same day,
  type, amount and description) come back in `skipped`.
- `transfers create --fee <amount>` records the fee as a separate EXPENSE on
  the source account in the same database transaction as the transfer
  (`--fee-description`, default `Comisión: <description>`; `--fee-category`).
- `exchange-rate convert --amount <n>` includes a client-side
  `convertedAmount` derived from the backend rate.
- Investments are hidden for launch. Setting `LUCAS_INVESTMENTS=1` exposes the
  experimental `investments` group, which only works against a backend with
  the investments feature enabled.

## For AI Agents

Before any write, run `lucas guide` to list the recipes and
`lucas guide <topic>` (`expense`, `card-purchase`, `card-payment`,
`transfer`, `loan-payment`, `subscription-charge`, `undo`, `bulk-import`) for
the exact commands, in order, and the mistakes to avoid.

### Output contract

Every invocation prints exactly one JSON document on stdout, success or error,
so stdout always parses. It is compact when piped and pretty on a TTY
(`LUCAS_PRETTY=0|1` overrides). Human progress (for example during
`auth login`) goes to stderr only.

```json
{
  "ok": true,
  "data": [{ "id": "..." }],
  "meta": { "count": 1, "limit": 50, "offset": 0, "hasMore": false }
}
```

```json
{
  "ok": false,
  "error": {
    "code": "UNKNOWN_OPTION",
    "message": "unknown option '--acount'",
    "hint": "Run: lucas transactions create --help",
    "details": { "validOptions": ["--account", "--amount", "..."] }
  }
}
```

- Lists: `data` is always an array. `meta.count` is always present; paginated
  lists add `limit`, `offset` and an exact `hasMore`, or `truncated` with
  `--all`. Never loop on your own: use `--all` (capped by `--max`) or follow
  `hasMore`.
- Money-moving writes return the created or updated object plus the balances
  after the write (`account` or `accounts`), so there is no need to re-read
  balances.
- `error.code` is stable: `UNKNOWN_OPTION` (with `validOptions`),
  `UNKNOWN_COMMAND` (with `commands`), `MISSING_OPTION`, `INVALID_VALUE`,
  `AMBIGUOUS`, `NOT_FOUND`, `CONFIRMATION_REQUIRED`, `UNAUTHORIZED`,
  `TOKEN_EXPIRED`, `CLI_READ_ONLY`, `RATE_LIMITED`, `TIMEOUT`, or the backend
  code. `UNKNOWN_OPTION` and `UNKNOWN_COMMAND` hints name the closest valid
  option or command (`Did you mean --from-account?`). `error.details` may carry `requestId` and `retryAfterSeconds`.

### Exit codes

| Code | Meaning                                                                  |
| ---- | ------------------------------------------------------------------------ |
| 0    | Success                                                                  |
| 1    | Failure (network, server, unexpected)                                    |
| 2    | Usage or validation (bad flag or value, ambiguous name, missing `--yes`) |
| 3    | Authentication (not logged in, expired, read-only token)                 |
| 4    | Not found                                                                |
| 5    | Rate limited (see `retryAfterSeconds`)                                   |

### Name resolution

`--account`, `--from-account`, `--to-account`, `--category` and positional
`<account>`, `<loan>` and `<subscription>` arguments take a name or an id. Matching ignores accents and case
(`"itk dolares"` finds `ITK Dólares`), also accepts `"<bank> <name>"`, and
falls back to a unique partial match. Several matches fail with `AMBIGUOUS`
and list `details.candidates`; no match fails with `NOT_FOUND` and lists the
available names. When a default and a custom category share a name, writes use
the one your movements used most recently and filters include every copy.
The old `--account-id`, `--category-id`, `--from-account-id` and
`--to-account-id` flags still work.

### Dates

`--date`, `--from`, `--to` accept `today`/`hoy`, `yesterday`/`ayer`,
`YYYY-MM-DD` (stored at 12:00 local), `YYYY-MM-DDTHH:mm` (local time) or ISO
8601 with an offset. Relative words resolve in `LUCAS_TZ` or this machine's
timezone. Transaction and transfer views add `localDate` (`YYYY-MM-DD HH:mm`)
next to the UTC `date`.

### Safety flags

- `--dry-run` on money-moving writes resolves names, validates, prints
  `{dryRun: true, request: {method, path, body}, ...}` and writes nothing.
- Permanent deletes (`accounts delete`, `loans delete`, `subscriptions delete`,
  `subscription-groups delete`, `trash permanent-delete-*`, `trash empty-*`)
  need `--yes`; without it they fail with `CONFIRMATION_REQUIRED`. Deleting a
  transaction or transfer moves it to the trash and needs no confirmation
  (`--yes` is accepted and ignored).
- `loans pay --verified` and `loans mark-paid --verified` re-read the loan
  after the payment is accepted. An accepted payment always exits `0`, so never
  retry on the verification alone; read `data.verification.verified`: `true`
  (checked), `false` (server state looks wrong, `reason` explains), `null` (the
  re-read did not answer; the payment is still persisted).

### Examples

```bash
lucas overview
lucas transactions list --account "ITK Soles" --from 2026-09-01 --to today --all
lucas transactions create --account "iO Soles" --type EXPENSE --amount 42.90 \
  --description iCloud --category Subscriptions --date today
lucas transfers create --from-account "ITK Soles" --to-account "ITK Dólares" \
  --amount 370 --to-amount 100 --fee 2.50 --dry-run
echo '[{"account":"ITK Soles","type":"EXPENSE","amount":12.5,"description":"Taxi"}]' \
  | lucas transactions create-many --file -
```

### Environment

- Requests time out after 30s (120s for `ai` commands) with a `TIMEOUT` error.
- A read-only token fails write commands with `CLI_READ_ONLY`; re-link with
  full access from the app to enable writes.
- `LUCAS_TZ` sets the timezone for relative dates and `localDate`.
- `LUCAS_API_URL` overrides the API base URL (advanced/local development
  only); credentials live in `~/.config/lucas/credentials.json`.
- API URLs must use `https://`; plain `http://` is accepted only for
  `localhost`, `127.0.0.1` and `::1`, or with `LUCAS_ALLOW_INSECURE_API=1`.
- `LUCAS_DISABLE_UPDATE_NOTIFIER=1` suppresses the update banner (it is
  already suppressed when stdout/stderr are not TTYs or `CI=true`).

## Security Notes

- Do not pass arbitrary local files to agent-driven commands.
- `parse-expenses-image` accepts only real JPG, PNG, or WebP files and rejects
  symlinks, suspicious credential paths, unsupported extensions, and oversized
  images. HEIC is rejected locally, before the AI quota is charged.
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
