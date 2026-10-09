# Changelog

## 0.2.0 — 2026-10-09

### Added
- 31 unit tests for the `/backend` proxy and the API client (`pnpm test`).
- Seven end-to-end checks, five of which run without deployed services; three
  of them cover the proxy. CI now actually runs them: the Playwright suite had
  never been executed in CI.
- CI jobs `lint`, `unit`, and `e2e` beside the existing `build-and-typecheck`. Lint and format are now enforced.
- Prettier, with `format` and `format:check`.

### Fixed
- `pnpm lint` failed with four `react/no-unescaped-entities` errors in the
  landing page. CI did not run lint, so they went unnoticed.
- **Proxy hardening.** The API proxy was a single 1,200 character line with no
  tests. It now rejects `.` and `..` path segments, returns a 404 for any
  non-`/v1` path whether or not an upstream is configured, forwards every
  `Set-Cookie` header (reading `get('set-cookie')` merges several cookies into
  one broken value), and marks even its own error responses `no-store`.
- The security contact address in the README and SECURITY.md was misspelled
  (`gmaill.com`), so vulnerability reports could not be delivered.

### Changed
- Reformatted all source. Components and the API client were written as very
  long lines, which made review impractical. No behavior change.
- `pnpm test` now runs the unit tests; the Playwright suite moved to
  `pnpm test:e2e`.
- Proxy logic moved from the route file into `src/lib/proxy.ts`.
