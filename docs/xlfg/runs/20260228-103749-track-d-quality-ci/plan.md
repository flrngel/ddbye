# Plan — Track D: Quality & CI

## Summary

Set up ESLint, Prettier, Vitest, and Playwright in a React 19 + Vite 7 project. Write unit tests for 3 pure-function modules and E2E tests for 2 user flows. Create a CI pipeline. No production code changes.

**Correction from spec:** The existing codebase uses semicolons (confirmed by inspecting all src/ files). Prettier config must use `semi: true`, not `semi: false` as the spec incorrectly states.

## Tasks

- [x] **T1: Install devDependencies and add scripts** — Checker: ACCEPT
- [x] **T2: ESLint flat config** — Checker: ACCEPT
- [x] **T3: Prettier config** — Checker: ACCEPT
- [x] **T4: Vitest config + unit tests** — Checker: ACCEPT (36 tests pass)
- [x] **T5: Playwright config + E2E tests** — Checker: ACCEPT (revised once for port/navigationTimeout)
- [x] **T6: CI pipeline** — Checker: ACCEPT

## Definition of done

1. `npm run lint:eslint` runs without config errors (violations documented if any)
2. `npm run format:check` runs without config errors (violations documented if any)
3. `npm test` passes all unit tests (18+ tests)
4. `npm run test:e2e` passes all E2E tests
5. `.github/workflows/ci.yml` is valid YAML with 7 ordered steps
6. No files under `src/` modified

## Verification commands

```bash
npm run lint          # tsc --noEmit
npm run lint:eslint   # ESLint
npm run format:check  # Prettier
npm test              # Vitest unit tests
npm run test:e2e      # Playwright E2E
```

## Rollback

All changes are additive (new files + devDeps). Rollback = delete config files, test dirs, .github dir, and remove devDeps/scripts from package.json.
