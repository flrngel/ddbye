# Security review

## Summary

This review covers the seven files changed or introduced by the frontend-polish track (Track C):
`src/types.ts`, `src/components/ui/Badge.tsx`, `src/store/AppContext.tsx`, `src/pages/Console.tsx`,
`src/lib/api.ts`, `src/vite-env.d.ts`, `index.html`.

The application is a frontend-only prototype. In mock mode nothing leaves the browser. The new API
client (`src/lib/api.ts`) introduces the first code path that reaches a real server, which is where
most findings concentrate. All JSX rendering is handled via React's default text-node escaping; no
`dangerouslySetInnerHTML` is used anywhere in the reviewed files. The overall security posture is
reasonable for a prototype, with three issues that should be resolved before production use.

---

## Already covered by verification

- TypeScript strict mode (zero errors) ensures no implicit `any` weakens type safety for values that
  cross the API boundary at compile time.
- Production build passes, confirming `import.meta.env.VITE_API_BASE` is correctly tree-shaken as a
  compile-time constant and not leaked as a runtime global.
- The spec explicitly states: "No PII is logged to `console` by any new code introduced in this
  track." The implementation is consistent with that requirement — no `console.log` calls appear in
  any of the reviewed files.

---

## Net-new findings

### P0 (blockers)

None identified for the current frontend-only scope. The issues below become blockers when a real
backend is connected.

---

### P1 (important)

**P1-1 — `VITE_API_BASE` is accepted without origin validation; arbitrary server SSRF is possible**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/lib/api.ts`, lines 12-15 and 21, 32, 38, 49, 67.

```typescript
// src/lib/api.ts  lines 12-15
function getBase(): string {
  if (!API_BASE) throw new MockModeError();
  return API_BASE.replace(/\/$/, '');   // trailing-slash strip only — no scheme or host check
}
```

`VITE_API_BASE` is baked into the bundle at build time by Vite. At that point it is a developer-
controlled value, so SSRF via this variable is a build-time concern, not a runtime one. However:

1. If the build pipeline ever lets `VITE_API_BASE` be set from untrusted CI variables or a user-
   facing configuration surface (e.g. a `.env` file committed to the repo, a deploy-preview
   environment override), a malicious value such as `http://169.254.169.254/` (cloud metadata
   endpoint) or `file://` could redirect all five fetch/EventSource calls to an unintended origin.
2. `EventSource` in particular will silently follow 3xx redirects, potentially landing on a
   different origin than the build-time value implies.

Recommendation: add an origin allow-list check in `getBase()`:

```typescript
function getBase(): string {
  if (!API_BASE) throw new MockModeError();
  const trimmed = API_BASE.replace(/\/$/, '');
  try {
    const url = new URL(trimmed);
    if (!['https:', 'http:'].includes(url.protocol)) {
      throw new Error(`Disallowed API_BASE protocol: ${url.protocol}`);
    }
    // Optionally: assert url.hostname matches an allowlist
  } catch {
    throw new Error('VITE_API_BASE is not a valid URL');
  }
  return trimmed;
}
```

At minimum, the `https:` scheme should be enforced for production builds.

---

**P1-2 — API responses are cast directly to domain types without runtime validation**

Files:
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/lib/api.ts`, lines 27, 34, 41.
- `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/store/AppContext.tsx`, lines 102-104, 184-185.

```typescript
// src/lib/api.ts  line 27
return res.json();   // cast to { id: string; status: string; createdAt: string } — no validation

// src/lib/api.ts  line 34
return res.json();   // cast to DiligenceRequest[] — no validation

// src/lib/api.ts  line 41
return res.json();   // cast to DiligenceRequest — no validation
```

TypeScript's type assertions are erased at runtime. A malicious or misconfigured backend could
return a payload that satisfies TypeScript at compile time but contains:

- Unexpected HTML or script strings in `DiligenceRequest.errorMessage`, `ResearchCard.body`,
  `Deliverable.body`, `EvidenceItem.claim`, etc.
- An `id` that is a relative path segment, exploitable in URL construction elsewhere.
- A `status` value outside `'running' | 'ready' | 'failed'`, causing the UI to enter an undefined
  render branch.

Because all string fields from these responses are rendered through React's JSX text nodes (not
`innerHTML`), stored XSS via crafted string content is **not** directly exploitable in the current
UI. However, without validation:

- Prototype pollution or unexpected type coercions remain possible if the payload shape deviates
  widely from `DiligenceRequest`.
- A future developer adding `dangerouslySetInnerHTML` to render `Deliverable.body` with newline
  formatting would immediately become vulnerable.

Recommendation: add a lightweight runtime schema check (even a hand-rolled guard function) before
assigning API payloads to state. For example, assert `typeof data.id === 'string'` and
`['running','ready','failed'].includes(data.status)` before returning from `fetchRequest`.

---

**P1-3 — SSE `onmessage` parses arbitrary JSON with no event-type allowlist**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/lib/api.ts`, lines 50-56.

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

And in `AppContext.tsx` lines 183-199 the handler acts on `event.type`:

```typescript
if (event.type === 'request.ready' || event.type === 'request.failed') {
  api.fetchRequest(id).then((full) => {
    setRequests((current) => current.map((r) => (r.id === id ? full : r)));
    ...
  });
} else {
  // any other event type causes advanceRun
  setRequests((current) =>
    current.map((r) => {
      if (r.id !== id) return r;
      return { ...r, run: advanceRun(r.run), updatedAt: new Date().toISOString() };
    }),
  );
}
```

