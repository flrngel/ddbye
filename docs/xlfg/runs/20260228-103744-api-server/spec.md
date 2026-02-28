# Spec — API Server (Track A)

Run: `20260228-103744-api-server`

---

## Problem

The Outreach OS frontend currently simulates the entire pipeline in-browser using seeded data and `setTimeout` timers. There is no persistent backend, so work is lost on refresh and there is no path to real Claude Agent SDK execution. Track A builds the stateful HTTP API server that the frontend (and later the worker) will talk to. Track B (worker dispatch) depends on the interface defined here.

---

## Goals

1. Stand up a Hono + TypeScript API server in `server/`.
2. Expose CRUD endpoints for diligence requests (A3, A4, A5).
3. Expose an SSE stream endpoint for real-time worker progress (A6).
4. Expose a redraft endpoint for tone/channel changes on completed requests (A7).
5. Persist all request state in SQLite (better-sqlite3), one table, JSON blob per row (A8).
6. Define and stub the worker dispatch interface so Track B can implement against it (A9).
7. Keep the server fully independent of the frontend Vite build — no imports from `src/` (A2).

---

## Non-goals

- No authentication or API keys in this iteration.
- No rate limiting or request quotas.
- No multi-tenancy or user accounts.
- No real Claude Agent SDK calls — worker dispatch is a timer stub only.
- No production deployment config (Docker, env secrets management, TLS).
- No migrations or schema versioning beyond initial table creation.
- No shared package between `server/` and `src/` — types are manually duplicated for now.
- No WebSocket support — SSE only.
- No pagination on `GET /requests`.

---

## User stories

**US-1 — Submit a brief:**
As the frontend, I submit a `RequestInput` payload and immediately receive a request ID and `queued` status so I can begin polling or subscribing to events.

**US-2 — List requests:**
As the frontend left rail, I fetch a lightweight summary list (id, title, status, parsedHints, preferredChannel, updatedAt) sorted newest-first so I can render the history panel without downloading full packets.

**US-3 — View a request:**
As the frontend detail panel, I fetch the full `DiligenceRequest` including any populated `research` and `outreach` packets.

**US-4 — Stream progress:**
As the frontend progress bar, I open an SSE connection to `/requests/:id/events` and receive typed events as the worker advances through each lifecycle stage, so I can animate the pipeline without polling.

**US-5 — Redraft:**
As the frontend outreach studio, I submit a new tone or channel preference on an already-`ready` request and receive a confirmation that a redraft job is queued, resetting status to `drafting`.

**US-6 — Survive restarts:**
As the server operator, after restarting the process I expect all previously created requests to be readable — no data loss because state is in SQLite, not memory.

---

## Acceptance criteria

### A1 — Init server package

- [ ] `server/package.json` exists with a `dev` script (e.g., `tsx watch src/index.ts`) and a `build` script.
- [ ] `server/tsconfig.json` targets ESNext, enables strict mode, and sets `moduleResolution` to `bundler` or `node16`.
- [ ] `npm run dev` inside `server/` starts the HTTP listener on a configurable port (default `3001`).
- [ ] A `GET /health` route returns `{ ok: true }` with status `200`.
- [ ] No imports from `../src/` (the frontend source) anywhere in `server/`.

### A2 — Shared types

- [ ] `server/src/types.ts` contains all domain types: `Channel`, `Tone`, `GoalType`, `ResearchFocus`, `RequestInput`, `EvidenceItem`, `ResearchCard`, `ResearchPacket`, `Deliverable`, `OutreachPacket`, `DiligenceRequest`.
- [ ] `RequestStatus` in server types is the 8-state union: `'queued' | 'parsing' | 'resolving' | 'researching' | 'synthesizing' | 'drafting' | 'ready' | 'failed'` — not the frontend's 2-state `'running' | 'ready'`.
- [ ] `RunStageStatus` remains `'queued' | 'running' | 'done'` matching the frontend.
- [ ] Types compile cleanly under `tsc --noEmit` with strict mode on.

### A3 — `POST /requests`

- [ ] Accepts a JSON body matching `RequestInput` (all fields required except `focuses` which may be an empty array).
- [ ] Returns `{ id: string, status: 'queued', createdAt: string }` with HTTP `201`.
- [ ] The `id` is prefixed `req_` followed by a short random string (e.g., `req_k3m9x2`).
- [ ] The full `DiligenceRequest` record is written to SQLite before the response is sent.
- [ ] `dispatchWorker(id)` is called after the record is persisted.
- [ ] Missing required fields return HTTP `400` with `{ error: string }`.
- [ ] Malformed JSON body returns HTTP `400` with `{ error: 'invalid json' }`.

