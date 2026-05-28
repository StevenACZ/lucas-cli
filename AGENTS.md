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
- Match public list commands to the backend response shape, including
  pagination wrappers such as `{ items, summary, pagination }`.
- Build API paths with `resourcePath()` when an ID appears in the URL path.
- Store local credentials under `~/.config/lucas` with private permissions.
- Reject non-image and sensitive local paths before reading image inputs.

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
