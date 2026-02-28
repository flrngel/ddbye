# UX Review

## Summary

The frontend polish run delivers a solid baseline for all six visible workflow states (empty, loading, queued, running with stage detail, ready, failed). The happy path is coherent and the copy is clear. Several accessibility and interaction quality gaps exist that the automated checker — which focused on TypeScript correctness and spec-criterion completeness — was not positioned to surface. Three of those gaps are rated P0 or P1.

Screenshots and a smoke-test checklist are requested at the end of this document because no visual evidence was included with the run.

---

## Already Covered by Verification

The combined checker report (`tasks/checker-report-combined.md`) covers the following UX-adjacent points:

- Empty state copy text matches spec exactly (left rail, Research board, Outreach studio).
- Failed error card has icon, message, and Retry button.
- Left rail badge uses `failed` variant (red token set) for failed requests.
- Delete trash button is hover-revealed via `opacity-0 group-hover:opacity-100` and stop-propagation is present.
- Redraft inline form pre-populates tone and channel from `selectedRequest.input`.
- Submit button shows a spinner and is disabled while `isSubmitting` is true.
- Research board badge in the SectionCard action slot ignores `failed` status (checker finding 7 — flagged as nice-to-have).
- Generate button has no explicit `isRedrafting` guard (checker finding 6).
- `retryRequest` does not set `isSubmitting`, so the submit button stays enabled during a retry run (checker finding 4).

---

## Net-New Findings

### P0 (Blockers)

**P0-1 — Trash icon is the sole delete affordance and is inaccessible to keyboard users**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx` lines 214–221

The delete button is hidden by default (`opacity-0`) and only revealed on pointer hover via `group-hover:opacity-100`. A keyboard user who tabs to a request card has no way to discover or reach the trash button because:

1. The button receives focus but is visually invisible at `opacity: 0` — there is no `:focus-visible` rule that overrides the opacity.
2. Nothing in the card communicates that a delete action exists at all.

This blocks the entire delete workflow for keyboard-only users and screen reader users who navigate by tab.

Suggested fix: add `focus-within:opacity-100` to the delete button's class list alongside `group-hover:opacity-100`. Also add a visible focus ring: `focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none`.

```tsx
// Current (line 216):
className="absolute right-3 top-3 rounded-xl p-1.5 text-neutral-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"

// Suggested:
className="absolute right-3 top-3 rounded-xl p-1.5 text-neutral-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
```

---

**P0-2 — Delete button has no accessible name beyond `title` attribute**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx` line 218

The trash button uses `title="Delete request"`. The `title` attribute is announced by some screen readers but is not reliably exposed in all AT/browser combinations and does not satisfy WCAG 4.1.2 (Name, Role, Value). It provides no label to users of VoiceOver on iOS or TalkBack on Android.

Suggested fix: add `aria-label="Delete request"` explicitly. The `title` can remain as a tooltip for sighted mouse users.

```tsx
// Add aria-label:
<button
  onClick={(e) => { e.stopPropagation(); deleteRequest(request.id); }}
  aria-label="Delete request"
  title="Delete request"
  className="..."
>
```

---

### P1 (Important)

**P1-1 — Channel tab switcher in Outreach studio header has no keyboard or screen reader semantics**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx` lines 541–568

The three channel buttons (Email, LinkedIn, X DM) in the Outreach studio header act as a single-select tab group but are implemented as plain `<button>` elements with no ARIA roles. There is no `role="tablist"` on the container, no `role="tab"` on each button, and no `aria-selected` attribute toggling based on `outputChannel`. Screen reader users cannot tell that these are tabs, which tab is active, or that they control the panel content below.

Suggested fix: add `role="tablist"` to the container `div`, `role="tab"` and `aria-selected={outputChannel === option}` to each button. The deliverable content area below should get `role="tabpanel"`.

---

**P1-2 — Intake form pill-tab selectors (Deliverable, Goal type, Tone) have no ARIA selection state**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx` lines 288–344

The pill tabs in the intake form use visual-only selection state (white background with shadow-sm vs muted text). No `aria-pressed` or `aria-checked` is set on the active option. A screen reader user navigating the form will hear button labels but cannot determine which option is currently selected.

This affects all three selectors: Deliverable (channel), Goal type, and Tone. The Research focus toggle pills (lines 350–367) have the same problem.

Suggested fix: add `aria-pressed={draft.preferredChannel === option.value}` (or whichever field corresponds) to each pill button. For a tab-group pattern, use `aria-selected` with `role="tab"`.

---

