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

## Publishing

The release workflow must run the same gates as CI and publish with:

```bash
npm publish --provenance
```

Do not reintroduce `NODE_AUTH_TOKEN` or `NPM_TOKEN`.
