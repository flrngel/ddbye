# Security review

## Summary

This review covers the merge of four parallel feature branches (Track A: API server, Track B: research worker, Track C: frontend polish, Track D: quality/CI layer) into main for the Outreach OS project. The codebase adds a real Hono-based API server (`server/`), a Claude Agent SDK worker pipeline (`worker/`), and CI automation on top of an existing frontend-only prototype.

The most significant finding is the use of `allowDangerouslySkipPermissions: true` and `permissionMode: "bypassPermissions"` in the worker agent harness. This is necessary for headless operation but the code comment does not accurately describe the trust boundary. All other findings are P1 or lower. No P0 blockers exist.

---

## Already covered by verification

- TypeScript strict-mode type-checking passes across all three packages (`src/`, `server/`, `worker/`), which eliminates an entire class of runtime type confusion bugs.
- ESLint passes at zero warnings on the merged tree, catching the empty-interface anti-pattern in `Input.tsx` / `Textarea.tsx` before review.
- The `setState`-in-effect fix and ref cleanup fix in `AppContext.tsx` (Track C lint fixes) are purely lifecycle correctness — no security impact.
- Server input validation (enum allowlists for `Channel`, `Tone`, `GoalType`, `ResearchFocus` in `server/src/routes/requests.ts` lines 7–10 and 31–48) is correct and tight.
- SQLite queries in `server/src/db.ts` use parameterized prepared statements throughout (lines 33–38), fully preventing SQL injection.
- The `DB_PATH` validation in `server/src/db.ts` (lines 10–13) prevents path traversal via the `DB_PATH` environment variable.
- CORS enforcement in `server/src/index.ts` (lines 11–17) throws hard if `CORS_ORIGIN` is unset in non-development environments.

---

## Net-new findings

### P0 (blockers)

None.

---

### P1 (important)

**P1-1 — Worker agent: `allowDangerouslySkipPermissions` comment understates the scope**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/worker/src/agent.ts`, lines 35–36

```typescript
permissionMode: "bypassPermissions",
allowDangerouslySkipPermissions: true,
```

The comment on line 32 says "The permission bypass only removes interactive approval prompts, not the tool allowlist." This is partially accurate: `allowedTools` does still constrain which tools are callable. However, `allowDangerouslySkipPermissions: true` also disables any filesystem and shell-level permission prompts that the Claude Agent SDK may enforce for non-web tools in future SDK versions. If a future SDK version introduces a new tool category (e.g., code execution), the bypass flag will silently grant it without any interactive gate.

The actual risk is low while `allowedTools` is correctly set to `["WebSearch", "WebFetch"]` for network steps and `[]` for reasoning steps. But the architecture relies entirely on the `allowedTools` list being correct in every call site. A developer adding a new pipeline step and omitting `allowedTools` (or passing `undefined`) would have no safety net from the permission layer.

Recommendation: Remove `allowDangerouslySkipPermissions: true` if the SDK version in use supports headless operation via `permissionMode: "bypassPermissions"` alone, or add a defensive assertion that `allowedTools` is always explicitly set (never undefined or omitted).

---

**P1-2 — `.gitignore` does not cover environment files or secrets**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.gitignore`

```
node_modules/
dist/
*.local
.DS_Store
.xlfg/
```

`*.local` catches `*.env.local` but does not cover `.env`, `.env.production`, `.env.development`, or any pattern like `*.env`. The worker requires `ANTHROPIC_API_KEY` and the server requires `CORS_ORIGIN` (and optionally `DB_PATH`). If a developer creates a `.env` file at the project root (a common practice with Vite projects), it would not be gitignored and could be committed with a live API key.

Vite itself loads `.env`, `.env.local`, `.env.development`, and `.env.production` automatically. Only `.env.local` and `.env.*.local` are ignored by the current `.gitignore`.

Recommendation: Add `.env` and `.env.*` to `.gitignore`, keeping a carve-out for `.env.example` if a committed example file is desired.

---

**P1-3 — SSE endpoint has no authentication or rate-limiting; request IDs are guessable**

Files:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/server/src/routes/events.ts`, lines 9–68
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/server/src/routes/requests.ts`, line 61

Request IDs are generated as:

```typescript
const id = `req_${crypto.randomBytes(4).toString('hex')}`;
```

Four bytes of randomness yields 2^32 (~4 billion) possible IDs. For a low-traffic prototype this is acceptable, but it is enumerable by a determined attacker. There is no authentication on `GET /requests/:id/events` or `GET /requests/:id`. Any actor who guesses or brute-forces a valid ID can read the full `DiligenceRequest` object — including `targetBrief`, `objective`, `offer`, and the complete research packet.

