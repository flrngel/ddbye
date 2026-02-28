# Patterns

Reusable patterns discovered during development.

## Playwright port override (Track D)

Use `E2E_PORT` env var in `playwright.config.ts` to avoid conflicts when port 3000 is occupied locally. Default to 3000 for CI.

## Lint-report pattern (Track D)

When a linter setup can't fix existing violations (ownership constraints), document them in `tests/lint-report.md` and use `continue-on-error: true` in CI.
