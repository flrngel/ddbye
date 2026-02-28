# Compound Summary

## What was learned

1. **Timer cleanup is critical for React Context with timeouts.** An append-only `number[]` for timeout IDs creates stale-timer bugs when requests are deleted or redrafted. Use `Map<string, number[]>` keyed by entity ID so cleanup is O(1) per entity.

2. **Vite env vars are build-time constants.** `import.meta.env.VITE_*` is inlined at bundle time — you cannot change it at runtime or in tests. Design mock-mode detection accordingly (check the constant, don't try/catch at runtime).

3. **Accessibility of hover-revealed elements.** `opacity-0` hides elements from keyboard users too. Always pair with `focus-visible:opacity-100` for interactive elements hidden behind hover.

4. **Counter > boolean for concurrent in-flight tracking.** A single `isSubmitting` boolean can't handle concurrent submissions. Use an `inFlightCount` counter or `Set<string>` of in-flight IDs.

## What to reuse

- `MockModeError` sentinel pattern for API client with graceful fallback
- `scheduleProgress` + `clearTimersForRequest` pattern for mock simulation
- Inline form pattern (no modal, glassmorphism style) for secondary actions
- `subscribeAndHydrate(id)` pattern for SSE → hydrate flow

## What to avoid

- Don't use `timeoutsRef.current.push()` without a cleanup strategy per entity
- Don't use `title` attribute as sole accessible name — add `aria-label` explicitly
- Don't skip `role="alert"` on error state containers
