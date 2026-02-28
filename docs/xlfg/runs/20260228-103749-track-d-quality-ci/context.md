# Context — Track D: Quality & CI

## Raw request

Implement Track D from `todos/track-d-quality-ci.md`: set up ESLint, Prettier, Vitest, Playwright, write unit tests and E2E tests, and create a CI pipeline. No production code changes allowed.

## Assumptions

- Existing code style uses no semicolons and single quotes (to be confirmed by inspecting codebase)
- React 19 + TypeScript strict mode — ESLint config must support this
- Path alias `@/` → `./src/` must work in Vitest
- Vite dev server on port 3000 for Playwright
- Mock agent simulation is timer-based (1.1s–5s) — E2E tests need appropriate timeouts

## Constraints

- **File ownership:** Only root config files, `tests/**`, `.github/**`, and `package.json` devDeps/scripts
- **No src/ edits:** If linters find issues, document them in `tests/lint-report.md`
- **Environment:** macOS (Darwin), Node 22, npm
- **Security:** No secrets in config files
- **UX:** N/A (no user-facing changes)
