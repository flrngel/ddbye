# Review Summary — Merge Worktrees

## Reviews conducted
- Architecture review: 2 P0 + 5 P1 + 5 P2
- Security review: 0 P0 + 3 P1 + 5 P2 + 2 P3

## P0 blockers (fixed)

### P0-1: SSE named events vs `onmessage` (FIXED)
Server emits named SSE events (`event: request.ready`), but frontend used `source.onmessage` which only catches unnamed events.
**Fix:** Changed `subscribeToEvents()` to use `addEventListener` for all named event types.

### P0-2: Redraft field name mismatch (FIXED)
Frontend sent `{ tone, channel }` but server expects `{ tone, preferredChannel }`.
**Fix:** Changed to `JSON.stringify({ tone, preferredChannel: channel })`.

## P1 issues addressed

### P1-2 (security): `.gitignore` missing `.env` coverage (FIXED)
Added `.env` and `.env.*` patterns to `.gitignore`.

### P2-1 (architecture): Stale CI `continue-on-error` (FIXED)
Removed `continue-on-error: true` from ESLint step (now passes). Updated Prettier step comment.

## P1 issues deferred (acceptable for MVP)
- P1-1 (arch): `GET /requests` returns `RequestSummary[]` typed as `DiligenceRequest[]`
- P1-2 (arch): Three copies of domain types with no sync enforcement
- P1-3 (arch): Server worker hardcodes PG/HN stub data
- P1-4 (arch): CI doesn't type-check server/ or worker/
- P1-5 (arch): Unsound `status as DiligenceRequest['status']` casts
- P1-1 (sec): Worker `allowDangerouslySkipPermissions` flag
- P1-3 (sec): SSE endpoint has no auth, request IDs have low entropy

## Verdict
All P0 blockers fixed. No remaining P0 issues. Ship is green.
