# T2: Core Routes — Implementer Report

## Files created
- `server/src/routes/requests.ts` — POST /requests, GET /requests, GET /requests/:id

## Acceptance criteria met
- [x] POST /requests accepts RequestInput, returns 201 { id, status, createdAt }
- [x] ID prefixed req_ + random hex
- [x] Full DiligenceRequest written to SQLite before response
- [x] dispatchWorker called after persist
- [x] Validates required fields (400 on missing)
- [x] Validates enum values (400 on invalid)
- [x] Validates focuses array items
- [x] GET /requests returns RequestSummary[] sorted by createdAt DESC
- [x] Returns [] when empty (not 404)
- [x] GET /requests/:id returns full DiligenceRequest
- [x] Returns 404 for unknown IDs
