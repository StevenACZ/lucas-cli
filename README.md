# LucasApp CLI

Manage your LucasApp finances from the terminal. Designed for AI agents.

All output is structured JSON, making it ideal for programmatic consumption by AI assistants, scripts, and automation pipelines.

## Installation

```bash
npm install -g lucasapp-cli
```

Or run directly with Bun:

```bash
git clone <repo-url>
cd lucas-cli
bun install
bun run build
npm link
```

## Quick Start

```bash
# Authenticate (opens browser for approval)
lucas auth login

# List your accounts
lucas accounts list

# Check this month's transactions
lucas transactions list --from 2026-03-01

# Get a financial summary
lucas stats summary
lucas stats summary --year 2026 --month 3
```

## Commands

| Group           | Description                       |
| --------------- | --------------------------------- |
| `auth`          | Authentication management         |
| `accounts`      | Manage financial accounts         |
| `transactions`  | Manage income and expenses        |
| `transfers`     | Manage transfers between accounts |
| `subscriptions` | Manage recurring subscriptions    |
| `loans`         | Manage loans and payments         |
| `stats`         | Financial statistics and reports  |
| `categories`    | View transaction categories       |
| `exchange-rate` | Currency conversion               |

### Authentication

```bash
lucas auth login                    # Authenticate via browser (device authorization flow)
lucas auth login --device-name "My Laptop"  # Custom device name
lucas auth logout                   # Clear stored credentials
lucas auth status                   # Show current auth status
```

### Accounts

```bash
lucas accounts list                 # List all accounts
lucas accounts list --include-archived  # Include archived accounts
lucas accounts create \
  --name "Savings" \
  --type SAVINGS \
  --bank "BCP" \
  --currency PEN \
  --balance 1000                    # Create an account
lucas accounts update <id> \
  --name "New Name" \
  --balance 5000 \
  --credit-limit 10000 \
  --is-archived true                # Update account
lucas accounts delete <id>          # Delete account
```

Account types: `DEBIT`, `CREDIT`, `CASH`, `SAVINGS`, `INVESTMENT`, `WALLET`

### Transactions

```bash
lucas transactions list             # List all transactions
lucas transactions list \
  --from 2026-03-01 \
  --to 2026-03-31 \
  --type EXPENSE \
  --account-id <id> \
  --category-id <id> \
  --skip 0 --take 50               # Filtered list with pagination

lucas transactions create \
  --account-id <id> \
  --amount 45.50 \
  --type EXPENSE \
  --description "Grocery shopping" \
  --category-id <id> \
  --date 2026-03-15 \
  --merchant "Plaza Vea"           # Create a transaction

lucas transactions update <id> \
  --amount 50 \
  --description "Updated description"  # Update transaction

lucas transactions delete <id>      # Delete transaction
```

Transaction types: `INCOME`, `EXPENSE`

### Transfers

```bash
lucas transfers list                # List all transfers
lucas transfers create \
  --from-account-id <id> \
  --to-account-id <id> \
  --amount 500 \
  --description "Monthly savings" \
  --exchange-rate 3.72             # Create a transfer

lucas transfers update <id> \
  --amount 1500 \
  --exchange-rate 3.75              # Update a transfer
lucas transfers update <id> \
  --amount 1000 \
  --clear-notes                     # Update with unset
lucas transfers delete <id>         # Delete transfer
```

### Subscriptions

```bash
lucas subscriptions list            # List all subscriptions
lucas subscriptions create \
  --name "Netflix" \
  --amount 44.90 \
  --account-id <id> \
  --currency PEN \
  --frequency MONTHLY \
  --billing-day 1 \
  --next-billing-date 2026-04-01   # Create a subscription

lucas subscriptions update <id> \
  --amount 49.90 \
  --frequency YEARLY \
  --billing-day 30 \
  --clear-account-id               # Update subscription (unset account)

lucas subscriptions mark-paid <id>  # Mark as paid
lucas subscriptions delete <id>     # Delete subscription
```

