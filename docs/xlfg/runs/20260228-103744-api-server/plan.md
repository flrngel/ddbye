# Plan — API Server (Track A)

Run: `20260228-103744-api-server`

## Summary

Build a Hono + TypeScript API server in `server/` with SQLite persistence, CRUD endpoints for diligence requests, SSE event streaming, a redraft endpoint, and a timer-based worker dispatch stub. 4 coarse implementation tasks consolidating A1–A9.

## Tasks

- [x] **T1: Foundation** (A1 + A2 + A8) — `server/package.json`, `tsconfig.json`, `src/types.ts`, `src/db.ts`, `data/.gitkeep`, health route in `src/index.ts`
- [x] **T2: Core routes** (A3 + A4 + A5) — `src/routes/requests.ts` with POST /requests, GET /requests, GET /requests/:id, validation, 404 handling
- [x] **T3: SSE + Worker stub** (A6 + A9) — `src/routes/events.ts` SSE handler, `src/worker.ts` dispatch stubs with timer chains, `src/stubs.ts` sample data, `src/sse.ts` listener registry
- [x] **T4: Redraft** (A7) — `src/routes/redraft.ts` with status gate, dispatchDraftStep integration

## Definition of done

- `cd server && npm run dev` starts the server on port 3001
- `curl POST /requests` returns 201 with `{ id, status, createdAt }`
- `curl GET /requests` returns summaries sorted by createdAt desc
- `curl GET /requests/:id` returns full DiligenceRequest (404 for unknown)
- `curl GET /requests/:id/events` streams SSE events through all stages
- `curl POST /requests/:id/redraft` works when status=ready, 400 otherwise
- `npm run lint` (tsc --noEmit) passes with zero errors
- No imports from `../src/` anywhere in `server/`

## Verification commands

```bash
cd server && npm install
cd server && npm run lint       # tsc --noEmit
cd server && npm run dev &      # start server in background
curl -s http://localhost:3001/health | jq .
curl -s -X POST http://localhost:3001/requests -H 'Content-Type: application/json' -d '{"targetBrief":"test","objective":"test","offer":"test","preferredChannel":"email","tone":"respectful","goalType":"sell","focuses":[]}' | jq .
curl -s http://localhost:3001/requests | jq .
# (use returned id for next calls)
curl -s http://localhost:3001/requests/<id> | jq .
curl -N http://localhost:3001/requests/<id>/events
```

## Rollback

All changes are in `server/` (new directory). Rollback = `rm -rf server/`.
