# Spec

## Problem
Page refresh during an in-progress run leaves requests stuck in "running" state.

## Acceptance criteria
- [ ] Mock mode: refreshing during a run marks the request as "failed" with a retry-friendly message
- [ ] API mode: refreshing re-subscribes to SSE for any running requests
- [ ] tsc --noEmit passes
- [ ] vite build passes
