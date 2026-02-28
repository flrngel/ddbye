# Spec — Track D: Quality & CI

## Problem

The Outreach OS frontend has no automated quality layer: no linter enforcement, no formatter, no unit tests, and no end-to-end tests. The only check is `tsc --noEmit`. Without a lint gate, format contract, and test suite, regressions ship silently, new contributors have no style contract to follow, and the CI pipeline is a placeholder. Track D closes this gap without touching production code in `src/`.

## Goals

1. Establish ESLint (flat config) and Prettier as the enforced style and correctness layer.
2. Stand up Vitest for fast in-process unit tests with the same path alias (`@/`) as the application.
3. Write targeted unit tests for the three pure-function modules: `src/lib/time.ts`, `src/lib/utils.ts`, and `src/logic/mockAgent.ts`.
4. Stand up Playwright against the Vite dev server and write E2E tests covering the critical user paths.
5. Publish a GitHub Actions CI workflow that gates merges on type-check, lint, format, unit tests, build, and E2E.

## Non-goals

- No changes to `src/` production code. If linters surface style violations, they are documented in `tests/lint-report.md` for Track C to fix.
- No backend, no server, no worker code.
- No visual regression testing or accessibility auditing (out of scope for this track).
- No coverage thresholds — pass/fail is the only gate.
- No integration with external services (no token, no API key, no secrets).
- No changes to `index.html`, `vite.config.ts`, or any dependency listed in `dependencies` (only `devDependencies` and `scripts` in `package.json` are in scope).

## User stories

- As a contributor, when I run `npm run lint:eslint`, I get a clear pass/fail signal about TypeScript and React Hooks rule violations.
- As a contributor, when I run `npm run format:check`, I get a clear pass/fail signal about whitespace, quote style, and semicolon style.
- As a contributor, when I run `npm test`, all unit tests for the pure-function modules run and pass with a summary showing test counts.
- As a contributor, when I run `npm run test:e2e`, Playwright starts the Vite dev server, runs the demo flow and navigation suite, and reports pass/fail.
- As a reviewer, when a PR is opened, GitHub Actions automatically runs all quality gates and blocks the merge on any failure.

## Acceptance criteria

### D1 — ESLint + Prettier

- [ ] `eslint.config.mjs` exists at the repository root and uses flat config format (ESLint >=9 API: `export default [...]`).
- [ ] The config includes `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` targeting TypeScript strict mode.
- [ ] The config includes `eslint-plugin-react-hooks` with the recommended rules enabled.
- [ ] `.prettierrc` exists at the repository root and specifies: `singleQuote: true`, `semi: false` (to match the existing codebase style — single quotes, no semicolons, confirmed by inspecting `src/lib/utils.ts` and `src/logic/mockAgent.ts`).
- [ ] `package.json` `scripts` contains exactly:
  - `"lint:eslint": "eslint src/ --max-warnings=0"`
  - `"format": "prettier --write src/"`
  - `"format:check": "prettier --check src/"`
- [ ] `package.json` `devDependencies` contains: `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-plugin-react-hooks`, `prettier`.
- [ ] `npm run lint:eslint` exits with code 0 OR (if violations exist) exits with a non-zero code and the violations are documented in `tests/lint-report.md`. The script must not crash due to a misconfigured config file.
- [ ] `npm run format:check` exits with code 0 OR (if violations exist) exits with a non-zero code and the violations are documented in `tests/lint-report.md`. The script must not crash.

**Assumption:** The existing codebase uses single quotes and no semicolons. This was verified by inspecting `src/lib/utils.ts` (uses single quotes, no semicolons) and `src/logic/mockAgent.ts` (same). If `format:check` fails on the existing source, the violations must be listed in `tests/lint-report.md` and the CI step for `format:check` must be documented as "currently failing on existing code — see lint-report.md" rather than blocking the workflow unconditionally. Track C owns fixing `src/`.

### D2 — Vitest setup

- [ ] `vitest.config.ts` exists at the repository root.
- [ ] The config resolves the `@/` path alias to `./src/` (matching `vite.config.ts`).
- [ ] The config sets `environment: 'node'` (no DOM needed for pure-function tests).
- [ ] `tests/unit/` directory exists.
- [ ] `package.json` `scripts` contains exactly:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
- [ ] `package.json` `devDependencies` contains: `vitest`.
- [ ] Running `npm test` from the repository root exits with code 0 when all unit tests pass.
- [ ] Running `npm test` prints a summary line containing the total number of tests and "passed".

### D3 — Unit tests: `time` and `utils`

All tests live in `tests/unit/time.test.ts` and `tests/unit/utils.test.ts` and are written in TypeScript importing from `@/lib/time` and `@/lib/utils` respectively.

