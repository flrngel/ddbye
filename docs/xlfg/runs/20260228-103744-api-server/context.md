# Context — API Server (Track A)

## Raw request

Build the API server for Outreach OS per `todos/track-a-api-server.md`. Tasks A1–A9: init server package, shared types, CRUD endpoints (POST/GET /requests, GET /requests/:id), SSE event stream, redraft endpoint, persistence layer (SQLite), and worker dispatch stub.

## Assumptions

- Server lives entirely in `server/` — no edits to frontend `src/`
- SQLite via better-sqlite3 for persistence (simplest for MVP)
- Hono as the framework (lightweight, TypeScript-native, modern)
- Types are copied from `src/types.ts` with production-appropriate `RequestStatus` (8 states instead of 2)
- Worker dispatch is a stub with timer-based state progression
- CORS enabled for `*` in dev
- No authentication for MVP

## Constraints

- Must not import from frontend `src/`
- Must use the 8-state lifecycle: queued, parsing, resolving, researching, synthesizing, drafting, ready, failed
- SSE must stream events until status is `ready` or `failed`
- `POST /requests/:id/redraft` only valid when status is `ready`
