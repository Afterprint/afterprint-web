# Contributing to afterprint-web

## Setup

```bash
pnpm install
cp .env.example .env.local   # needs a running afterprint-api instance
pnpm dev
```

## Workflow

1. Pick an issue from the [tracker](https://github.com/Afterprint/afterprint-web/issues).
2. Branch from `main`: `git checkout -b feat/short-description`.
3. One logical change per commit, [Conventional Commits](https://www.conventionalcommits.org/) format: `type(scope): description`.
4. `pnpm typecheck` and `pnpm build` must pass before opening a PR.
5. Open a PR against `main`. CI must pass.

## Code standards

- Auth goes through `@stellar/freighter-api`'s documented functions (`isConnected`, `requestAccess`, `signMessage`) — don't reach for `window.freighterApi` directly, it races the extension's injection and produces false "not installed" errors.
- All API calls go through `src/lib/api.ts` so origin, credentials, and error handling stay consistent — don't call `fetch` directly against the API elsewhere.
- No client-side trust of AI claims without their citations rendered alongside them — this is a legal-evidence product, unsourced claims are a product bug, not a style nit.

## Reporting a security issue

See [SECURITY.md](./SECURITY.md) — do not open a public issue for a vulnerability.