This is prototype behavior, but if the server is ever exposed to the public internet (e.g., via a tunneling tool during development) it would leak all request data.

Recommendation: Increase ID entropy to at least 16 bytes (`crypto.randomBytes(16)`), and add at minimum a shared-secret header check before this server is deployed beyond localhost.

---

### P2 (minor)

**P2-1 — CI workflow: ESLint and format steps are `continue-on-error: true` in perpetuity**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.github/workflows/ci.yml`, lines 27–35

```yaml
- name: ESLint
  # Expected to fail until Track C fixes src/ issues
  continue-on-error: true
  run: npm run lint:eslint

- name: Format check
  # Expected to fail until Track C fixes src/ issues
  continue-on-error: true
  run: npm run format:check
```

The comment says these are expected to fail "until Track C fixes src/ issues." Track C has been merged and ESLint now passes (verification.md confirms 0 errors, 0 warnings). The `continue-on-error: true` flags should be removed so these steps are actual blockers. Keeping them as non-blocking means a future contributor can introduce XSS-adjacent patterns (e.g., `dangerouslySetInnerHTML`) or `eval` usage and CI will not block the merge.

Recommendation: Remove `continue-on-error: true` from both steps now that the merge is complete.

---

**P2-2 — `localStorage` deserialization does not validate the stored shape**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/src/store/AppContext.tsx`, lines 62–72

```typescript
function loadFromStorage(): DiligenceRequest[] {
  if (typeof window === 'undefined') return seededCases;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return seededCases;
  try {
    const parsed = JSON.parse(raw) as DiligenceRequest[];
    return parsed.length ? parsed : seededCases;
  } catch {
    return seededCases;
  }
}
```

The JSON is cast directly to `DiligenceRequest[]` with no runtime shape check. A malformed or intentionally crafted localStorage value (e.g., injected via a browser extension or XSS on a different origin sharing the storage key name) would be trusted entirely. In a frontend-only prototype, the blast radius is low (the data is only rendered, never executed), but if any future component renders `research.evidence[n].claim` or similar fields via `dangerouslySetInnerHTML` or passes them to `eval`, this becomes an XSS vector.

The current rendering in `Console.tsx` uses React's normal JSX text nodes (e.g., line 519: `{item.claim}`) which are safely escaped by React. The risk is P2 today, but should be tracked.

Recommendation: Add a lightweight runtime validator (a schema check using Zod or a manual field check) before accepting localStorage data. At minimum, verify the array structure and that each element has the expected string fields.

---