### A4 — `GET /requests`

- [ ] Returns a JSON array sorted by `createdAt` descending.
- [ ] Each item shape: `{ id, title, status, parsedHints, preferredChannel, updatedAt }`.
- [ ] Returns an empty array `[]` when no requests exist (not a 404).
- [ ] `preferredChannel` is read from `input.preferredChannel` stored in the record.
- [ ] `parsedHints` is the array stored on the request (may be empty `[]` while status is `queued`/`parsing`).

### A5 — `GET /requests/:id`

- [ ] Returns the full `DiligenceRequest` object as stored in SQLite.
- [ ] `research` and `outreach` fields are included if populated, omitted (or `null`) if not yet available.
- [ ] Returns HTTP `404` with `{ error: 'not found' }` for unknown IDs.
- [ ] Response `Content-Type` is `application/json`.

### A6 — `GET /requests/:id/events` (SSE)

- [ ] Sets response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- [ ] Immediately sends a `ping` comment (`: ping\n\n`) on connection to confirm the stream is open.
- [ ] Emits one event per lifecycle transition using the SSE `data:` / `event:` / `id:` format (see SSE Event Format below).
- [ ] Event types emitted in order: `request.parsing`, `request.resolved`, `request.researching`, `request.synthesized`, `request.drafted`, `request.ready` (or `request.failed` if any stage fails).
- [ ] The stream closes automatically after emitting `request.ready` or `request.failed`.
- [ ] Returns HTTP `404` (plain text) if `:id` is unknown before opening the stream.
- [ ] A client that disconnects mid-stream causes the server to stop emitting and clean up any pending timers for that connection.
- [ ] Multiple simultaneous SSE clients for the same `id` are each served independently (fan-out per connection).

### A7 — `POST /requests/:id/redraft`

- [ ] Accepts JSON body `{ tone?: Tone, preferredChannel?: Channel }` (at least one field required).
- [ ] Returns HTTP `400` with `{ error: 'request not ready' }` if current status is not `ready`.
- [ ] Returns HTTP `404` with `{ error: 'not found' }` for unknown IDs.
- [ ] On success: updates the stored record's `input.tone` and/or `input.preferredChannel`, sets `status` to `drafting`, updates `updatedAt`, writes to SQLite.
- [ ] Calls `dispatchDraftStep(id)` stub after persisting.
- [ ] Returns `{ id, status: 'drafting', updatedAt }` with HTTP `202`.

### A8 — Persistence layer

- [ ] `server/src/db.ts` initializes a `better-sqlite3` database at a path configurable via `DB_PATH` env var (default `server/data/outreachos.db`).
- [ ] `CREATE TABLE IF NOT EXISTS requests` runs at startup with columns: `id TEXT PRIMARY KEY`, `status TEXT NOT NULL`, `data TEXT NOT NULL` (full JSON blob), `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`.
- [ ] `getRequest(id)` returns the parsed `DiligenceRequest` or `null`.
- [ ] `listRequests()` returns all rows as parsed `DiligenceRequest[]` sorted by `created_at DESC`.
- [ ] `upsertRequest(req)` serializes and writes the full object (INSERT or REPLACE).
- [ ] All DB calls are synchronous (better-sqlite3 is synchronous by design — no async wrappers needed).
- [ ] SQLite WAL mode is enabled at startup for read concurrency.

### A9 — Worker dispatch stub

- [ ] `server/src/worker.ts` exports `dispatchWorker(id: string): void`.
- [ ] `server/src/worker.ts` exports `dispatchDraftStep(id: string): void`.
- [ ] The stub implementation advances the request through all 8 status stages using `setTimeout` chains with realistic delays (approximately 1–2 s per stage, matching frontend mock cadence).
- [ ] After each stage transition, `upsertRequest` is called to persist the new status and populate stub `research`/`outreach` payloads at the appropriate stages.
- [ ] After each stage transition, any registered SSE listeners for that `id` receive the corresponding event.
- [ ] A `// TODO Track B: replace with real Claude Agent SDK call` comment is present at the top of the dispatch function body.
- [ ] The function signature is documented with a JSDoc comment describing the expected interface for Track B.

---

## UX notes

