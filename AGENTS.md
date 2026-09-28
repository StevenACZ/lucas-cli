# LucasApp CLI Agent Guide

This is a public CLI repository. Keep code, docs, tests, and release metadata
safe to publish.

## Rules

- Communicate implementation details in English inside code and docs.
- Print exactly one JSON document on stdout per invocation through
  `output.success(data, meta?)` or a thrown `CliError`; never `console.*` or a
  plain `throw new Error` for validation (`invalidValue`, exit codes in
  `src/lib/errors.ts`).
- Do not expose backend internals, secrets, database URLs, npm tokens, service
  account files, or private deployment details.
- Do not add long-lived npm token publishing. Use Trusted Publishing/OIDC and
  provenance.
- Keep `LUCAS_API_URL` as an advanced development override, not normal user
  setup.
- Default production API is `https://api.lucasapp.app`; device-auth approval
  happens in the LucasApp iOS app (Settings → Security → CLI Access), with a
  user-chosen per-device scope (`READ_ONLY` or `FULL`). There is no browser or
  dashboard approval step.
- Keep `investments` commands as thin API clients; backend owns quotes,
  catalog search, Premium gating, cash validation, and archive semantics.
- Keep subscription calendar and group commands as thin API clients; backend
  owns Premium gating, billing dates, group ownership, and reorder semantics.
- Keep subscription charge commands as thin API clients; backend owns charge
  generation, transaction side effects, confirmation, and SSE semantics.
- Plan limits and prices are backend-owned: pass backend error messages
  through and never hardcode plan numbers or prices; CLI does not implement
  billing.
- List commands print `data` as an array; pagination and backend summaries go
  in `meta` (`count` always; `limit/offset/hasMore` or `truncated`). Use
  `fetchPage`/`fetchAll` when the endpoint takes limit/offset.
- Accept account and category names wherever an id is taken
  (`src/lib/resolve.ts`); keep every old `--*-id` flag as a hidden alias.
- Money-moving creates offer `--dry-run`; writes return the compact view plus
  balances from `accountsAfterWrite`. Permanent deletes require `--yes`.
- Pass every raw backend object through `stripHeavy` before printing.
- Build API paths with `resourcePath()` when an ID appears in the URL path.
- Store local credentials under `~/.config/lucas` with private permissions.
- Reject non-image and sensitive local paths before reading image inputs.
- Keep repo docs public-safe; `docs/` is ignored for local smoke notes unless a
  file is intentionally versioned.

## Investment Operations

- Keep investment commands deterministic and explicit. Do not add natural
  language parsing or free-form execution.
- Daily writes should prefer backend IDs when a ticker is ambiguous:
  `investments search <symbol>` → choose an exact candidate →
  `buy|sell --instrument-id <id>` or `cash dividend --instrument-id <id>`.
- Symbol writes are still allowed, but backend resolution is authoritative. If
  a symbol has zero or multiple exact matches, surface the backend candidates in
  JSON and stop instead of guessing.
- `investments import` is optional migration tooling, not required for daily
  usage. It defaults to dry-run unless `--apply` is passed.
- For imports from Hapi-style JSON, use repeated
  `--instrument-map SYMBOL=instrumentId` entries when the backend reports
  ambiguous symbols. The importer may use closed tax lots from the same JSON to
  reconcile sell quantities before writing.
- Never put secrets, raw auth tokens, production credentials, or private local
  financial file contents in committed docs or test fixtures.

## Verification

Run the relevant checks before reporting completion:

```bash
bun run format:check
bun run typecheck
bun run lint
bun run test
bun run build
npm pack --dry-run --json --ignore-scripts
```

Before publishing, run read-only smoke tests against the production API using
the installed CLI or the built `dist/index.js`. Do not create, update, pay, or
delete real financial records as a smoke test unless explicitly requested.

## Publishing

The release workflow must run the same gates as CI and publish with:

```bash
npm publish --provenance
```

Do not reintroduce `NODE_AUTH_TOKEN` or `NPM_TOKEN`.