**P1-3 — Redraft inline form has no focus management when it opens or closes**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx` lines 590–666

When the user clicks "Redraft", `showRedraft` becomes `true` and the form renders. Focus remains on the Redraft button, which is now hidden (conditional render: the button only renders when `!showRedraft`). The user must manually tab through the page to find the newly rendered form. Similarly, when Cancel or Generate closes the form, focus is lost entirely.

This creates a confusing experience for keyboard users and fails WCAG 2.4.3 (Focus Order).

Suggested fix: use a `useRef` + `useEffect` pattern to move focus to the first interactive element in the redraft form when it mounts, and return focus to the Redraft button (or the closest equivalent) when it closes.

---

**P1-4 — Outreach studio shows channel tabs while a request is in "running" state, but tab switching has no effect on the progress view**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx` lines 536–675

When `selectedRequest.status === 'running'`, the Outreach studio renders the progress cards (lines 571–586). However, the three channel tab buttons in the SectionCard action slot are still rendered and focusable — they just have no visible effect on the running state view. A user clicking "LinkedIn" or "X DM" during a run sees nothing change and gets no feedback. This is a confusing dead interaction.

Suggested fix: either hide the channel tabs entirely while running (since they serve no purpose in that state), or disable them with `disabled` and `aria-disabled="true"` so users understand they are temporarily unavailable.

---

**P1-5 — Error card "Run failed" heading is not announced as a heading or alert to screen readers**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx` lines 402–412

The error card (lines 401–413) is rendered as a plain `<div>` with no ARIA landmark or live region. When a request transitions to the `failed` state — either on page load from localStorage or dynamically during a session — a screen reader user navigating the page will not be automatically notified that a failure has occurred. They may not discover the Retry button unless they read through all content.

Suggested fix: add `role="alert"` to the error card container div. This causes screen readers to announce the content automatically when it appears in the DOM.

```tsx
// Line 402:
<div className="rounded-[24px] border border-red-200 bg-red-50 p-5" role="alert">
```

---

**P1-6 — "Resolving..." placeholder text in the Person / Organization / Surface cards is indistinguishable from final content to screen readers**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx` lines 419, 424, 430

While a request is running, `selectedRequest.research?.person ?? 'Resolving...'` produces the string "Resolving..." as the text content of a `div` with `font-rounded text-base font-bold` — visually it looks like content is loading, but the bold style applied to placeholder text makes it look identical to populated data in terms of visual weight. Screen readers will read "Resolving..." as if it were a resolved name.

Additionally, there is no `aria-live` region to announce when the placeholder is replaced by real data.

Suggested fix: wrap the placeholder text in a `<span aria-label="loading">` or use `aria-busy="true"` on the card container while research is null, switching to `aria-busy="false"` when data arrives.

---

### P2 (Nice to Have)

**P2-1 — Loading spinner in left rail uses Loader2 (an SVG icon) rather than the spec-specified CSS-only spinner**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx` line 179

The spec (C9) states: "Spinners use only Tailwind utility classes (`animate-spin`, `border`, etc.) — no new component library." The implementation uses `<Loader2 className="h-5 w-5 animate-spin text-neutral-400" />` from lucide-react. Lucide is already a dependency, so no new library is added, but the spec intent was a native border-based CSS spinner. Minor spec deviation.

Suggested copy: `<div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-500 rounded-full animate-spin" />` with `aria-label="Loading"`.

---

**P2-2 — "What changed" card in the left rail sidebar is always visible and takes up permanent space**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx` lines 164–169

The "What changed" explanatory card (lines 164–169) occupies approximately 80px of vertical space in the left rail at all times. On a smaller viewport this competes with the requests list. This card is presumably a prototype-only design annotation. If it is intended to remain in the shipped UI, it should be dismissible (e.g., localStorage-persisted collapsed state). If it is prototype scaffolding, it should be removed before GA.

---

**P2-3 — "Run due diligence" button label does not change to reflect the current stage during mock-mode simulation**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx` lines 377–389

While `isSubmitting` is true, the submit button reads "Running..." with a spinner. This is accurate but generic. The current stage label (e.g., "Parsing brief") is available via `selectedRequest?.run.find(s => s.status === 'running')?.label`. Surfacing it in the button or in a small status line beneath would reinforce that work is progressing and reduce perceived wait anxiety during the 5-second simulation. This is polish-level only.

---

