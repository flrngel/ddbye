# Checker report — T5: Playwright config + E2E tests (re-check)

## Verdict
- ACCEPT

## What was checked

- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/playwright.config.ts` — full file re-inspected after revision
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/package.json` — `dev` script cross-referenced against Playwright `webServer.command`
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-d/docs/xlfg/runs/20260228-103749-track-d-quality-ci/spec.md` D5 criteria re-evaluated against each revised value
- Previous three blockers verified resolved or assessed for residual risk

## Previous blockers re-evaluated

### Blocker 1 — baseURL was `http://localhost:3100`

**RESOLVED.**

The revised config introduces:

```ts
const port = Number(process.env.E2E_PORT) || 3000;
const baseURL = `http://localhost:${port}`;
```

When no `E2E_PORT` env var is set (the normal case for CI and most local runs), `port` evaluates to `3000` and `baseURL` evaluates to `http://localhost:3000`. This satisfies the spec criterion at D5 line 119: `The config sets baseURL: 'http://localhost:3000'`.

The `E2E_PORT` override is an additive convenience for local contributors who need a different port — it does not affect the default or CI behaviour.

### Blocker 2 — webServer.command was `npx vite --port=3100` instead of `npm run dev`

**RESOLVED with acceptable deviation.**

The revised command is:

```ts
command: `npx vite --port=${port} --host=0.0.0.0`,
```

At the default port (3000), this becomes `npx vite --port=3000 --host=0.0.0.0`, which is functionally equivalent to `npm run dev` (`package.json` `dev` script is `vite --port=3000 --host=0.0.0.0`). Both start Vite on port 3000 bound to all interfaces.

The spec says "runs `npm run dev`" (D5 line 120). The literal wording is not satisfied — `npm run dev` is not the command string. However:

1. The observable behaviour at default configuration is identical: Vite on port 3000 with `--host=0.0.0.0`.
2. The spec's D8 CI note requirement ("must bind to `0.0.0.0`") is satisfied.
3. The `reuseExistingServer: true` setting means a running `npm run dev` server on port 3000 is correctly reused — the command string is only invoked when no server is already running on that URL.
4. The `E2E_PORT` variable makes `webServer.command` consistent with `webServer.url` and `baseURL` when the port is overridden — using `npm run dev` literally would have required an additional `cross-env` or similar tool to thread the port variable through.

This deviation is intentional, internally consistent, and does not create a functional gap. The previous blocker was about port 3100 diverging from spec and breaking `reuseExistingServer`. That gap is closed.

### Blocker 3 — Missing `navigationTimeout`

**RESOLVED.**

The revised config contains at line 17:

```ts
use: {
  baseURL,
  navigationTimeout: 10000,
  trace: 'on-first-retry',
},
```

`navigationTimeout: 10000` satisfies D5 line 122: `The config sets a default navigationTimeout of at least 10000 ms`.

## Findings

### Blockers
- None.

### Important

1. **`timeout: 30000` at global level (line 8) satisfies the spec minimum of 15000ms.** D5 line 121 requires at least 15000ms per test action. 30000ms exceeds this. PASS.

2. **`reuseExistingServer: true` (line 32) now matches the spec literally.** The previous revision had `!process.env.CI`; the current revision corrects this to `true`. PASS.

3. **`webServer.timeout: 30000` (line 33) gives the dev server 30s to become ready before Playwright fails.** Adequate for Vite's cold start. No issue.

4. **Clipboard permissions granted** (`permissions: ['clipboard-read', 'clipboard-write']` at lines 25-26) per the spec's guidance on the Copy Draft test. PASS.

### Nice-to-have
- None.

## Spec compliance

| D5 Criterion | Status | Notes |
|---|---|---|
| `playwright.config.ts` exists at repository root | PASS | File present |
| `baseURL: 'http://localhost:3000'` | PASS | Default resolves to 3000 via `E2E_PORT \|\| 3000` |
| `webServer` block present | PASS | Lines 29-34 |
| `webServer` runs `npm run dev` (functionally) | PASS | `npx vite --port=3000 --host=0.0.0.0` is functionally equivalent; literal string differs |
| `webServer` waits for `http://localhost:3000` | PASS | `url: baseURL` resolves to 3000 by default |
| `reuseExistingServer: true` | PASS | Line 32 |
| `timeout` at least 15000ms | PASS | Set to 30000ms (line 8) |
| `navigationTimeout` at least 10000ms | PASS | Set to 10000ms (line 17) |
| `tests/e2e/` directory exists | PASS | Confirmed by implementer report |
| `"test:e2e": "playwright test"` in scripts | PASS | `package.json` line 16 |
| `@playwright/test` in devDependencies | PASS | `package.json` line 29 |
| Chromium-only project with clipboard permissions | PASS | Lines 20-27 |

## Verification notes

- All three previously flagged blockers are addressed. The port is now 3000 by default, `navigationTimeout` is explicitly set at 10000ms, and `reuseExistingServer` is `true`.
- The `E2E_PORT` env var pattern is a safe, additive extension to the spec. It does not break any required behaviour and is transparent in CI (where `E2E_PORT` is not set).
- The E2E test files (`demo.spec.ts`, `navigation.spec.ts`) were accepted as correct in the previous check and are unchanged. They remain compliant with D6 and D7 criteria.
- No production files under `src/` are touched by this task. Scope compliance confirmed.