The `else` branch advances the run stage for **any** unrecognized event type. A server that sends
spurious or unexpected events would silently corrupt the local run-stage array. More importantly,
`EventSource` connections are same-origin-policy-exempt in the sense that the browser will connect
to whatever URL is given; if the SSE endpoint is ever on a third-party CDN or a URL that can be
influenced, events from that endpoint will be trusted unconditionally.

Recommendation:

1. Add an explicit allowlist of handled event types; treat anything outside it as a no-op rather
   than defaulting to `advanceRun`.
2. Validate that `event.type` is a string before branching on it.

```typescript
const KNOWN_EVENTS = new Set(['request.ready', 'request.failed', 'stage.update']);
if (!KNOWN_EVENTS.has(event.type)) return;
```

---

### P2 (nice to have)

**P2-1 — `localStorage` stores the full `DiligenceRequest[]` including the user's target brief**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/store/AppContext.tsx`, lines 70, 123-125.

```typescript
const STORAGE_KEY = 'outreachos-reset-front';

useEffect(() => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}, [requests]);
```

This is pre-existing behavior (noted in the spec at line 129). The new code does not change it.
However, `requests` now also carries `outreach` packets (`Deliverable.body`) that may contain
individually-identifiable target information generated from web research. Any browser extension,
third-party script on the same origin, or XSS in an unrelated same-origin page could read this.

No code change is strictly required for the prototype, but the team should document this in a
future privacy review before production launch and consider encrypting or expiring stored data.

---

**P2-2 — `request.title` is derived from user-controlled `targetBrief` with `.slice()` only**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/store/AppContext.tsx`, line 216.

```typescript
title: draft.targetBrief.split(/[.!?\n]/)[0].trim().slice(0, 48),
```

The derived `title` is rendered in the left-rail card at `Console.tsx` line 201:

```tsx
<div className="min-w-0 flex-1 font-rounded text-sm font-bold leading-6 text-neutral-900">
  {request.title}
</div>
```

React renders this as a text node, so XSS is not possible. The finding is only that the truncation
strategy (`slice(0, 48)`) does not strip HTML special characters or Unicode control characters. If
this field were ever moved into an `href`, a tooltip `title` attribute constructed via string
concatenation, or `dangerouslySetInnerHTML`, the raw user input could become dangerous. Flag for
awareness in future refactors.

---

**P2-3 — `errorMessage` from `DiligenceRequest` is rendered without sanitization**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx`, line 407.

```tsx
{selectedRequest.errorMessage ?? 'The run failed. You can retry with the same brief.'}
```

In mock mode `errorMessage` is always `undefined` (the mock agent never sets it). In API mode it
would come from `fetchRequest()`, which as noted in P1-2 performs no runtime validation. If the
backend ever returns an `errorMessage` containing HTML tags, React's JSX text node rendering will
show them as literal text — not execute them — so XSS is not immediately possible. The risk is the
same as P2-2: note for future reviewers that this field flows from the API without sanitization, and
any future change to render it as HTML would be immediately exploitable.

---

**P2-4 — No `credentials` or `mode` set on `fetch` calls; CORS behavior depends entirely on server configuration**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/lib/api.ts`, lines 21-26, 31-34, 37-41, 61-73.

The spec states "no auth header is added by the client module in this iteration." Consequently all
five API calls use the default `credentials: 'same-origin'` and `mode: 'cors'` settings. This is
correct for a same-origin API but means:

- If `VITE_API_BASE` points to a cross-origin server, cookies will **not** be sent (correct
  behavior for a cookieless API, but worth confirming with the backend team).
- If the backend later adds cookie-based authentication and the team changes `credentials` to
  `'include'`, CSRF protection will need to be added on every mutating endpoint (`POST /requests`,
  `POST /requests/:id/redraft`).

No immediate fix required; document the assumption that the API is stateless and cookieless.

---

## Why verification did not catch net-new findings

The verification step ran `tsc --noEmit` and `npm run build`. These tools:

- Confirm type correctness at the TypeScript level, but TypeScript types are erased at runtime.
  Runtime coercion of API response shapes (P1-2) cannot be detected by the type checker because
  `res.json()` returns `Promise<any>` and the cast is implicit.
- Do not analyze network request targets or URL construction logic (P1-1).
- Do not analyze event-processing control flow for unintended branches (P1-3).
- Do not include a content security policy linter, a dependency audit, or any runtime/integration
  test, so storage and SSE concerns (P2-1 through P2-4) are outside scope.

---

## Recommended fixes

| ID | File | Action |
|---|---|---|
| P1-1 | `src/lib/api.ts` `getBase()` | Add `new URL(trimmed)` validation; throw if protocol is not `https:` (or `http:` only for localhost). |
| P1-2 | `src/lib/api.ts` `fetchRequests`, `fetchRequest`, `createRequest` | Add minimal runtime guards: assert required fields exist and `status` is one of the three known values before returning. |
| P1-3 | `src/store/AppContext.tsx` `subscribeAndHydrate` | Replace the `else` branch with an explicit allowlist check so unknown event types are silently dropped rather than triggering `advanceRun`. |
| P2-1 | `src/store/AppContext.tsx` | Document the localStorage sensitivity in a code comment; plan a TTL or per-session encryption before production. |
| P2-2 | `src/store/AppContext.tsx` | Add a comment warning that `title` contains raw user input; sanitize before use in any non-text-node context. |
| P2-3 | `src/pages/Console.tsx` line 407 | Add a comment that `errorMessage` is unvalidated API content; sanitize if ever moved to HTML context. |
| P2-4 | `src/lib/api.ts` | Add a comment confirming the API is stateless/cookieless; revisit if `credentials: 'include'` is ever added. |
