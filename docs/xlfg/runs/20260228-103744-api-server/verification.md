# Verification — API Server (Track A)

Run: `20260228-103744-api-server`

## Status: GREEN

## Commands run

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `cd server && npm install` | 0 | 49 packages installed |
| 2 | `cd server && npm run lint` | 0 | tsc --noEmit, no errors |
| 3 | `curl GET /health` | 0 | `{ "ok": true }` |
| 4 | `curl POST /requests (valid)` | 0 | HTTP 201, `{ id, status: "queued", createdAt }` |
| 5 | `curl POST /requests (missing field)` | 0 | HTTP 400, `{ "error": "objective is required" }` |
| 6 | `curl POST /requests (invalid enum)` | 0 | HTTP 400, `{ "error": "preferredChannel must be one of..." }` |
| 7 | `curl POST /requests (invalid focuses)` | 0 | HTTP 400, `{ "error": "invalid focuses: bad_focus" }` |
| 8 | `curl POST /requests (malformed json)` | 0 | HTTP 400, `{ "error": "invalid json" }` |
| 9 | `curl GET /requests` | 0 | HTTP 200, array with correct summary shape |
| 10 | `curl GET /requests/:id` | 0 | HTTP 200, full DiligenceRequest |
| 11 | `curl GET /requests/:id (404)` | 0 | HTTP 404, `{ "error": "not found" }` |
| 12 | `curl GET /requests/:id/events` | 0 | SSE stream: ping + 6 events (parsing→resolved→researching→synthesized→drafted→ready) |
| 13 | `curl GET /requests/:id/events (404)` | 0 | HTTP 404, `not found` (plain text) |
| 14 | `curl POST /requests/:id/redraft (ready)` | 0 | HTTP 202, `{ id, status: "drafting", updatedAt }` |
| 15 | `curl POST /requests/:id/redraft (not ready)` | 0 | HTTP 400, `{ "error": "request not ready" }` |
| 16 | `grep '../src/' server/src/` | 0 | No matches — no frontend imports |

## Definition of done checklist

- [x] `cd server && npm run dev` starts on port 3001
- [x] POST /requests returns 201
- [x] GET /requests returns sorted summaries
- [x] GET /requests/:id returns full request (404 for unknown)
- [x] GET /requests/:id/events streams all SSE events
- [x] POST /requests/:id/redraft works when ready, 400 otherwise
- [x] `npm run lint` passes with zero errors
- [x] No imports from ../src/ in server/

## Checker verdicts

- T1 (Foundation): **ACCEPT**
- T2 (Core routes): **ACCEPT**
- T3 (SSE + Worker): **ACCEPT**
- T4 (Redraft): **ACCEPT**