This is an API server with no user-facing UI. The UX surface is the wire protocol consumed by the frontend. Key behavioral notes for the frontend integration team:

- The SSE stream should be opened immediately after `POST /requests` returns, using the returned `id`.
- The frontend should re-render request status after each received SSE event without requiring a full `GET /requests/:id` re-fetch — event payloads carry the updated status and any newly populated packet fields.
- When an SSE connection closes with a `request.ready` event, the frontend should do one final `GET /requests/:id` fetch to get the full populated packets for rendering.
- `GET /requests` is intended for the left rail summary list; it must not return full research/outreach payloads to avoid over-fetching.

---

## Server-side type model

The server duplicates frontend types with one material difference: `RequestStatus`.

```typescript
// server/src/types.ts

export type Channel = 'email' | 'linkedin' | 'x_dm';
export type Tone = 'respectful' | 'direct' | 'warm';
export type GoalType = 'sell' | 'partnership' | 'fundraise' | 'hire' | 'advice';
export type ResearchFocus =
  | 'person_background'
  | 'service_surface'
  | 'investment_thesis'
  | 'recent_signals'
  | 'objections';

// SERVER-SIDE: 8 states instead of frontend's 2-state 'running' | 'ready'
export type RequestStatus =
  | 'queued'
  | 'parsing'
  | 'resolving'
  | 'researching'
  | 'synthesizing'
  | 'drafting'
  | 'ready'
  | 'failed';

export type RunStageStatus = 'queued' | 'running' | 'done';

export interface RequestInput {
  targetBrief: string;
  objective: string;
  offer: string;
  preferredChannel: Channel;
  tone: Tone;
  goalType: GoalType;
  focuses: ResearchFocus[];
}

export interface RunStage {
  key: 'parse' | 'resolve' | 'research' | 'synthesize' | 'draft';
  label: string;
  detail: string;
  status: RunStageStatus;
}

export interface EvidenceItem {
  id: string;
  claim: string;
  sourceType: 'Public web' | 'User brief' | 'Inference';
  sourceLabel: string;
  confidence: 'High' | 'Medium';
  usedFor: string;
}

export interface ResearchCard {
  title: string;
  body: string;
  bullets: string[];
}

export interface ResearchPacket {
  person: string;
  organization: string;
  surface: string;
  summary: string;
  whyThisTarget: string[];
  contextCards: ResearchCard[];
  recommendedAngle: {
    headline: string;
    rationale: string;
    mention: string[];
    avoid: string[];
  };
  evidence: EvidenceItem[];
}

export interface Deliverable {
  title: string;
  summary: string;
  subjects?: string[];
  body: string;
  followUp: string;
}

export interface OutreachPacket {
  email: Deliverable;
  linkedin: Deliverable;
  x_dm: Deliverable;
}

export interface DiligenceRequest {
  id: string;
  title: string;
  status: RequestStatus;
  createdAt: string;      // ISO-8601
  updatedAt: string;      // ISO-8601
  input: RequestInput;
  parsedHints: string[];
  run: RunStage[];
  research?: ResearchPacket;
  outreach?: OutreachPacket;
}

// Narrow list shape returned by GET /requests
export interface RequestSummary {
  id: string;
  title: string;
  status: RequestStatus;
  parsedHints: string[];
  preferredChannel: Channel;
  updatedAt: string;
}
```

---

## API endpoint specifications

### `POST /requests`

**Request**

```
POST /requests
Content-Type: application/json

{
  "targetBrief": "yc로 유명한 pg인데 그가 만든 서비스 중 하나인 hacker news와 비즈니스를 하고싶음",
  "objective": "검색이나 아카이브 탐색 쪽으로 business wedge를 찾고 싶다",
  "offer": "We build hosted search that can be embedded quickly, with ranking controls and analytics.",
  "preferredChannel": "email",
  "tone": "respectful",
  "goalType": "sell",
  "focuses": ["person_background", "service_surface", "objections"]
}
```

**Success response — HTTP 201**

```json
{
  "id": "req_k3m9x2",
  "status": "queued",
  "createdAt": "2026-02-28T10:37:44.000Z"
}
```

**Error responses**

| Condition | Status | Body |
|---|---|---|
| Missing required field | 400 | `{ "error": "targetBrief is required" }` |
| Invalid enum value | 400 | `{ "error": "preferredChannel must be one of email, linkedin, x_dm" }` |
| Malformed JSON | 400 | `{ "error": "invalid json" }` |

