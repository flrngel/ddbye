# Review Summary — API Server (Track A)

Run: `20260228-103744-api-server`

## Status: PASS (P0s resolved)

## Security review

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| P0-1 | P0 | Wildcard CORS with no production fail-safe | **Fixed** — NODE_ENV gate added, throws in non-dev without CORS_ORIGIN |
| P0-2 | P0 | Arbitrary filesystem path via DB_PATH | **Fixed** — path validation + explicit directory mode 0o700 |
| P1-1 | P1 | No input length limits | Deferred (spec: "No length validation at MVP") |
| P1-2 | P1 | Unbounded focuses array | Deferred (capped to 5 valid values, DoS risk is theoretical) |
| P1-3 | P1 | No rate limiting on worker dispatch | Deferred (MVP, single-user localhost) |
| P1-4 | P1 | SSE listener registry unbounded | Deferred (MVP, single-user) |
| P1-5 | P1 | No ID format validation | Deferred (parameterized queries prevent injection) |

## Architecture review

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| P1-1 | P1 | Global eventCounter non-persistent | Accepted (MVP, SSE replay not required) |
| P1-2 | P1 | Polling interval in SSE keep-alive | Accepted (sufficient for stub, Track B may revisit) |
| P1-3 | P1 | Hardcoded PG/HN stub data | By design (TODO Track B marker present) |
| P1-4 | P1 | dispatchDraftStep skips request.drafted event | Accepted (stub behavior, Track B will fix) |
| P1-5 | P1 | Duplicated validation arrays | Accepted (minor, 2 files) |
| P1-6 | P1 | Top-level DB side effects | Accepted (MVP pattern, DI can come with Track B) |

## Conclusion

Both P0 security blockers resolved. All P1 findings are either deferred to Track B, accepted for MVP scope, or addressed by design (stub behavior with TODO markers). No remaining blockers.
