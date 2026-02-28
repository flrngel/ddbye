# T3: Failed State + Retry — Implementer Report

## Changes

1. `src/store/AppContext.tsx`: Added `retryRequest(id)` — finds existing request input, creates new simulation, removes old failed entry, selects new one
2. `src/pages/Console.tsx`: Added error card when `selectedRequest.status === 'failed'` with AlertTriangle icon, error message, and Retry button
3. Left rail badge shows `failed` variant for failed requests

## Design decisions

- Retry creates a new request (new ID) and removes the old one, matching the spec assumption
- Error card uses `border-red-200 bg-red-50` consistent with the design system
