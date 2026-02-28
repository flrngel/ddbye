# Review Summary — Track D: Quality & CI

## Reviewers

- Security reviewer: completed, no P0s
- Architecture reviewer: completed, **1 P0**

## P0 Blockers (must fix)

### CI pipeline ESLint/Prettier steps block downstream gates

The `npm run lint:eslint` and `npm run format:check` steps in `.github/workflows/ci.yml` exit with code 1 due to pre-existing src/ violations. Without `continue-on-error: true`, the GitHub Actions job halts before reaching unit tests, build, or E2E tests — making those quality gates unreachable.

**Fix:** Add `continue-on-error: true` to the ESLint and format:check steps.

## P1 Findings (noted, not blocking)

1. **Security:** `webServer` binds to `0.0.0.0` — should use `127.0.0.1` for local-only
2. **Security:** ESLint/Prettier CI steps lack `continue-on-error` (same as P0 above)
3. **Architecture:** `vitest.config.ts` uses `__dirname` in ESM — works because Vitest injects it, but not idiomatic
4. **Architecture:** `playwright.config.ts` uses `npx vite` instead of `npm run dev`
5. **Architecture:** `mockAgent.test.ts` doesn't test reference equality for all-done case

## P2 Findings (deferred)

- ESLint config uses legacy compat shape instead of v8 flat-config preset
- No coverage script
- `printWidth: 140` undocumented
- Playwright browser cache not configured in CI
- Missing `'hn'` routing test and boundary tests for time