**`tests/unit/time.test.ts`**

- [ ] `formatRelativeTime` called with an ISO string 30 seconds in the past returns `'just now'`.
- [ ] `formatRelativeTime` called with an ISO string 5 minutes in the past returns `'5m ago'`.
- [ ] `formatRelativeTime` called with an ISO string 2 hours in the past returns `'2h ago'`.
- [ ] `formatRelativeTime` called with an ISO string 3 days in the past returns `'3d ago'`.
- [ ] All four tests pass when `npm test` is run.

**`tests/unit/utils.test.ts`**

- [ ] `cn('foo', 'bar')` returns `'foo bar'`.
- [ ] `cn('foo', false, 'bar')` returns `'foo bar'` (falsy values are dropped).
- [ ] `cn('p-4', 'p-2')` returns `'p-2'` (later Tailwind class wins via `tailwind-merge`).
- [ ] `cn()` called with no arguments returns `''`.
- [ ] All four tests pass when `npm test` is run.

### D4 — Unit tests: `mockAgent`

All tests live in `tests/unit/mockAgent.test.ts`, importing `createSimulatedRequest` and `advanceRun` from `@/logic/mockAgent`.

A shared minimal `RequestInput` fixture must be defined in the test file or a `tests/unit/fixtures.ts` helper. The fixture must satisfy all required fields: `targetBrief`, `objective`, `offer`, `preferredChannel`, `tone`, `goalType`, `focuses`.

**`createSimulatedRequest` routing**

- [ ] A brief containing `'paul graham'` (case-insensitive match via the internal `normalize()`) returns a request where `research.person` is `'Paul Graham'` and `research.organization` contains `'Hacker News'`.
- [ ] A brief containing `'hacker news'` returns a request where `research.person` is `'Paul Graham'`.
- [ ] A brief containing `'pg'` (substring match) returns a request where `research.organization` contains `'Hacker News'`.
- [ ] A brief containing `'a16z'` returns a request where `research.person` is not `'Paul Graham'` and `research.organization` contains `'Andreessen'`.
- [ ] A brief containing `'andreessen'` returns a request that is not the PG seed.
- [ ] A brief with no recognizable keywords (e.g. `'random unknown person'`) returns a request where `research.person` is `'Target to be resolved'` (the generic case value).

**Shape invariants (run on all three cases: PG, a16z, generic)**

- [ ] `id` is a non-empty string.
- [ ] `status` is `'running'`.
- [ ] `createdAt` and `updatedAt` are valid ISO 8601 strings (parseable by `new Date()`).
- [ ] `run` is an array of exactly 5 elements, each with keys `key`, `label`, `detail`, `status`.
- [ ] `run[0].status` is `'running'` (parse stage starts running immediately).
- [ ] `run[1].status` through `run[4].status` are `'queued'`.
- [ ] `research` is defined and has non-empty `person`, `organization`, `surface`, `summary` strings.
- [ ] `outreach` is defined and has `email`, `linkedin`, and `x_dm` deliverables, each with a non-empty `body` string.

**`advanceRun`**

- [ ] Given a run where `run[0].status === 'running'`, calling `advanceRun(run)` returns a new array where `run[0].status === 'done'` and `run[1].status === 'running'`.
- [ ] Given a run where `run[3].status === 'running'` (synthesize), calling `advanceRun(run)` returns a new array where `run[3].status === 'done'` and `run[4].status === 'running'`.
- [ ] Given a run where all stages are `'done'` (no stage has status `'running'`), calling `advanceRun(run)` returns the same logical run (no mutation, all stages remain `'done'`).
- [ ] `advanceRun` does not mutate the input array.

### D5 — Playwright setup

- [ ] `playwright.config.ts` exists at the repository root.
- [ ] The config sets `baseURL: 'http://localhost:3000'`.
- [ ] The config includes a `webServer` block that runs `npm run dev` and waits for `http://localhost:3000` before starting tests, with `reuseExistingServer: true` (so local dev server can be reused).
- [ ] The config sets a default `timeout` of at least `15000` ms per test action to accommodate the mock agent's 5-second simulation ceiling.
- [ ] The config sets a default `navigationTimeout` of at least `10000` ms.
- [ ] `tests/e2e/` directory exists.
- [ ] `package.json` `scripts` contains: `"test:e2e": "playwright test"`.
- [ ] `package.json` `devDependencies` contains: `@playwright/test`.
- [ ] Running `npm run test:e2e` starts the dev server (if not already running), executes the E2E tests, and exits with code 0 when all tests pass.

### D6 — E2E: demo flow (`tests/e2e/demo.spec.ts`)

All assertions use the selectors and copy text as they appear in the rendered DOM (derived from `src/pages/Console.tsx`).

