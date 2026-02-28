# Track D: Quality & CI

## Ownership

- **You own:** root config files (`eslint.config.*`, `.prettierrc`, `vitest.config.*`, `playwright.config.*`), `tests/**`, `.github/**`, root `package.json` (devDependencies + scripts only)
- **You may read (no edits):** `src/**` (import for tests)
- **Do not touch:** `src/` production code, `server/`, `worker/`, `index.html`

## Reference docs

- `docs/06_demo-flow.md` — the demo scenario to test end-to-end
- `src/types.ts` — types to validate in unit tests
- `src/logic/mockAgent.ts` — logic to unit test
- `src/lib/time.ts`, `src/lib/utils.ts` — pure functions to unit test

## Tasks

### D1: ESLint + Prettier
- Add `eslint.config.mjs` using flat config format
- Include `@typescript-eslint` and `eslint-plugin-react-hooks`
- Add `.prettierrc` with single quotes, no semicolons (or match existing code style)
- Add to root `package.json` scripts:
  - `"lint:eslint": "eslint src/ --max-warnings=0"`
  - `"format": "prettier --write src/"`
  - `"format:check": "prettier --check src/"`
- Install devDependencies: `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-plugin-react-hooks`, `prettier`

### D2: Vitest setup
- Add `vitest.config.ts` at root (extend from `vite.config.ts` for path aliases)
- Create `tests/unit/` directory
- Add to root `package.json` scripts:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
- Install devDependency: `vitest`

### D3: Unit tests — time & utils
- `tests/unit/time.test.ts`:
  - `formatRelativeTime` returns "just now" for < 1 minute ago
  - `formatRelativeTime` returns "5m ago" for 5 minutes ago
  - `formatRelativeTime` returns "2h ago" for 2 hours ago
  - `formatRelativeTime` returns "3d ago" for 3 days ago
- `tests/unit/utils.test.ts`:
  - `cn` merges classes correctly
  - `cn` handles conditional classes (falsy values)
  - `cn` resolves Tailwind conflicts (e.g. `cn('p-4', 'p-2')` → `'p-2'`)

### D4: Unit tests — mockAgent
- `tests/unit/mockAgent.test.ts`:
  - `createSimulatedRequest` with PG-related brief returns a request with PG research
  - `createSimulatedRequest` with a16z-related brief returns a request with a16z research
  - `createSimulatedRequest` with an unrecognized brief returns a generic case
  - Every returned request has a valid `id`, `status`, `run` stages, `research`, and `outreach`
  - `advanceRun` moves the current running stage to done and the next queued stage to running
  - `advanceRun` on a fully-done run returns the same run

### D5: Playwright setup
- Add `playwright.config.ts` at root
- Configure to start the Vite dev server automatically (`webServer` option)
- Create `tests/e2e/` directory
- Add to root `package.json` scripts:
  - `"test:e2e": "playwright test"`
- Install devDependency: `@playwright/test`

### D6: E2E — demo flow
- `tests/e2e/demo.spec.ts`:
  - Navigate to `/console`
  - Click "Load PG example" — verify the target brief textarea is populated
  - Click "Run due diligence" — verify stages progress (badges change from queued → running → done)
  - Wait for status to become `ready`
  - Verify research board shows: person ("Paul Graham"), organization ("Hacker News"), recommended wedge headline
  - Verify outreach studio shows subject lines and a draft body
  - Click "Copy draft" — verify the clipboard (or at least verify the button state changes to "Copied")

### D7: E2E — landing to console navigation
- `tests/e2e/navigation.spec.ts`:
  - Navigate to `/`
  - Verify the page contains "Outreach OS" and "Messy target brief in"
  - Click "Open console" button
  - Verify URL is `/console`
  - Verify the composer section is visible

### D8: CI pipeline
- `.github/workflows/ci.yml`:
  - Trigger on push and pull request
  - Steps:
    1. Install dependencies (`npm ci`)
    2. Type check (`npm run lint`)
    3. ESLint (`npm run lint:eslint`)
    4. Format check (`npm run format:check`)
    5. Unit tests (`npm test`)
    6. Build (`npm run build`)
    7. E2E tests (`npm run test:e2e`)
  - Use a single job with Node 22

## Done criteria

- `npm run lint:eslint` runs and passes on the existing codebase (may need to auto-fix existing issues)
- `npm run format:check` runs and passes
- `npm test` runs and all unit tests pass
- `npm run test:e2e` runs Playwright against the dev server and all E2E tests pass
- `.github/workflows/ci.yml` exists and would pass in GitHub Actions
- No changes to `src/` production code — if ESLint finds issues, document them for Track C

## Notes

- If ESLint or Prettier finds existing style violations in `src/`, **do not fix them**. Create a `tests/lint-report.md` listing what needs fixing. Track C owns `src/` edits.
- The Playwright tests should work against the current mock mode (no server required).
- Vitest path aliases must match `vite.config.ts` (`@/` → `./src/`).
