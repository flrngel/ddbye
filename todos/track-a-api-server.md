# Track A: API Server

## Ownership

- **You own:** `server/**` (all new files)
- **You may read (no edits):** `src/types.ts`, `docs/05_api-worker-contracts.md`, `contracts/`
- **Do not touch:** `src/`, `worker/`, `tests/`, root config files, `index.html`

## Reference docs

- `docs/05_api-worker-contracts.md` — full API spec, SSE event model, data ownership
- `contracts/request.create.example.json` — example POST body
- `contracts/research-packet.example.json` — example research output
- `contracts/outreach-packet.example.json` — example outreach output
- `src/types.ts` — canonical type definitions (`DiligenceRequest`, `RequestInput`, `ResearchPacket`, `OutreachPacket`)

## Tasks

### A1: Init server package
- Create `server/package.json` and `server/tsconfig.json`
- Pick a framework (Express or Hono)
- Keep it simple — this is an API server, not a monolith

### A2: Shared types
- Copy or re-export the domain types from `src/types.ts` into `server/src/types.ts`
- The server must not depend on the frontend Vite build
- Keep types in sync manually for now; a shared package can come later

### A3: `POST /requests`
- Accept `RequestInput` as the body
- Create a `DiligenceRequest` with status `queued` and a generated id
- Persist to the storage layer
- Dispatch the worker (stub the dispatch — Track B builds the actual worker)
- Return `{ id, status, createdAt }`

### A4: `GET /requests`
- Return an array of request summaries for the left rail
- Each summary: `{ id, title, status, parsedHints, preferredChannel, updatedAt }`
- Sort by `createdAt` descending

### A5: `GET /requests/:id`
- Return the full `DiligenceRequest` including `research` and `outreach` packets
- 404 if not found

### A6: SSE `/requests/:id/events`
- Stream worker progress events to the frontend
- Event types: `request.parsing`, `request.resolved`, `request.researching`, `request.synthesized`, `request.drafted`, `request.ready`, `request.failed`
- Keep the connection open until status is `ready` or `failed`

### A7: `POST /requests/:id/redraft`
- Accept `{ tone, preferredChannel }` as the body
- Only valid when status is `ready`
- Re-dispatch only the draft step to the worker
- Reset status to `drafting`

### A8: Persistence layer
- SQLite (via better-sqlite3 or drizzle) or Postgres
- Store full `DiligenceRequest` as a JSON column
- Index on `id` and `status`
- Keep it simple — one table is enough for the MVP

### A9: Worker dispatch interface
- Define a `dispatch(requestId: string): void` function signature
- For now, stub it to update the request status through the stages on a timer (mimicking the frontend mock)
- The real implementation will call into Track B's worker
- Document the expected interface so Track B can implement against it

## Done criteria

- `npm run dev` inside `server/` starts the API on a port
- `curl POST /requests` creates a request and returns an id
- `curl GET /requests` lists requests
- `curl GET /requests/:id` returns the full request
- SSE endpoint streams at least the stub events
- No imports from `src/` (frontend) — types are duplicated or shared via a separate path

## Notes

- CORS: the frontend runs on `localhost:3000`, so add CORS headers for `*` in dev
- The production lifecycle has 8 states (queued, parsing, resolving, researching, synthesizing, drafting, ready, failed). The API should use these, not the simplified running/ready from the frontend
