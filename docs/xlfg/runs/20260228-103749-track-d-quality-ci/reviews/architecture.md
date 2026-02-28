# Architecture review

Run: `20260228-103749-track-d-quality-ci`
Reviewer: architecture-reviewer agent
Date: 2026-02-28

---

## Summary

Track D introduces a complete quality and CI layer onto an existing React 19 + Vite 7 frontend. The work is
additive-only: no production `src/` files were modified. The seven new config files, three unit-test files,
two E2E spec files, one CI workflow, and one lint report collectively form a coherent and internally consistent
quality gate. The approach is largely sound, but several concrete issues deserve attention before this layer is
relied on to gate the main branch.

Critical concern (P0): the CI pipeline does not guard against ESLint and Prettier failures breaking the build
in a way the team expects — the two steps are annotated "may fail" but the workflow still proceeds past them
unconditionally, meaning CI turns green while known quality violations exist in `src/`.

Everything else is either P1 (needs fixing before adding more tests) or P2 (nice-to-have improvements).

---

## Already covered by verification

The verification run (`20260228-105804`) exercised and confirmed the following, so this review does not
re-litigate them:

- All 36 unit tests pass (`npm test`).
- All 2 E2E tests pass (`npm run test:e2e`).
- `npm run lint` (TypeScript type-check) exits 0.
- ESLint and Prettier violations are documented in `tests/lint-report.md` and are pre-existing in `src/`.
- No `src/` files were modified (confirmed by `git diff --name-only HEAD`).
- The CI YAML is syntactically valid.
- `playwright.config.ts` `reuseExistingServer: true` and port-env-var override were verified to work.

---

## Net-new findings

### P0 (blockers)

**P0-1 — CI unconditionally proceeds past known-failing ESLint and Prettier steps**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/.github/workflows/ci.yml`

Relevant section (lines 27-32):

```yaml
- name: ESLint
  # May fail until Track C fixes src/ issues
  run: npm run lint:eslint

- name: Format check
  # May fail until Track C fixes src/ issues
  run: npm run format:check
```

The steps carry a prose comment but no `continue-on-error: true` directive. This means:

- When the `src/` violations are present (current state), the CI job **fails on the ESLint step and never
  reaches Unit tests, Build, or E2E**. The verification run that passed was run with `E2E_PORT=3100` locally,
  not through this CI file.
- If someone adds `continue-on-error: true` to make CI green, the two steps become silent no-ops: they pass
  green regardless of how many new violations are introduced. There is no way to distinguish "failing because
  of pre-existing src/ debt" from "failing because new code introduced a regression."

Neither state is acceptable for a gate that is meant to block merges. The correct fix is one of:

  a. Add `continue-on-error: true` to both steps **and** add a subsequent step that uploads `tests/lint-report.md`
     as a CI artifact and posts it as a PR comment via `actions/github-script`. This makes the failure visible
     without blocking.

  b. Use an inline `|| true` shell trick (`run: npm run lint:eslint || true`) paired with capturing output to
     a file and then failing the job only if the violation count regressed beyond the baseline documented in
     `tests/lint-report.md`.

  c. Change both rules that are currently erroring to `warn` in `eslint.config.mjs` temporarily, set
     `--max-warnings=4` (the known baseline count), and upgrade them back to `error` once Track C cleans
     `src/`. This keeps the gate meaningful — new violations beyond the baseline break CI.

As delivered, any PR against main that runs CI will fail immediately on ESLint before unit tests or E2E ever
run. This defeats the purpose of having a CI pipeline.

---

### P1 (important)

**P1-1 — `eslint.config.mjs` ignores block is in the wrong config object position**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/eslint.config.mjs`

```js
export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    // ... rules ...
  },
  {
    ignores: ['dist/', 'node_modules/', '*.config.*'],
  },
];
```