**P2-4 — No empty state within the Redraft channel selector when no outreach packet exists**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx` lines 587–674

The Outreach studio renders the channel tabs in the header action slot unconditionally (they are part of the `SectionCard` action prop at lines 539–569). If the component renders before `outreach` is set (i.e., the request is in an intermediate state where `status === 'ready'` but `outreach` is somehow undefined), the channel tabs appear but the panel shows the fallback empty state. The `deliverable` memoization guards against `undefined` outreach correctly, but the tab chrome above remains misleadingly active. Low probability scenario in practice, but worth guarding explicitly.

---

**P2-5 — Relative timestamp `title` attribute uses raw ISO string format, not a localized representation**

File: `/Users/flrngel/project/personal/hack/2026-portland-claude-code/ddbye/.worktree/feat-track-c/src/pages/Console.tsx` line 211

```tsx
<span title={request.updatedAt}>{formatRelativeTime(request.updatedAt)}</span>
```

The `title` tooltip shown on hover of the relative timestamp is the raw ISO string (e.g., `2026-02-28T10:37:35.000Z`). Most users do not parse ISO timestamps intuitively. A localized `toLocaleString()` format would be more user-friendly. Minor polish.

---

## Why Verification Did Not Catch Net-New Findings

The checker operated against typed TypeScript correctness (`tsc --noEmit`) and spec acceptance criteria (C1–C9). Its mandate was to verify that specific named behaviors were implemented. It was not scoped to:

1. **ARIA semantics and role assignments** — TypeScript does not enforce ARIA correctness. Incorrect or missing `role`, `aria-selected`, `aria-pressed`, `aria-label`, and `role="alert"` attributes compile without errors.
2. **Focus management flows** — The checker inspected static code paths, not the runtime sequence of DOM focus events triggered by conditional renders. Focus traps and focus restoration on mount/unmount are behavioral contracts that require runtime observation.
3. **Interaction states that are non-functional rather than absent** — The channel tabs remaining active during a running state are present in the DOM and do not violate any TypeScript type or spec criterion; they simply produce confusing null interactions.
4. **Screen reader announcement patterns** — `role="alert"` on the error card and `aria-live` on placeholder text are accessibility patterns that sit outside the spec's acceptance criteria list and are invisible to a lint/build check.
5. **Sensory experience of opacity-hidden interactive elements** — The trash button's `opacity-0` state is a valid Tailwind class. The checker confirmed its presence. The keyboard focus gap it creates is only visible when exercising the element with a keyboard and inspecting the visual focus state.

---

## Suggested UX Acceptance Criteria

The following criteria should be added to the spec or to a future accessibility checklist before shipping:

- [ ] Every interactive element that is conditionally hidden (opacity-0 or display-none) must be discoverable and operable by keyboard: either via `:focus-visible` override or by rendering only when reachable.
- [ ] Every `<button>` that has no visible text label must carry an `aria-label` attribute.
- [ ] Single-select pill tab groups (Deliverable, Tone, Goal type, channel switcher) must expose `aria-pressed` or `aria-selected` on the active option.
- [ ] The Outreach studio channel tab group must carry `role="tablist"` and `role="tab"` semantics with `aria-selected` toggling.
- [ ] Dynamic error cards that appear in response to state changes must carry `role="alert"` so screen readers announce them without requiring user navigation.
- [ ] Inline forms that appear and disappear conditionally (Redraft form) must move focus to the first field on open and restore focus to the triggering element on close.
- [ ] Placeholder text rendered while data is loading must be distinguishable from settled content: use `aria-busy`, `aria-label="loading"`, or a visually distinct skeleton pattern.
- [ ] Interactive controls that are contextually irrelevant (channel tabs while running) must be either hidden or explicitly disabled with `aria-disabled="true"`.

---

## Screenshots and Smoke-Test Checklist

No screenshots were provided with this run. Before accepting the visual output of this polish pass, the following manual checks should be documented with screenshots:

1. Open `/console` with no localStorage data cleared. Verify left rail shows the dashed empty state card and the request count badge reads "0".
2. Load the PG example and submit. Verify the submit button disables with spinner, the left rail shows a new card with the active stage label updating from "Parsing brief" through "Drafting copy".
3. After the run completes, verify the Redraft button appears in the Outreach studio and the inline form opens with tone and channel pre-populated to the submitted values.
4. Tab through the entire page with no mouse. Verify the trash button on each request card is reachable and has a visible focus ring when focused.
5. Using a screen reader (VoiceOver on macOS is sufficient for prototype review), navigate to a failed request loaded from localStorage. Verify the error card is announced as an alert and the Retry button is reachable.
6. On a viewport narrower than 1024px (the `lg:` breakpoint), verify the left rail collapses to a horizontal strip and the empty state, loading spinner, and request cards all render without overflow clipping.