**P2-3 — `redraftRequest` in `src/lib/api.ts` sends `channel` instead of `preferredChannel`**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/src/lib/api.ts`, lines 61–73

```typescript
export async function redraftRequest(
  id: string,
  tone: Tone,
  channel: Channel,
): Promise<void> {
  const base = getBase();
  const res = await fetch(`${base}/requests/${encodeURIComponent(id)}/redraft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tone, channel }),
  });
```

The server route (`server/src/routes/redraft.ts`, line 26) reads `preferredChannel` from the body:

```typescript
const { tone, preferredChannel } = body as { tone?: string; preferredChannel?: string };
```

The frontend sends `channel` but the server expects `preferredChannel`. This means the `preferredChannel` update in a redraft operation silently does nothing in API mode. This is a functional bug but has a secondary security implication: the server interprets a missing `preferredChannel` as "no change requested" (line 39: `if (preferredChannel)`) and the state diverges silently. If the server's stored `preferredChannel` is later used to gate content (e.g., in a future production deployment where different channels have different compliance requirements), this silent no-op could be exploited.

Recommendation: Fix the frontend to send `preferredChannel` to match the server contract, or add a server-side alias that also accepts `channel`.

---

**P2-4 — `subscribeToEvents` in `src/lib/api.ts` ignores named SSE event types**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/src/lib/api.ts`, lines 44–59

```typescript
source.onmessage = (e) => {
  try {
    const data = JSON.parse(e.data) as { type: string; payload: unknown };
    onEvent(data);
  } catch {
    // ignore malformed events
  }
};
```

The server emits named SSE events (`event: request.ready`, `event: request.failed`, etc.) via `stream.writeSSE({ event: ... })`. The `EventSource.onmessage` handler only fires for events with no `event:` field (i.e., the default event type). Named events require `source.addEventListener('request.ready', handler)`. This means in API mode, the frontend never receives the terminal `request.ready` or `request.failed` events, leaving requests stuck in the loading state forever.

This is primarily a functional bug, but the security note is that the `inFlightCount` counter in `AppContext` is incremented on submit and decremented only when a terminal SSE event is received. In API mode, the counter leaks upward, which could be used to artificially block the submit button (denial of service against the user's own session if an attacker can force repeated failed requests).

Recommendation: Replace `onmessage` with `addEventListener` calls for each named event type the server emits, or have the server emit all events as unnamed (default) events with a `type` field in the JSON body.

---

**P2-5 — Worker `cli.ts` accepts an arbitrary filesystem path without sanitization**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/worker/src/cli.ts`, lines 6–22

```typescript
const inputPath = process.argv[2];
...
const raw = readFileSync(inputPath, "utf-8");
input = JSON.parse(raw) as RequestInput;
```

The CLI reads any path from `argv[2]` without restriction and parses its contents as `RequestInput` with no runtime validation of the parsed shape. This is a local CLI tool, so the trust model is the operator's own shell. However, if the CLI is ever wrapped in a web endpoint or a CI job that accepts user-supplied paths (e.g., via a webhook), it becomes a local file read vector.

Recommendation: Add a `path.resolve` + bounds check (similar to the `DB_PATH` check in `server/src/db.ts`) and validate the parsed JSON against the `RequestInput` schema (using the Zod schemas already available in the worker package).

---

### P3 (nit)

**P3-1 — Server logs to stdout with `console.error` for non-error events**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/worker/src/cli.ts`, line 24

```typescript
console.error(`[${event.stage}] ${event.status}${detail}`);
```

Progress events (non-errors) are written to stderr. This is a minor operational issue, not a security issue. In a production log aggregation pipeline, stderr is often treated as an error stream, which would create false alert noise.

**P3-2 — `uid()` in `src/logic/mockAgent.ts` uses `Math.random()`**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/src/logic/mockAgent.ts`, lines 37–39

```typescript
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
```

This is mock/frontend-only simulation code and the IDs it produces are never used in a security context (they are not used for authentication or authorization). `Math.random()` is not cryptographically secure but in this context that is not a problem. Noted for completeness only.

---

## Why verification did not catch net-new findings

- **P1-1** (`allowDangerouslySkipPermissions`): TypeScript type-checking and ESLint do not analyze the semantic correctness of SDK configuration flags. The flag is a valid TypeScript value, so no linter catches it.
- **P1-2** (missing `.env` in `.gitignore`): No CI step checks `.gitignore` completeness against known secret file patterns. This is not a linting or type-checking concern.
- **P1-3** (ID entropy and no auth on SSE): Functional tests do not cover threat-model concerns like ID enumeration. Unit tests (`mockAgent.test.ts`, `utils.test.ts`) test behavior, not security properties.
- **P2-1** (`continue-on-error` in CI): The verification run executed the checks manually and confirmed they pass, but did not review whether the CI YAML still marks them as non-blocking.
- **P2-2** (localStorage shape validation): Unit tests cover `mockAgent` and `utils` but not `AppContext`'s deserialization path.
- **P2-3** (`channel` vs `preferredChannel` mismatch): Verification tests ran in mock mode (`isMockMode = true`), so the API code path in `redraftRequest` was never exercised. The mismatch is invisible in mock mode.
- **P2-4** (SSE named event handling): Same reason as P2-3 — mock mode does not use `EventSource` at all.
- **P2-5** (CLI path sanitization): The worker CLI is not tested in any of the 36 unit tests.

---

## Recommended fixes

| Priority | File | Fix |
|----------|------|-----|
| P1-1 | `worker/src/agent.ts` | Evaluate whether `allowDangerouslySkipPermissions` is still needed with the current SDK version. If removable, remove it. If not, add a defensive assertion: `if (!options.allowedTools) throw new WorkerConfigError('allowedTools must be explicitly set')`. |
| P1-2 | `.gitignore` (root) | Add `.env` and `.env.*` entries. Keep `*.local` for Vite's local overrides. |
| P1-3 | `server/src/routes/requests.ts` | Increase ID to `crypto.randomBytes(16).toString('hex')`. Document that the server requires a reverse-proxy with authentication before being exposed beyond localhost. |
| P2-1 | `.github/workflows/ci.yml` | Remove `continue-on-error: true` from the ESLint and format check steps. |
| P2-2 | `src/store/AppContext.tsx` | Add a lightweight shape check in `loadFromStorage()` before trusting the parsed value. |
| P2-3 | `src/lib/api.ts` | Change `JSON.stringify({ tone, channel })` to `JSON.stringify({ tone, preferredChannel: channel })` to match the server contract. |
| P2-4 | `src/lib/api.ts` | Replace `source.onmessage` with `addEventListener` calls for each named event type, or standardize the server to emit unnamed events. |
| P2-5 | `worker/src/cli.ts` | Add `path.resolve` and a schema validation step after JSON.parse using the existing Zod schemas. |