- [ ] Test navigates to `/console` and the page loads without a network error.
- [ ] The button with text `'Load PG example'` is visible.
- [ ] Clicking `'Load PG example'` populates the target brief textarea with a non-empty value containing `'hacker news'` or `'pg'` (case-insensitive).
- [ ] The button with text `'Run due diligence'` is visible and clickable.
- [ ] Clicking `'Run due diligence'` causes at least one stage pill badge to display the text `'running'` within 2 seconds (the simulation starts immediately).
- [ ] The test waits up to `10000` ms for the request `status` badge in the sidebar to display `'ready'` (the mock agent completes in ~5s).
- [ ] After `'ready'` status appears, the research board shows a card containing the text `'Paul Graham'` in the Person field.
- [ ] After `'ready'` status appears, the research board shows a card containing `'Hacker News'` in the Organization field.
- [ ] After `'ready'` status appears, the "Recommended wedge" section is visible and contains a non-empty headline text.
- [ ] The "Outreach studio" section shows at least one subject line (the Email tab is active by default, so the subjects list is visible).
- [ ] The "Final draft" section is visible and contains the text `'Hi'` (all draft bodies start with a greeting).
- [ ] A button with label `'Copy draft'` is visible.
- [ ] Clicking `'Copy draft'` causes the button label to change to `'Copied'` within 1500 ms.

**Timer assumption:** The mock agent progresses in 4 timer steps with delays of 1.1s, 2.3s, 3.6s, and 5.0s (from `AppContext.scheduleProgress`). Tests must wait at least 6s for full completion. Using Playwright's `waitForSelector` with `timeout: 10000` is sufficient.

### D7 — E2E: landing to console navigation (`tests/e2e/navigation.spec.ts`)

- [ ] Test navigates to `/` (the landing page) and the page loads.
- [ ] The page contains the text `'Outreach OS'` (visible in the header).
- [ ] The page contains the text `'Messy target brief in'` (the `<h1>` starts with this phrase — note it is split by a `<br/>`, so full heading is "Messy target brief in. Defendable outreach out." but the first part is sufficient).
- [ ] A link or button with text `'Open console'` is visible in the header.
- [ ] Clicking `'Open console'` navigates to `/console` (the URL changes to end with `/console`).
- [ ] After navigation, a section titled `'What are you trying to make happen?'` is visible (the main intake section card title in `Console.tsx`).

### D8 — CI pipeline (`.github/workflows/ci.yml`)

- [ ] `.github/workflows/ci.yml` exists.
- [ ] The workflow triggers on `push` to any branch and on `pull_request`.
- [ ] The workflow defines a single job (suggested name: `quality`) that runs on `ubuntu-latest`.
- [ ] The job uses `actions/setup-node` with `node-version: '22'` and `cache: 'npm'`.
- [ ] Step 1: `npm ci` (clean install from lockfile).
- [ ] Step 2: `npm run lint` (TypeScript type-check).
- [ ] Step 3: `npm run lint:eslint`.
- [ ] Step 4: `npm run format:check`.
- [ ] Step 5: `npm test` (Vitest unit tests).
- [ ] Step 6: `npm run build` (Vite production build).
- [ ] Step 7: `npm run test:e2e` (Playwright E2E against the production build or dev server — see note below).
- [ ] Each step has a human-readable `name` field.
- [ ] No secrets, tokens, or environment-specific credentials appear in the YAML.
- [ ] The workflow file is valid YAML (parseable without error).

**CI E2E note:** Playwright's `webServer.reuseExistingServer: true` will cause the dev server to be started fresh in CI (no pre-existing server). The `npm run dev` command the Playwright config executes must bind to `0.0.0.0` — the existing `package.json` `dev` script already does this (`vite --port=3000 --host=0.0.0.0`), so no changes are needed.

## Definition of done

All of the following must be true simultaneously before Track D is considered complete:

1. `npm run lint:eslint` exits 0 **OR** exits non-zero and `tests/lint-report.md` documents every violation.
2. `npm run format:check` exits 0 **OR** exits non-zero and `tests/lint-report.md` documents every formatting issue.
3. `npm test` exits 0 and the output shows all D3 + D4 tests passing (minimum 18 tests: 4 time + 4 utils + 10 mockAgent).
4. `npm run test:e2e` exits 0 and the output shows all D6 + D7 tests passing (minimum 13 assertions across the two spec files).
5. `.github/workflows/ci.yml` exists and is syntactically valid YAML with all 7 steps in order.
6. No file under `src/` has been modified (confirmed by `git diff --name-only HEAD` showing no `src/` paths).

## UX notes

