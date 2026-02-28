# T6: CI pipeline — Implementer Report

## What was done

- Created `.github/workflows/ci.yml` with single `quality` job on ubuntu-latest
- Node 22 with npm cache
- 9 steps in order: checkout, setup-node, npm ci, type check, ESLint, format check, unit tests, build, Playwright install + E2E tests
- Added comments on ESLint and format check steps noting they may fail until Track C fixes src/
- No secrets or tokens used

## Files changed

- `.github/workflows/ci.yml` — new

## Notes

- The ESLint and format:check steps will currently fail in CI due to existing src/ violations. These are annotated with comments.