---

### `GET /requests`

**Request**

```
GET /requests
```

**Success response — HTTP 200**

```json
[
  {
    "id": "req_k3m9x2",
    "title": "Paul Graham / Hacker News",
    "status": "ready",
    "parsedHints": ["PG", "Hacker News", "search"],
    "preferredChannel": "email",
    "updatedAt": "2026-02-28T10:38:50.000Z"
  }
]
```

Returns `[]` when no records exist.

---

### `GET /requests/:id`

**Request**

```
GET /requests/req_k3m9x2
```

**Success response — HTTP 200**

Full `DiligenceRequest` object. `research` and `outreach` are present only when status is `synthesizing`/`drafting`/`ready` respectively; they are absent (not null) when not yet populated.

**Error response — HTTP 404**

```json
{ "error": "not found" }
```

---

### `GET /requests/:id/events` (SSE)

**Request**

```
GET /requests/req_k3m9x2/events
Accept: text/event-stream
```

**Response headers**

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

See SSE Event Format section below.

**Error response — HTTP 404 (plain text)**

```
not found
```

---

### `POST /requests/:id/redraft`

**Request**

```
POST /requests/req_k3m9x2/redraft
Content-Type: application/json

{
  "tone": "direct",
  "preferredChannel": "linkedin"
}
```

At least one of `tone` or `preferredChannel` must be present.

**Success response — HTTP 202**

```json
{
  "id": "req_k3m9x2",
  "status": "drafting",
  "updatedAt": "2026-02-28T10:45:00.000Z"
}
```

**Error responses**

| Condition | Status | Body |
|---|---|---|
| Unknown ID | 404 | `{ "error": "not found" }` |
| Status is not `ready` | 400 | `{ "error": "request not ready" }` |
| No fields provided | 400 | `{ "error": "tone or preferredChannel required" }` |

---

### `GET /health`

**Request**

```
GET /health
```

**Success response — HTTP 200**

```json
{ "ok": true }
```

---

## SSE event format

Each event follows the standard SSE wire format:

```
id: <monotonic integer>\n
event: <event-type>\n
data: <JSON string>\n
\n
```

### Event types and payloads

| Event name | Emitted when | Data payload |
|---|---|---|
| `request.parsing` | Worker begins parsing the brief | `{ "id": "req_...", "status": "parsing" }` |
| `request.resolved` | Target identity resolved | `{ "id": "req_...", "status": "resolving", "parsedHints": [...] }` |
| `request.researching` | Research phase begins | `{ "id": "req_...", "status": "researching" }` |
| `request.synthesized` | Research packet ready | `{ "id": "req_...", "status": "synthesizing", "research": ResearchPacket }` |
| `request.drafted` | Outreach packet ready | `{ "id": "req_...", "status": "drafting", "outreach": OutreachPacket }` |
| `request.ready` | All stages complete | `{ "id": "req_...", "status": "ready" }` |
| `request.failed` | Any stage fails | `{ "id": "req_...", "status": "failed", "error": "string describing failure" }` |

### Example stream

```
: ping

id: 1
event: request.parsing
data: {"id":"req_k3m9x2","status":"parsing"}

id: 2
event: request.resolved
data: {"id":"req_k3m9x2","status":"resolving","parsedHints":["PG","Hacker News","search"]}

id: 3
event: request.researching
data: {"id":"req_k3m9x2","status":"researching"}

id: 4
event: request.synthesized
data: {"id":"req_k3m9x2","status":"synthesizing","research":{...}}

id: 5
event: request.drafted
data: {"id":"req_k3m9x2","status":"drafting","outreach":{...}}

id: 6
event: request.ready
data: {"id":"req_k3m9x2","status":"ready"}
```

After the final event (`request.ready` or `request.failed`), the server closes the response stream.

---

## Edge cases

### Duplicate submissions

The server generates a new unique ID per `POST /requests` call. Two identical brief texts submitted simultaneously produce two independent requests with separate IDs. No deduplication is performed at the MVP stage.

### SSE connection for a request that is already `ready`

If a client opens an SSE stream for a request that has already reached `ready` status (e.g., client reconnects after disconnect), the server should immediately emit `request.ready` and close the stream rather than waiting indefinitely.

### SSE connection for a request that is already `failed`

Same behavior as above — immediately emit `request.failed` with the stored error string and close.

### Redraft while a redraft is in progress