`subscriptions list` also returns AI-friendly derived fields such as
`computedStatus`, `latestChargeStatus`, `lastChargeDate`, and
`lastBillingExplanation`.

Frequencies: `WEEKLY`, `MONTHLY`, `YEARLY`

### Loans

```bash
lucas loans list                    # List all loans
lucas loans create \
  --name "Car Loan" \
  --principal 25000 \
  --account-id <id> \
  --currency PEN \
  --interest-rate 12.5 \
  --installments 36 \
  --first-due-date 2026-02-15 \
  --interval-unit MONTH \
  --interval-count 1 \
  --start-date 2026-01-15          # Create a loan

lucas loans update <id> \
  --name "Auto Loan" \
  --principal 3200 \
  --interest-rate 5.5              # Update a loan
lucas loans update <id> \
  --clear-agreed-installments \
  --clear-target-payment           # Update with unset

lucas loans pay <id> --amount 750 --verified   # Make a payment
lucas loans mark-paid <id> --verified          # Pay next pending installment
lucas loans delete <id>             # Delete loan
```

### Statistics

```bash
lucas stats summary                 # Financial summary
lucas stats summary --year 2026 --month 3  # Inspect a specific month
lucas stats monthly                 # Monthly statistics
lucas stats by-category --year 2026 --month 3  # Spending by category
```

When a newer CLI version is available, interactive terminals will show a short
update notice with the recommended command:

```bash
npm install -g lucasapp-cli@latest
```

### Categories

```bash
lucas categories list               # List all categories
```

### Exchange Rate

```bash
lucas exchange-rate convert \
  --from USD \
  --to PEN \
  --amount 100                      # Convert currencies
```

### Unsetting Optional Fields

Use `--clear-<field>` to clear an optional field:

```bash
lucas subscriptions update <id> --clear-account-id        # Remove linked account
lucas transactions update <id> --clear-category-id        # Clear category
lucas accounts update <id> --clear-credit-limit           # Remove credit limit
lucas transfers update <id> --clear-notes                 # Clear notes
lucas loans update <id> --clear-agreed-installments       # Remove agreed installments
```

## AI Integration

LucasApp CLI outputs structured JSON exclusively, making it a natural fit for AI agents with terminal access.

Tell your AI assistant:

> "Use lucasapp-cli to check my expenses this week"

> "Use lucas to create a transaction: I spent 35 soles on lunch at Pardos today"

> "Use lucas to show me my financial summary and subscriptions"

Works with any AI that has shell access: Claude Code, Gemini CLI, Cursor, or custom agents.

### Output Format

All commands return JSON in this structure:

```json
{
  "ok": true,
  "data": { ... }
}
```

Errors return:

```json
{
  "ok": false,
  "error": { "message": "...", "statusCode": 401 }
}
```

## Authentication Flow

LucasApp CLI uses a device authorization flow (similar to how you sign in to a smart TV):

1. Run `lucas auth login`
2. A device code is displayed and your browser opens automatically
3. Sign in to LucasApp in the browser and enter the device code
4. The CLI polls the server and stores the token locally once approved

No password is ever entered in the terminal.

## Security

- Credentials are stored at `~/.config/lucas/credentials.json` with `chmod 600` (owner read/write only)
- Tokens are hashed server-side (SHA-256) -- the raw token is never stored on the server
- Revoke access anytime from LucasApp Settings > Devices
- Tokens expire after 90 days

## Environment Variables

| Variable        | Description           | Default                       |
| --------------- | --------------------- | ----------------------------- |
| `LUCAS_API_URL` | Override API base URL | `https://lucas.stevenacz.com` |

## Development

```bash
git clone <repo-url>
cd lucas-cli
bun install

# Run in development
bun run dev -- accounts list

# Build
bun run build

# Verify
bun run format
bun run typecheck
bun run lint
bun run test
```

## License

MIT