In ESLint 9 flat config, a config object that contains only `ignores` and no `files` property acts as a
**global ignores** block and applies to all other config objects. This is correct behavior. However,
`*.config.*` as an ignore glob will also ignore `eslint.config.mjs` itself and `vitest.config.ts` and
`playwright.config.ts` — which is intentional here since those are excluded from the `src/` scope already.
The concern is different: the `ignores` array uses bare `dist/` and `node_modules/` without a leading `**/`
prefix. In ESLint 9, directory patterns without `**/` match only at the root level, which is what you want
for these two directories. However, the inconsistency in pattern style (`dist/` vs. `*.config.*`) suggests
the pattern was written without a clear mental model, and future contributors may extend it incorrectly.

Recommended normalization:

```js
{
  ignores: ['dist/**', 'node_modules/**', '*.config.*'],
}
```

This issue does not affect current behavior but is a future correctness risk.

**P1-2 — `vitest.config.ts` uses `__dirname` without importing it**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/vitest.config.ts`

```ts
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

`vitest.config.ts` is an ES module file (`"type": "module"` is set in `package.json`). In ESM, `__dirname`
is not defined by the runtime. Vitest injects it via its own transform layer when the config file is loaded,
so the tests pass locally. However:

- TypeScript in strict mode should flag `__dirname` as an implicit `any` or `not defined` unless `@types/node`
  is in scope and `tsconfig.json` includes the `node` lib or the file is treated as CJS. Since `tsconfig.json`
  sets `"lib": ["ES2022", "DOM", "DOM.Iterable"]` and `"module": "ESNext"`, `__dirname` is not part of the
  declared type environment.
- `vite.config.ts` uses the same pattern and it is also included in `tsconfig.json`'s `include` array, so
  this is a pre-existing debt that `vitest.config.ts` inherited.

The safe fix is to use `import.meta.url` with `fileURLToPath`:

```ts
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

Since `tsconfig.json` excludes `vitest.config.ts` from its `include` array (`"include": ["src", "vite.config.ts"]`),
`tsc --noEmit` does not type-check the vitest config file at all. This means the `__dirname` usage is
invisible to the current type-check gate. If the `include` list is ever expanded to cover config files, this
will surface as a type error.

**P1-3 — `playwright.config.ts` `webServer.command` bypasses the `npm run dev` script indirection**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/playwright.config.ts`

```ts
webServer: {
  command: `npx vite --port=${port} --host=0.0.0.0`,
  url: baseURL,
  reuseExistingServer: true,
  timeout: 30000,
},
```

The `webServer.command` calls `npx vite` directly rather than `npm run dev`. The `npm run dev` script in
`package.json` is `vite --port=3000 --host=0.0.0.0`. This means:

- Any future changes to the dev script (e.g. adding environment variables, changing the port default, or
  prefixing with a cross-env call) will not be picked up by Playwright's server launch automatically.
- In CI, where `npx` resolves to the locally installed binary, this is functionally equivalent. However the
  spec (D5) states the config should run `npm run dev` and wait for `http://localhost:3000`.

The correct implementation is:

```ts
webServer: {
  command: `npm run dev -- --port=${port}`,
  url: baseURL,
  reuseExistingServer: true,
  timeout: 30000,
},
```

However, note that passing `--port` via `-- --port=X` to a Vite script requires Vite to accept it as a CLI
override, which it does. The current implementation works but diverges from the spec's stated intent.

**P1-4 — No test coverage for `advanceRun` returning a fresh array reference vs. the input reference**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/tests/unit/mockAgent.test.ts`

The existing mutation test (line 150-157) verifies that the original array is not mutated when a stage is
running:

```ts
it('does not mutate the input array', () => {
  const run = makeRun(['running', 'queued', 'queued', 'queued', 'queued']);
  const originalStatuses = run.map((s) => s.status);
  advanceRun(run);
  run.forEach((stage, i) => {
    expect(stage.status).toBe(originalStatuses[i]);
  });
});
```

However, the spec (edge case section) notes that when `findIndex` returns `-1` (all-done case), `advanceRun`
returns the **input reference unchanged** (`return run`). The current test for the all-done case (lines
142-148) only checks that all statuses are `'done'` — it does not verify whether the caller receives the
same reference or a new array:

```ts
it('returns same run when all stages are done', () => {
  const run = makeRun(['done', 'done', 'done', 'done', 'done']);
  const result = advanceRun(run);
  result.forEach((stage) => {
    expect(stage.status).toBe('done');
  });
});
```

This is a weak assertion. The spec explicitly calls out this behavior as a known edge case that callers might
rely on (or be surprised by). A caller in `AppContext.scheduleProgress()` that does strict equality comparison
of the returned array to detect changes would get a false negative on already-completed runs. The test should
also assert `expect(result).toBe(run)` (reference equality) for the all-done case to document and lock in
this contract.

**P1-5 — `demo.spec.ts` uses a fragile structural locator for the "Recommended wedge" section**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/tests/e2e/demo.spec.ts`

