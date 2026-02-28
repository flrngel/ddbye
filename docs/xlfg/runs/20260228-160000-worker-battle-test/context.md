# Context

## Raw request

> I added anthropic api key. now battle test everything related to agent worker (prioritize using test code for battle test and then do e2e tests once everything works) and fine-tune the problems.

## Assumptions

- ANTHROPIC_API_KEY is set in the environment (user confirmed)
- Worker package at `worker/` uses `@anthropic-ai/claude-agent-sdk` with `query()` API
- Worker has never been run against a real API — this is first contact
- "Battle test" = run the worker code with real API calls, find failures, fix them
- Priority: unit/integration tests first, then e2e (server + worker + frontend)

## Constraints

- Worker uses `@anthropic-ai/claude-agent-sdk` which may have API quirks
- WebSearch and WebFetch are server-side tools — need real API key
- No existing test suite for worker/ (only frontend vitest tests exist)
- Server currently uses stub data — worker dispatch is not wired
- Must not break existing 36 vitest tests or frontend

## Approach

1. Try running the worker CLI directly against real API
2. Write integration tests for the worker pipeline
3. Fix any issues found (SDK API mismatches, schema errors, tool failures)
4. Wire worker to server if feasible
5. Verify everything end-to-end
