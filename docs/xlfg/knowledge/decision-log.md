# Decision Log

## 2026-02-28: Vite env for mock mode detection
Decided to use `!import.meta.env.VITE_API_BASE` as compile-time mock mode flag. This is correct for Vite (build-time inlining). Runtime detection via try/catch is unnecessary.

## 2026-02-28: inFlightCount over boolean
Replaced `isSubmitting: boolean` with `inFlightCount: number` to handle concurrent submissions without race conditions.