Line 35-37:

```ts
const wedgeSection = page.getByText('Recommended wedge').locator('..');
await expect(wedgeSection).toBeVisible();
```

`.locator('..')` selects the parent element of the matched text node. This is a structurally brittle selector
because it depends on the exact DOM nesting of the text node within its parent. If the component wraps the
text in an additional `<span>` or changes the heading level, this locator will silently select the wrong
element or fail. The preferred pattern for Playwright section assertions is to use a more explicit role or
data-testid selector. Since Track D cannot modify `src/`, this is a known constraint — but it should be
documented in the spec as a fragility to address when `data-testid` attributes are added.

---

### P2 (nice)

**P2-1 — `eslint.config.mjs` spreads `tseslint.configs['recommended'].rules` rather than using the new
flat-config preset format**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/eslint.config.mjs`

```js
rules: {
  ...tseslint.configs['recommended'].rules,
  ...reactHooks.configs.recommended.rules,
}
```

The `@typescript-eslint` v8 package exports flat-config-native preset arrays via
`tseslint.configs.recommended` (an array, not an object with a `rules` key). Spreading `.rules` accesses the
legacy-compat property that works but is not the canonical v8 API. The v8 idiomatic pattern is:

```js
export default [
  ...tseslint.configs.recommended,
  // override specific rules
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
```

The current approach works because the `.rules` property still exists on the recommended config object, but
it bypasses the `languageOptions` and `plugins` that the preset array would inject, requiring the config to
set them manually (which it does). This creates a redundancy: `plugins` and `languageOptions` are declared
explicitly, which is duplicated work. Using the preset array form removes the duplication and is more
forward-compatible.

**P2-2 — No `coverage` script or threshold configured in Vitest**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/vitest.config.ts`

The spec explicitly states "No coverage thresholds — pass/fail is the only gate." This is noted and
accepted. However, even without thresholds, adding a `coverage` configuration block with `provider: 'v8'`
and `reporter: ['text', 'lcov']` costs nothing and enables `npm run test:coverage` for local developer use.
The CI pipeline does not need to run it. This is a contributor-experience improvement only.

**P2-3 — `.prettierrc` `printWidth: 140` is much wider than the community default and may not match the
actual source file line lengths**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/.prettierrc`

```json
{
  "singleQuote": true,
  "semi": true,
  "printWidth": 140,
  "trailingComma": "all"
}
```

A `printWidth` of 140 means Prettier will not wrap lines shorter than 140 characters. Looking at
`src/logic/mockAgent.ts` line 117, there is a long string concatenation that would not be wrapped at 140
columns. This was chosen deliberately to reduce Prettier's reformatting of long lines in the existing codebase.
That is a reasonable pragmatic choice for the "Track D cannot touch src/" constraint, but it should be
documented in the `.prettierrc` file as a comment (not possible in JSON) or in `tests/lint-report.md` so
future contributors understand why the width is non-standard. Consider converting to `.prettierrc.js` or
`.prettierrc.cjs` to allow a comment.

**P2-4 — CI workflow does not cache Playwright browser binaries**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/.github/workflows/ci.yml`

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium
```

The spec open question 2 explicitly deferred browser caching. This is acceptable for a first pass. However,
Playwright browser download is ~100MB and takes 30-60 seconds on cold CI runners. When the CI pipeline is
unblocked (P0-1 fixed), adding a cache step will materially reduce CI time:

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
```

**P2-5 — `time.test.ts` has no test for the exact 60-second boundary (off-by-one risk)**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/tests/unit/time.test.ts`

`formatRelativeTime` uses strict `< minute` comparison (`diff < 60_000`). The test exercises 30 seconds and
5 minutes, but does not test the boundary at exactly 59 seconds (should return `'just now'`) or exactly 60
seconds (should return `'1m ago'`). These boundary conditions are the most likely source of off-by-one bugs.

**P2-6 — `mockAgent.test.ts` does not test the `'hn'` keyword route**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/tests/unit/mockAgent.test.ts`

The `createSimulatedRequest` routing in `src/logic/mockAgent.ts` (line 229) matches on `'hn'` as a separate
keyword alongside `'hacker news'`. The test suite covers `'hacker news'` and `'pg'` but not `'hn'`. This
leaves a gap in the routing coverage for that keyword variant. Since `'hn'` is a short substring that could
appear in unrelated briefs (e.g. "John Smith"), a regression in its matching logic would not be caught.

---

## Why verification did not catch net-new findings

- **P0-1 (CI unconditionally fails):** Verification ran commands directly in the shell (`npm run lint:eslint`,
  `npm run test:e2e`), not by triggering GitHub Actions. The CI workflow's `continue-on-error` absence is only
  visible when the full job runs in Actions — where the ESLint step exits non-zero and the runner halts the
  job before proceeding to unit tests. Local verification bypasses this sequencing.

- **P1-1 (ignores glob style):** Verification confirmed the config does not crash. It does not audit glob
  pattern correctness or style consistency.

- **P1-2 (`__dirname` in ESM):** `npm run lint` (TypeScript) excludes `vitest.config.ts` from its `include`
  array. The type error is invisible to the existing check. Vitest's own config loader injects `__dirname` at
  runtime, so tests pass.

- **P1-3 (`webServer.command` bypasses `npm run dev`):** Verification confirmed E2E tests pass. It does not
  check whether the command matches the spec's stated intent or whether the indirection is future-proof.

- **P1-4 (weak all-done reference test):** Verification runs tests and checks pass/fail. It does not audit
  whether the assertions are sufficiently strong to catch behavioral regressions.

- **P1-5 (fragile parent locator):** Verification confirms the test passes against the current DOM. It does
  not evaluate selector resilience to future DOM changes.

- **P2-x findings:** All are design quality issues invisible to pass/fail verification.

---

## Suggested refactors

**Immediate (before relying on CI to gate main):**

1. Fix P0-1 by adding `continue-on-error: true` to the ESLint and Format check steps in
   `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/.github/workflows/ci.yml`
   and adding a follow-up step that exits non-zero if the violation count exceeds the baseline (4 ESLint
   errors, 11 Prettier files). Alternatively, use option (c) from P0-1: change erroring rules to `warn` with
   a `--max-warnings=4` guard.

2. Fix P1-2 by replacing `__dirname` in
   `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/vitest.config.ts`
   with the ESM-native pattern:
   ```ts
   import { fileURLToPath } from 'url';
   const __dirname = path.dirname(fileURLToPath(import.meta.url));
   ```

3. Fix P1-4 by adding a reference-equality assertion to the all-done `advanceRun` test in
   `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/tests/unit/mockAgent.test.ts`:
   ```ts
   it('returns the same array reference when all stages are done', () => {
     const run = makeRun(['done', 'done', 'done', 'done', 'done']);
     const result = advanceRun(run);
     expect(result).toBe(run); // short-circuit: no map, same reference
   });
   ```

**Before next track adds tests:**

4. Address P1-3 by changing the Playwright webServer command to `npm run dev -- --port=${port}` so that
   future changes to the dev script are automatically picked up.

5. Address P2-6 by adding a routing test for `'hn'` keyword in `mockAgent.test.ts`.

6. Address P2-5 by adding boundary tests at 59s and 60s in `time.test.ts`.

**Nice-to-have:**

7. Migrate `eslint.config.mjs` to use the flat-config preset array form (P2-1) to reduce manual plugin
   registration and stay current with `@typescript-eslint` v8 conventions.

8. Add Playwright browser caching to the CI workflow (P2-4) once P0-1 is resolved and the pipeline is
   running end-to-end.
