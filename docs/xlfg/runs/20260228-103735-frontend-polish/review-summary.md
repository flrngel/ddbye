# Review Summary

## Reviewers

- Security reviewer
- Architecture reviewer
- UX reviewer

## P0 blockers found and resolved

| Issue | Source | Fix |
|---|---|---|
| Trash button invisible to keyboard users | UX | Added `focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-red-400` + `aria-label` |
| Trash button missing accessible name | UX | Added `aria-label="Delete request"` |
| Failed card not announced by screen readers | UX | Added `role="alert"` |
| Stale timers fire after delete/redraft | Architecture | Changed `timeoutsRef` from append-only array to `Map<string, number[]>`; `clearTimersForRequest(id)` called on delete and redraft |

## P0 assessed but not blocking

| Issue | Source | Assessment |
|---|---|---|
| `isMockMode` is compile-time constant | Architecture | This is correct for Vite — env vars are replaced at build time. The concern about unreachable API is valid but out of scope for this frontend-only track. |

## P1 items deferred (no blockers)

- Security: No URL scheme validation on VITE_API_BASE, no runtime type validation on API responses, SSE else-branch should use allowlist
- Architecture: AppContext god-object should be split, selectedRequest fallback hides empty state, API errors not surfaced to user, EventSource has no onerror handler
- UX: Channel tabs lack ARIA tab semantics, pill selectors lack aria-pressed, redraft form doesn't manage focus, channel tabs clickable when running

All P1s are real issues but none block shipping the prototype. They should be addressed in a follow-up track.

## Status: PASS (no remaining P0 blockers)
