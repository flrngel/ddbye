# Compound Summary — Track D: Quality & CI

## What was learned

### From implementation
- Existing codebase uses semicolons despite the TODO suggesting "no semicolons" — always inspect actual source before configuring formatters
- ESLint flat config (v9) requires manual plugin wiring — no more `extends` shorthand
- Playwright's `reuseExistingServer: true` silently connects to wrong servers on occupied ports — use env var for port override

### From verification
- ESLint and Prettier fail on existing src/ code — this is expected and documented
- 36 unit tests and 2 E2E tests all pass consistently
- E2E tests need ~7s due to mock agent timer simulation

### From review
- CI steps that are expected to fail MUST use `continue-on-error: true` — comments alone don't prevent job failure
- Playwright clipboard needs explicit `clipboard-read`/`clipboard-write` permissions in headless Chrome
- `__dirname` works in Vitest config (injected) but isn't idiomatic ESM

## What should be reused next time

- `E2E_PORT` env var pattern for Playwright configs to avoid port conflicts
- The checker agent consistently catches spec compliance issues the implementer misses — always spawn it
- Document src/ violations in a lint-report.md when linter setup can't fix them

## What to avoid

- Don't assume code style from TODO descriptions — inspect the actual codebase
- Don't use `getByText()` for common phrases in Playwright — use `getByRole('heading', ...)` or `.first()` for strict mode
- Don't skip `continue-on-error` on CI steps that are known to fail
