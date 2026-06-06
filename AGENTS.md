# LucasApp CLI Agent Guide

This is a public CLI repository. Keep code, docs, tests, and release metadata
safe to publish.

## Rules

- Communicate implementation details in English inside code and docs.
- Keep CLI output JSON-compatible unless a command is intentionally
  interactive.
- Do not expose backend internals, secrets, database URLs, npm tokens, service
  account files, or private deployment details.
- Do not add long-lived npm token publishing. Use Trusted Publishing/OIDC and
  provenance.
- Keep `LUCAS_API_URL` as an advanced development override, not normal user
  setup.
- Default production API is `https://api.lucasapp.app`; browser approval lives
  on `https://dashboard.lucasapp.app/cli`.
- Keep `investments` commands as thin API clients; backend owns quotes,
  catalog search, Premium gating, cash validation, and archive semantics.
- Keep subscription calendar and group commands as thin API clients; backend
  owns Premium gating, billing dates, group ownership, and reorder semantics.
- Keep subscription charge commands as thin API clients; backend owns charge
  generation, transaction side effects, confirmation, and SSE semantics.
- Keep plan copy synced to backend limits; CLI does not implement billing.
- Match public list commands to the backend response shape, including
  pagination wrappers such as `{ items, summary, pagination }`.
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
