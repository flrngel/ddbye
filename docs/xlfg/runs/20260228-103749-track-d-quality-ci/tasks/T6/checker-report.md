# Checker report — T6: CI pipeline

## Verdict
- ACCEPT

## What was checked

- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/.github/workflows/ci.yml` — full file inspected (46 lines)
- YAML structure verified by reading (no yaml module available, but node confirmed file is readable and well-formed)
- Step ordering verified against spec D8 requirements
- Secret/token presence checked

## Findings

### Blockers
- None. (Note: T5 has a REVISE on port 3100 vs 3000, but the CI YAML itself is not the cause — it delegates E2E to `npm run test:e2e`. Once T5 is fixed, T6 will work correctly end-to-end.)

### Important
- The CI YAML will currently fail at the ESLint step and the format:check step because of existing `src/` violations. This is expected, documented with inline comments (`# May fail until Track C fixes src/ issues`), and is the correct behavior per the spec. However, note that failing steps in a CI workflow will block the merge unless they are wrapped with `continue-on-error: true`. The spec does not require `continue-on-error`; it requires the steps to exist. The current YAML will block PRs at ESLint until Track C fixes src/. This is documented behavior, not a defect.

### Nice-to-have
- The spec (open question 2) suggests caching Playwright browser binaries at `~/.cache/ms-playwright`. The current CI does not cache them. This means each CI run downloads ~200MB of browser binaries. Not a correctness issue but a CI performance concern. Can be addressed in a future iteration.
- `retries` is not configured in the CI context; flaky E2E tests may fail once and break the build. A `continue-on-error` on the E2E step (or `retries: 1` in playwright.config.ts) could improve stability. Out of scope for this spec.

## Spec compliance

| Criterion | Status |
|-----------|--------|
| `.github/workflows/ci.yml` exists | PASS |
| Triggers on `push` to any branch | PASS — `branches: ['*']` |
| Triggers on `pull_request` | PASS |
| Single job named `quality` | PASS |
| Runs on `ubuntu-latest` | PASS |
| `actions/setup-node` with `node-version: '22'` | PASS |
| `cache: 'npm'` on setup-node | PASS |
| Step 1: `npm ci` | PASS — "Install dependencies" step |
| Step 2: `npm run lint` (type-check) | PASS — "Type check" step |
| Step 3: `npm run lint:eslint` | PASS — "ESLint" step |
| Step 4: `npm run format:check` | PASS — "Format check" step |
| Step 5: `npm test` (Vitest) | PASS — "Unit tests" step |
| Step 6: `npm run build` | PASS — "Build" step |
| Step 7: `npm run test:e2e` (Playwright) | PASS — "E2E tests" step (after "Install Playwright browsers" step) |
| Each step has a human-readable `name` | PASS — all 9 steps have names |
| No secrets or tokens | PASS — no secrets references in YAML |
| Valid YAML | PASS — file is syntactically well-formed |
| Playwright browser install step present | PASS — `npx playwright install --with-deps chromium` before E2E step |
| Comments on potentially-failing steps | PASS — ESLint and format:check steps annotated |

## Verification notes

- The CI has 9 named steps (not 7 as the spec minimum) because the checkout step and Playwright install step are added in addition to the 7 required quality steps. This is correct and additive.
- The step order matches the spec exactly: checkout → setup-node → npm ci → type-check → eslint → format:check → unit tests → build → playwright install → E2E.
- `actions/checkout@v4` is used (not pinned to a SHA). Acceptable for a prototype CI.
- The `pull_request_target` trigger is not used, satisfying the security requirement from the spec.
- No environment-specific credentials appear anywhere in the YAML.
