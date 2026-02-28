# Context

## Raw request
> check save/restore/wait for result frontend & ui. Don't over test. I have only few minutes left.

## Bugs found
1. Mock mode: refreshing page during a run leaves request stuck as "running" forever (timers lost)
2. API mode: refreshing page doesn't re-subscribe to SSE for in-progress requests
3. (Acceptable) Deleting all requests and refreshing restores seeded demos
