# Patterns

Reusable patterns discovered during development.

## Playwright port override (Track D)

Use `E2E_PORT` env var in `playwright.config.ts` to avoid conflicts when port 3000 is occupied locally. Default to 3000 for CI.

## Lint-report pattern (Track D)

When a linter setup can't fix existing violations (ownership constraints), document them in `tests/lint-report.md` and use `continue-on-error: true` in CI.

## Hono API server template (run: 20260228-103744-api-server)

- **Stack**: Hono + @hono/node-server + better-sqlite3 + tsx
- **SSE fan-out**: `Map<string, Set<SSEWriter>>` in a dedicated `sse.ts` module. `addListener` returns cleanup function. `emit` broadcasts to all registered writers.
- **Stub dispatch**: Timer-based `setTimeout` chains in `worker.ts` with `// TODO Track B` markers. Each stage transition persists to DB then emits SSE.
- **DB pattern**: Prepared statements, WAL mode, synchronous API. Single JSON blob column for flexibility.
- **CORS guard**: Default `*` only when `NODE_ENV` is unset or `development`. Throw in non-dev without `CORS_ORIGIN`.

## Claude Agent SDK: `runStep<T>()` pattern

Wrap each pipeline step as a separate `query()` call with its own system prompt, allowedTools, and Zod-validated structured output. Extract result from `message.structured_output` when `message.type === "result" && message.subtype === "success"`. See `worker/src/agent.ts`.

## Prompt injection defense: XML delimiters

Wrap user-supplied text in XML-style delimiters (`<user_target_hypothesis>`, `<sender_context>`) to help the model distinguish data from instructions. Always minimize user-controlled text in prompts that have web tool access.

## Zod schema strategy for Agent SDK

Use one narrow schema per step instead of one large schema. Complex schemas increase structured output retry failures. Use `z.toJSONSchema()` from `zod/v4` (available in zod@3.25.x via forward-compat bridge).

## Timer cleanup per entity

Use `Map<string, number[]>` for timeout refs, not append-only arrays. Call `clearTimersForRequest(id)` on delete/redraft.

## API mock mode sentinel

`MockModeError` class in `api.ts` — thrown when `VITE_API_BASE` is unset. Callers catch to fall back to mock behavior.

## SSE → hydrate

`subscribeAndHydrate(id)` pattern: subscribe to SSE, on terminal event fetch full entity, clean up EventSource.

## SSE named events: always use addEventListener

When a server emits named SSE events (`event: request.ready`), the browser's `source.onmessage` will NOT fire — it only catches unnamed events. Use `source.addEventListener('request.ready', handler)` for each expected event name. This was a P0 bug found during the merge-worktrees run.

## Parallel worktree merge: use merge-tree for dry run

Before merging, run `git merge-tree --write-tree branchA branchB` to preview conflicts without touching the working tree. This avoids wasted merge attempts.