If `POST /requests/:id/redraft` is called on a request whose status is `drafting` (a prior redraft is in flight), the server returns `400 { "error": "request not ready" }`. The status gate (`ready` only) enforces this.

### Worker timer fires after SSE client disconnects

The dispatch stub's `setTimeout` chain continues to run and persists state to SQLite. Only the SSE write to the closed connection is skipped. The request reaches `ready` status in the DB regardless of whether anyone is listening. Subsequent `GET /requests/:id` calls return the correct final state.

### Database file missing on startup

If `DB_PATH` does not exist, `better-sqlite3` creates the file automatically. The `CREATE TABLE IF NOT EXISTS` statement runs at startup so a fresh DB is always ready.

### Invalid `focuses` values

Array items that are not valid `ResearchFocus` strings should return `400` with an error listing the invalid values. An empty `focuses` array `[]` is valid.

### Concurrent reads during write

SQLite WAL mode is required (see A8) to allow concurrent reads while a write is in progress. The synchronous better-sqlite3 API ensures no race conditions within a single Node process.

### Very large brief text

`targetBrief` and `objective` are stored as-is in the JSON blob. No length validation is required at MVP. The SQLite TEXT column has no length limit.

---

## Security / privacy / compliance

- **No authentication.** This is an MVP running on localhost. Adding auth is explicitly out of scope.
- **CORS: `*` in dev.** The `Access-Control-Allow-Origin: *` header is set for all routes. In production this must be restricted to the frontend origin. A `CORS_ORIGIN` env var should be respected when present.
- **No user data encryption.** Brief text is stored in plaintext SQLite. For production, field-level encryption of `targetBrief`, `objective`, and `offer` should be considered as these fields contain potentially sensitive prospect intelligence.
- **No PII handling obligations at MVP.** The tool is for internal use by the operator. No user accounts, no third-party data sharing.
- **Input sanitization.** All string inputs are stored verbatim and returned as JSON. No HTML rendering on the server side, so XSS risk is confined to the frontend.
- **SQLite file permissions.** The `server/data/` directory should not be world-readable. A `.gitignore` entry for `server/data/*.db` must be present to prevent accidental DB commits.

---

## File structure

```
server/
  package.json
  tsconfig.json
  src/
    index.ts          — Hono app bootstrap, port binding, CORS middleware
    types.ts          — Domain types (A2)
    db.ts             — SQLite init, getRequest, listRequests, upsertRequest (A8)
    routes/
      requests.ts     — POST /requests, GET /requests, GET /requests/:id (A3, A4, A5)
      events.ts       — GET /requests/:id/events SSE handler (A6)
      redraft.ts      — POST /requests/:id/redraft (A7)
    worker.ts         — dispatchWorker, dispatchDraftStep stubs (A9)
  data/               — SQLite DB file created here at runtime
    .gitkeep
```

---

## Open questions

**OQ-1 — SSE fan-out mechanism.**
Multiple SSE clients connecting to the same `id` require a shared in-memory listener registry. For the stub (single process, no real concurrency) a `Map<string, Set<WritableStream>>` pattern is sufficient. This becomes a problem if the server is horizontally scaled; a Redis pub/sub channel per request ID would be needed then. Assumption for MVP: single process only.

**OQ-2 — Stub research/outreach payloads.**
When the worker stub advances to `synthesized` and `drafted` stages, it needs to write plausible `research` and `outreach` blobs to SQLite and emit them via SSE. Should the stub reuse the seeded case data from `src/data/sampleCases.ts`? Assumption: yes, copy the PG/HN sample data into `server/src/stubs.ts` for use by the dispatch stub. Track B will replace these with real generated output.

**OQ-3 — Port configuration.**
Default port is assumed to be `3001` (frontend on `3000`). Should this be hardcoded or always require a `PORT` env var? Assumption: default `3001`, overridable via `PORT` env var.

**OQ-4 — `title` field population.**
`DiligenceRequest.title` is shown in the left rail but is not part of `RequestInput`. Assumption: the worker stub sets `title` during the `parsing` stage by extracting the first named entity from `targetBrief` (e.g., "Paul Graham / Hacker News"). Until then, `title` is an empty string or a truncation of `targetBrief` (first 40 chars).

**OQ-5 — `parsedHints` timing.**
`parsedHints` appears in the `GET /requests` summary but is populated by the parse stage. Assumption: it is an empty array `[]` in the initial `queued` record and is populated when the stub advances to `parsing` status.
