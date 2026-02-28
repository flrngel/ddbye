# Testing Knowledge

Testing strategies and lessons learned.

## Vitest setup (Track D)

- Config: `vitest.config.ts` with independent `@/` alias (don't rely on vite.config.ts inheritance)
- Environment: `node` for pure-function tests (no DOM needed)
- Test location: `tests/unit/` with `.test.ts` suffix
- 36 tests across time, utils, mockAgent modules

## Playwright setup (Track D)

- Config: `playwright.config.ts` with Chromium-only project
- Clipboard: needs explicit `clipboard-read`/`clipboard-write` permissions
- Mock agent simulation: 5s ceiling — use 10s+ timeouts for `waitFor`
- Strict mode: avoid `getByText()` for common phrases; use `getByRole()` or `.first()`
