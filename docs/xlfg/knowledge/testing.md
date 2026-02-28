# Testing

Testing strategies and lessons learned.

## Worker testing

- `tsc --noEmit` is the primary verification (no test runner configured).
- CLI harness (`worker/src/cli.ts`) enables manual smoke testing with `ANTHROPIC_API_KEY`.
- Test fixture at `worker/test-fixtures/pg-hn-input.json` (PG/HN Korean brief).
- Runtime testing requires a valid API key — cannot be automated in CI without secrets.
