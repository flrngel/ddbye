# Security review

Run: `20260228-103749-track-d-quality-ci`
Reviewer: security agent
Date: 2026-02-28

## Summary

Track D added tooling-only files: ESLint flat config, Prettier config, Vitest config, Playwright config,
three unit test files, two E2E test files, a CI pipeline, a lint report, and devDependency additions to
`package.json`. No production source code was modified.

The overall risk posture is low. There are no hardcoded credentials, no secret exposure in CI, and no
dangerous permission grants. Two findings worth noting are in the CI pipeline (`continue-on-error` absence
combined with documented-expected failure steps) and the Playwright `webServer` binding to `0.0.0.0`.
Neither is a blocker for this frontend-only prototype, but both warrant remediation before any production
or shared-CI deployment.

## Already covered by verification

- Lint violations in `src/` were documented in `tests/lint-report.md` rather than silently suppressed.
- Track D isolation constraint (no `src/` edits) was confirmed by `git diff --name-only HEAD` check in
  verification step 6, which showed only root config files changed.
- All 36 unit tests and 2 E2E tests passed, confirming no code-path injection via test fixtures.
- The `verification.md` notes that expected ESLint/Prettier failures are pre-existing and not regressions.

## Net-new findings

### P0 (blockers)

None.

### P1 (important)

**P1-1: Playwright `webServer` binds to `0.0.0.0` — exposes dev server on all interfaces during E2E runs**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/playwright.config.ts`, line 31

```ts
command: `npx vite --port=${port} --host=0.0.0.0`,
```

Binding to `0.0.0.0` means the Vite dev server is reachable from any network interface, including the
external network, whenever a developer or CI runner executes `npm run test:e2e`. On a shared CI runner or
a developer machine connected to a shared network this expands the attack surface unnecessarily. The
server process runs for the duration of the test suite and terminates cleanly, but during that window any
host on the same network can interact with it.

The `dev` script in `package.json` line 7 also uses `--host=0.0.0.0`, which is a separate pre-existing
concern but compounds this one.

Recommended fix: bind to `127.0.0.1` for the Playwright web server command. The `reuseExistingServer:
true` option means developers running a local dev server on `0.0.0.0` can still attach; the CI path
should be narrower.

```ts
// playwright.config.ts line 31 — change to:
command: `npx vite --port=${port} --host=127.0.0.1`,
```

**P1-2: CI pipeline does not isolate expected-failure steps — a real regression will silently appear to pass**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/.github/workflows/ci.yml`, lines 28-33

```yaml
- name: ESLint
  # May fail until Track C fixes src/ issues
  run: npm run lint:eslint

- name: Format check
  # May fail until Track C fixes src/ issues
  run: npm run format:check
```

Both steps are documented to exit with code 1 due to pre-existing `src/` violations. Because they are not
marked `continue-on-error: true`, the entire CI job will fail on every PR right now. The comment explains
the intent but does not enforce it. Two risks arise:

1. Teams may be conditioned to dismiss CI failures ("it always fails") and miss a genuine regression.
2. If Track C eventually fixes the violations, the pipeline will silently start passing without the
   `continue-on-error` flag being removed — leaving dead configuration in place.

The safer approach is to mark these steps with `continue-on-error: true` explicitly while the technical
debt exists, and create a tracked issue to flip them back to blocking once Track C resolves the
violations.

```yaml
- name: ESLint
  continue-on-error: true  # remove when Track C resolves src/ violations
  run: npm run lint:eslint

- name: Format check
  continue-on-error: true  # remove when Track C resolves src/ violations
  run: npm run format:check
```

### P2 (nice)

**P2-1: `clipboard-read` and `clipboard-write` Playwright permissions granted at the project level**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/playwright.config.ts`, lines 23-26

```ts
use: {
  ...devices['Desktop Chrome'],
  permissions: ['clipboard-read', 'clipboard-write'],
},
```

Clipboard permissions are granted globally to all tests in the chromium project. Only `demo.spec.ts`
actually exercises the clipboard (`Copy draft` button). The permission is not dangerous in CI (headless
Chromium does not share the system clipboard meaningfully), but granting broad permissions project-wide
is a wider grant than necessary and is inconsistent with least-privilege. If additional E2E tests are
added later that should not touch the clipboard, they will silently have access.

Recommended fix: move the permissions grant into the specific test that needs it using
`page.context().grantPermissions(['clipboard-read', 'clipboard-write'])` inside `demo.spec.ts`, or
scope it to a named project used only by that test file.

**P2-2: `vitest.config.ts` resolves `__dirname` without type guard — minor but avoidable**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/vitest.config.ts`, line 11

```ts
'@': path.resolve(__dirname, './src'),
```

The file uses `path.resolve(__dirname, ...)`. In a strict ESM project (`"type": "module"` in
`package.json`) `__dirname` is not natively available — Vitest injects it for config files specifically,
so this works, but it is not portable. The conventional safe form uses `import.meta.url` with
`fileURLToPath`:

```ts
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
```

This is a style and portability concern, not a security risk. No injection vector exists here.

**P2-3: `eslint.config.mjs` ignores `*.config.*` globally, including itself**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/eslint.config.mjs`, line 27

```js
ignores: ['dist/', 'node_modules/', '*.config.*'],
```

The glob `*.config.*` causes ESLint to skip all config files at the root, including `vite.config.ts`,
`vitest.config.ts`, and `playwright.config.ts`. This means if someone introduced a secret or dangerous
pattern into those files, ESLint would not catch it. For a frontend prototype this is low risk, but the
exclusion is broader than intended — the typical intent is to avoid linting compiled or generated output,
not all developer-authored config files.

Recommended fix: narrow the ignore to generated artifacts only and let config files be linted:

```js
ignores: ['dist/', 'node_modules/'],
```

## Why verification did not catch net-new findings

The verification script (`verification.md`) checked exit codes and test pass/fail status. It did not
include a security-oriented review of:

- Network binding scope (`0.0.0.0` vs `127.0.0.1`) — functional tests pass regardless of bind address
- CI step semantics (`continue-on-error` absence) — CI would still "work" in the current repo state
- Playwright permission scope — clipboard tests pass whether permissions are global or per-context
- ESLint ignore glob breadth — linting of src/ files passed the verification target regardless

These are architectural/configuration posture concerns that are invisible to pass/fail verification
commands.

## Recommended fixes

| Priority | File | Change |
|----------|------|--------|
| P1-1 | `playwright.config.ts` line 31 | Change `--host=0.0.0.0` to `--host=127.0.0.1` in the `webServer.command` |
| P1-2 | `.github/workflows/ci.yml` lines 28-33 | Add `continue-on-error: true` to ESLint and Format check steps while Track C debt exists |
| P2-1 | `playwright.config.ts` lines 23-26 | Move clipboard permissions grant into `demo.spec.ts` test context, not the global project config |
| P2-2 | `vitest.config.ts` line 11 | Replace `__dirname` with `fileURLToPath(new URL('.', import.meta.url))` for ESM correctness |
| P2-3 | `eslint.config.mjs` line 27 | Narrow `ignores` to `['dist/', 'node_modules/']`, removing the broad `*.config.*` exclusion |
