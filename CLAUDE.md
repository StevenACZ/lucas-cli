# LucasApp CLI

Financial data management CLI for AI agents. All output is JSON.

## Project Structure

```
src/
  index.ts                        - Entry point, Commander setup, command registration
  lib/
    config.ts                     - Credential storage (~/.config/lucas/)
    api-client.ts                 - HTTP client with Bearer auth
    output.ts                     - JSON output helpers (success/error)
    body-builder.ts               - Request body builder with --clear-* null support
    loan-domain.ts                - Loan installment helpers for AI-safe flows
    loan-verification.ts          - Post-payment verification helpers
    number-parser.ts              - Strict numeric parsing for commands
    subscription-enrichment.ts    - Derived subscription fields for AI output
  commands/
    auth/
      login.ts                    - Device authorization flow
      logout.ts                   - Clear stored credentials
      status.ts                   - Show auth status
    accounts/
      list.ts                     - List accounts (--include-archived)
      create.ts                   - Create account (name, type, bank, currency)
      update.ts                   - Update account by ID
      delete.ts                   - Delete account by ID
    transactions/
      list.ts                     - List with filters (date, category, account, type, pagination)
      create.ts                   - Create transaction (account, amount, type, description)
      update.ts                   - Update transaction by ID
      delete.ts                   - Delete transaction by ID
    transfers/
      list.ts                     - List all transfers
      create.ts                   - Create transfer (from, to, amount, exchange-rate)
      update.ts                   - Update transfer by ID
      delete.ts                   - Delete transfer by ID
    subscriptions/
      list.ts                     - List all subscriptions
      create.ts                   - Create subscription (name, amount, frequency)
      update.ts                   - Update subscription by ID
      delete.ts                   - Delete subscription by ID
      mark-paid.ts                - Mark subscription as paid
    loans/
      list.ts                     - List all loans
      create.ts                   - Create loan (name, principal, account)
      update.ts                   - Update loan by ID
      pay.ts                      - Make a loan payment
      mark-paid.ts                - Pay the next pending installment
      unmark-paid.ts              - Reverse a loan payment (default: most recent)
      delete.ts                   - Delete loan by ID
    stats/
      summary.ts                  - Financial summary
      monthly.ts                  - Monthly statistics
      by-category.ts              - Statistics by category
    categories/
      list.ts                     - List all categories
    exchange-rate/
      convert.ts                  - Currency conversion
```

## Tech Stack

- Runtime: Bun
- Language: TypeScript (strict)
- CLI Framework: Commander
- Output: JSON only (for AI consumption)
- Build: `bun build` targeting Node

## Command Pattern

Every command follows the same pattern:

1. Parse options/arguments via Commander
2. Build query params or request body
3. Call `apiRequest(method, path, body?, params?)`
4. Output via `output.success(data)`

Files are kept under 100 lines (LEGO philosophy).

## Adding a New Command

1. Create file at `src/commands/<group>/<action>.ts`
2. Export a `Command` instance from Commander
3. Import and register in `src/index.ts` under the appropriate group
4. Use `apiRequest()` from `src/lib/api-client.ts` for API calls
5. Use `output.success()` for responses, `output.error()` for errors

Template:

```typescript
import { Command } from "commander";
import { apiRequest } from "../../lib/api-client.js";
import { output } from "../../lib/output.js";

export const myCommand = new Command("my-action")
  .description("What it does")
  .requiredOption("--name <name>", "Required param")
  .option("--optional <value>", "Optional param")
  .action(async (opts) => {
    const body: Record<string, unknown> = { name: opts.name };
    if (opts.optional) body.optional = opts.optional;
    const data = await apiRequest("POST", "/api/endpoint", body);
    output.success(data);
  });
```

## API Client

- Base URL: `https://lucas.stevenacz.com` (override with `LUCAS_API_URL` env var)
- Auth: Bearer token from `~/.config/lucas/credentials.json`
- All requests and responses are JSON
- Auth check happens automatically in `apiRequest()` -- exits with error if not authenticated or token expired

## Credentials

- Location: `~/.config/lucas/credentials.json`
- Permissions: `0o600` (owner read/write only)
- Fields: `token`, `apiUrl`, `deviceName`, `expiresAt`
- Auth flow: Device authorization (POST to `/api/cli/device-auth`, poll `/api/cli/poll/:code`)

## Output Format

Success:

```json
{ "ok": true, "data": { ... } }
```

Error (exits with code 1):

```json
{ "ok": false, "error": { "message": "...", "statusCode": 401 } }
```

Login flow writes human-readable output to stderr (not JSON) since it is interactive.

## Backend API Endpoints

| Method | Endpoint                         | Command                 |
| ------ | -------------------------------- | ----------------------- |
| POST   | /api/cli/device-auth             | auth login              |
| GET    | /api/cli/poll/:code              | auth login (polling)    |
| GET    | /api/accounts                    | accounts list           |
| POST   | /api/accounts                    | accounts create         |
| PUT    | /api/accounts/:id                | accounts update         |
| DELETE | /api/accounts/:id                | accounts delete         |
| GET    | /api/transactions                | transactions list       |
| POST   | /api/transactions                | transactions create     |
| PUT    | /api/transactions/:id            | transactions update     |
| DELETE | /api/transactions/:id            | transactions delete     |
| GET    | /api/transfers                   | transfers list          |
| POST   | /api/transfers                   | transfers create        |
| PUT    | /api/transfers/:id               | transfers update        |
| DELETE | /api/transfers/:id               | transfers delete        |
| GET    | /api/subscriptions               | subscriptions list      |
| POST   | /api/subscriptions               | subscriptions create    |
| PUT    | /api/subscriptions/:id           | subscriptions update    |
| DELETE | /api/subscriptions/:id           | subscriptions delete    |
| POST   | /api/subscriptions/:id/mark-paid | subscriptions mark-paid |
| GET    | /api/loans                       | loans list              |
| POST   | /api/loans                       | loans create            |
| POST   | /api/loans/:id/pay               | loans pay               |
| POST   | /api/loans/:id/reverse-payment   | loans unmark-paid       |
| PUT    | /api/loans/:id                   | loans update            |
| DELETE | /api/loans/:id                   | loans delete            |
| GET    | /api/stats/summary               | stats summary           |
| GET    | /api/stats/monthly               | stats monthly           |
| GET    | /api/stats/by-category           | stats by-category       |
| GET    | /api/categories                  | categories list         |
| GET    | /api/exchange-rate/convert       | exchange-rate convert   |

## Verification

```bash
bun run format       # Prettier
bun run typecheck    # tsc --noEmit
bun run lint         # ESLint
bun run test         # Vitest
bun run build        # bun build (for large changes)
```

## Conventional Commits

```
feat(scope): description
fix(scope): description
refactor(scope): description
chore(scope): description
```

Scopes: `auth`, `accounts`, `transactions`, `transfers`, `subscriptions`, `loans`, `stats`, `categories`, `exchange-rate`, `cli`, `lib`