This track has no user-facing changes. All artifacts are developer-facing (config files, test files, CI YAML). No copy changes, no visual changes, no new routes.

## Edge cases

### Linter finds violations in `src/`

If `npm run lint:eslint` or `npm run format:check` exits non-zero due to existing violations in `src/`, do not modify any file under `src/`. Instead:
1. Capture the full command output.
2. Write it to `tests/lint-report.md` with sections "ESLint violations" and "Prettier violations".
3. In `.github/workflows/ci.yml`, annotate the relevant steps with a comment `# May fail until Track C fixes src/ issues`.

### Path alias in Vitest

`vitest.config.ts` must declare the `@/` alias independently of `vite.config.ts`. Vitest does not automatically inherit Vite aliases unless you use `mergeConfig` from `vite`. The simplest correct approach is to re-declare:

```ts
import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

If you extend from `vite.config.ts` using `mergeConfig`, verify the alias resolves in both build and test contexts.

### Playwright clipboard in CI

The `navigator.clipboard.writeText` API requires a secure context (HTTPS) or `localhost`. Playwright running against `http://localhost:3000` is a secure context for the browser API. If the clipboard assertion fails in CI, fall back to asserting the button text changes to `'Copied'` (which the `CopyButton` component in `Console.tsx` does regardless of clipboard success — it sets `copied = true` even when the `catch` block fires).

### Mock agent timer boundary

The simulation completes after the 4th `setTimeout` fires at ~5 seconds. Add a Playwright `waitFor` with `timeout: 10000` (double the simulation duration) to avoid flaky tests on slow CI runners. Do not use `page.waitForTimeout()` (fixed sleep) — use `page.waitForSelector()` or `expect(locator).toHaveText()` with an explicit timeout option.

### `advanceRun` with no running stage

The function's source code (`src/logic/mockAgent.ts` line 241) returns the input run unchanged when no stage has status `'running'`. The unit test must verify the return value is structurally identical to the input, not reference-equal (since the implementation uses `run.map` which always returns a new array — but when `findIndex` returns `-1`, it short-circuits with `return run`, so it IS reference-equal). The test should check that all stage statuses remain unchanged, not check reference equality.

### `formatRelativeTime` clock skew

The function uses `Date.now()` internally, not a passed-in clock. Tests must construct ISO strings relative to `Date.now()` at test execution time, not hardcoded timestamps. Use:

```ts
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
```

### CI caching and `npm ci`

The CI workflow must use `npm ci` (not `npm install`) to ensure reproducible installs from `package-lock.json`. If `package-lock.json` does not exist at the time of implementation, `npm install` must be run once locally to generate it and the lockfile must be committed. The `actions/setup-node` cache key depends on `package-lock.json` being present.

## Security / privacy / compliance

- No user data is involved. All tests run against seeded in-memory state.
- No API keys, tokens, or secrets appear in any config file, test file, or CI YAML.
- The `.github/workflows/ci.yml` does not use `pull_request_target` (which can expose secrets to fork PRs). It uses `pull_request` only.
- ESLint and Prettier are dev-only dependencies — they do not ship in the production bundle.
- Playwright browser binaries are downloaded at install time (`npx playwright install --with-deps` may be needed in CI as a pre-step before `npm run test:e2e`). This is a local-network-only download with no authentication.

## Open questions

1. **ESLint violations in `src/`:** Inspection of the codebase confirms single quotes and no semicolons, which matches the `.prettierrc` target. However, `@typescript-eslint` `strict` rules may flag issues like `no-explicit-any` or `no-unused-vars` that were previously unchecked. The implementer must decide whether to configure these rules as `warn` (allow CI to pass) or `error` (require `tests/lint-report.md`). Recommendation: start with `warn` for `@typescript-eslint/no-explicit-any` and `error` for everything else.

2. **Playwright install in CI:** `@playwright/test` requires browser binaries installed separately via `npx playwright install --with-deps chromium`. This step must be added to the CI workflow between `npm ci` and `npm run test:e2e`. The implementer should decide whether to cache the Playwright browser binaries (use `~/.cache/ms-playwright` with a cache key tied to the Playwright version). Recommendation: add the install step without caching first; add caching only if CI time exceeds 3 minutes.

3. **Single-browser vs. multi-browser:** The Playwright config should run against Chromium only in CI (add `projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]`) to keep CI fast. The spec does not require Firefox or Safari coverage.

4. **`vitest.config.ts` vs. `vite.config.ts` extension:** The TODO says "extend from `vite.config.ts` for path aliases." Using `mergeConfig` adds a dependency on the Vite config being Vitest-compatible. The safer path is to re-declare the alias in `vitest.config.ts` independently. Both approaches satisfy the acceptance criteria. Implementer chooses.
