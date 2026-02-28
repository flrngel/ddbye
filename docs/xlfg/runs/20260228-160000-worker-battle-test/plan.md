# Plan

## Summary

Battle-test the agent worker against real Anthropic API, fix all issues found, and add integration tests.

## Tasks

- [ ] T1: Run CLI smoke test, capture first-contact failures
- [ ] T2: Fix SDK API mismatches (tools vs allowedTools, error subtypes, env loading)
- [ ] T3: Add Vitest to worker package, write integration tests for all 6 steps + e2e
- [ ] T4: Run full test suite, fix remaining issues
- [ ] T5: Verify (tsc, root vitest, worker vitest, CLI e2e)

## Definition of done

- Worker CLI runs against real API and produces valid WorkerResult JSON
- All integration tests pass with real API
- `tsc --noEmit` passes in both worker/ and root
- Existing 36 root vitest tests still pass
- No regressions

## Verification commands

```bash
cd worker && npx tsc --noEmit                      # Worker type check
cd worker && npx vitest run                        # Worker integration tests
cd .. && npx vitest run                            # Root project tests (36 existing)
cd .. && npx tsc --noEmit                          # Root type check
cd worker && source ../.env && npx tsx src/cli.ts test-fixtures/pg-hn-input.json  # CLI smoke
```
