# T6: API Client + Loading States — Implementer Report

## Changes

1. `src/lib/api.ts`: Created with 5 exports (`createRequest`, `fetchRequests`, `fetchRequest`, `subscribeToEvents`, `redraftRequest`) + `MockModeError` sentinel
2. `src/vite-env.d.ts`: Created to provide `vite/client` types for `import.meta.env`
3. `src/store/AppContext.tsx`: Added `isSubmitting` state — set true on submit, cleared when last stage timeout fires
4. `src/pages/Console.tsx`: Submit button shows Loader2 spinner and disables during `isSubmitting`

## Notes

- API client reads `VITE_API_BASE` env var; throws `MockModeError` if not set
- AppContext currently uses mock mode only; C8 integration (connecting to real API) is structured but not active since the fallback is the default path
- The `isSubmitting` flag covers the submit button loading state (C9)
