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
lucas auth status
lucas auth logout
```

`login` opens LucasApp in your browser and asks you to approve a short visible
code. Credentials are stored locally in `~/.config/lucas/credentials.json` with
owner-only permissions. `logout` clears the local credentials and attempts to
revoke the CLI device token server-side.

## Common Commands

```bash
lucas accounts list --include-archived
lucas accounts create --name "Savings" --type SAVINGS --bank BCP --currency PEN
lucas accounts debt-detail <account-id> --mode current_cycle

lucas transactions list --from 2026-05-01 --to 2026-05-31 --search rappi --limit 10
lucas transactions create --account-id <id> --amount 35 --type EXPENSE --description "Lunch"

lucas transfers list --limit 10 --offset 0
lucas transfers create --from-account-id <id> --to-account-id <id> --amount 500

lucas subscriptions list --type SERVICE --limit 20
lucas subscriptions calendar --month 2026-05 --type SUBSCRIPTION --frequency MONTHLY
lucas subscriptions mark-paid <id>
lucas subscription-groups list
lucas subscription-charges pending --limit 10
lucas subscription-charges pay <charge-id>

lucas investments instruments --rank popular --limit 20
lucas investments refresh --action eod
lucas investments trade <account-id> --instrument-id <id> --side BUY --quantity 1 --price 100
lucas investments history <account-id> --range 90d

lucas loans list
lucas loans pay <id> --amount 750 --verified
lucas loans mark-paid <id> --verified

lucas stats summary
lucas stats by-category --year 2026 --month 5
lucas exchange-rate convert --from USD --to PEN --amount 25

lucas ai usage
lucas ai parse-expenses "lunch at Pardos S/ 35" --date 2026-05-08 --account-id <id>
lucas ai parse-expenses-image receipt.jpg --date 2026-05-08 --account-id <id>
```

Command groups: `auth`, `accounts`, `transactions`, `transfers`,
`investments`, `subscriptions`, `subscription-groups`,
`subscription-charges`, `loans`, `stats`, `categories`, `exchange-rate`, and
`ai`.
The `ai` group is intentionally limited to usage and text/image expense
parsing.

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
  account-scoped charges, and pay/confirm/manual-paid actions.
- `investments` mirrors the Premium backend contract for instrument discovery,
  portfolio overview, positions, activity, history, trades, cash adjustments,
  backend refresh jobs, and archived investment recovery.
- `accounts list --include-archived` includes archived accounts in the account
  array and adds `archivedAccounts` metadata. Balance/debt totals remain the
  active-account totals returned by LucasApp.
- `exchange-rate convert --amount <n>` includes a client-side
  `convertedAmount` derived from the backend rate.

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
