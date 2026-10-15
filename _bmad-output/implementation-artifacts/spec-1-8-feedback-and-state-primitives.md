---
title: 'Story 1.8: Feedback and state primitives'
type: 'feature'
created: '2026-10-15'
status: 'done'
baseline_commit: '74d80e28205104e9ac3913c43515e8de1d9b156d'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: [oversized]
deferred:
  - summary: >-
      The F6 handler, hover/focus pause, `polite` region, `loading.tsx`, the `error.tsx` boundary and the Retry click have no browser or DOM test.
    evidence: |-
      No product code raises a toast or fails a load yet, and Vitest runs in node without jsdom. The first caller (Epic 4) and a jsdom or Playwright trigger make these testable; Sonner's list is `tabIndex=-1` with `aria-live="polite"` on its section (read in `node_modules/sonner`).
    location: >-
      src/components/toast-hotkey.tsx, app/events/error.tsx, app/events/loading.tsx
    severity: medium (unverified)
---

<intent-contract>

## Intent

**Problem:** The app has no shared way to tell a user that something is loading, failed, offline or undoable, so Story 1.8's criteria (UX-DR23, UX-DR24) are unmet and every later epic would invent its own.

**Approach:** Add the primitives once: a toast host with an undo toast (10 s, pause on hover or focus, `polite`, reachable with F6 or Alt+T) and a save-failed toast, a `Skeleton`, a load-failed card with *Retry*, and a single global offline alert. Use the first three where `/events` already gives them a place; later stories call the helpers.

## Boundaries & Constraints

**Always:**
- Read DESIGN.md and EXPERIENCE.md (State Patterns, Interaction Primitives) first. Tokens only, Lucide at stroke 1.75, no emojis, motion 150–250 ms ease-out, reduced motion already handled in `globals.css`. All text in `messages/{nb,en}.json` under `feedback.*`, identical keys.
- Toasts use shadcn `Sonner` (`pnpm dlx shadcn@latest add sonner skeleton`, style `base-nova`). The CLI may add wrong or missing packages (it did for Sheet): fix imports to `@/lib/utils`, add missing dependencies with pnpm, and drop `next-themes` (not installed; the Toaster follows `prefers-color-scheme` through `theme="system"`). One `<Toaster>` in `app/layout.tsx` inside the intl provider; stacked above sticky bars, never over them.
- `src/lib/feedback.ts` (client-safe, no `"use server"`) exports `undoToast(message, onUndo)` and `saveFailedToast(onRetry)`. `undoToast`: `duration: 10000`, an *Undo* action, announced `polite`. `saveFailedToast`: message `feedback.saveFailed` ("Couldn't save. Trying again."), a *Retry* action, exposed as `role="alert"`, and it never clears the caller's input (the caller owns the input). Messages come from the caller already translated; the helpers carry the action labels via next-intl in the caller, so pass labels in as arguments, not by importing next-intl server APIs.
- F6 and Alt+T both move focus into the toast region when a toast exists (Sonner's own `hotkey` handles Alt+T; add the F6 handler, in a small client component `src/components/toast-hotkey.tsx`, prevented from acting inside text inputs only when the toast region is empty). Hovering or focusing a toast pauses its timer (Sonner default; verify, do not reimplement).
- `app/events/loading.tsx` shows `Skeleton`s in the final layout shape of *All events* (the `h1` line plus the empty-state block), with no spinner.
- `src/components/load-error.tsx` is a client component: inline card, `role="alert"`, text `feedback.loadFailed` ("Couldn't load this. Check your connection and try again."), a *Retry* button (44px, calls the passed `onRetry`). Used by `app/events/error.tsx` (Next error boundary: `reset` as `onRetry`). Cached content stays visible simply because the boundary is per route segment and the shell lives in the layout.
- `src/components/offline-notice.tsx`: client component in `app/layout.tsx` (inside `main`'s sibling area, above the page, logged in or out) that renders one `role="alert"` with `feedback.offline` ("You're offline. Changes will save when you're back.") only while offline, through `useSyncExternalStore` on `online`/`offline` events (`navigator.onLine`; server snapshot `true`). Nothing is queued in this story.
- Dependencies come only from the shadcn CLI plus what it omits; no other new package.

**Never:** A demo or test-only route in product code, a data layer, a retry queue, optimistic-update helpers, confirmation dialogs, AI progress copy, permission-denied, role-revoked or concurrent-edit states (later stories, UX-DR24 lists them), a full-page spinner, `getSession()`, `SUPABASE_SECRET_KEY`, a migration, editing `_bmad/` or planning documents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Undo toast | `undoToast("Task done", fn)` | Toast with *Undo*; auto-dismisses after 10 s; hover or focus pauses; region is `polite`; *Undo* calls `fn` once | N/A |
| Reach toast | A toast is showing, press F6 or Alt+T | Focus moves into the toast region | No toast: key does nothing |
| Save failed | `saveFailedToast(retry)` | `role="alert"` toast "Couldn't save. Trying again." with *Retry* calling `retry` | Input stays with the caller |
| First load | `/events` suspends | `Skeleton` layout, no spinner | N/A |
| Load failed | `/events` throws | Inline `role="alert"` card with *Retry*; *Retry* re-renders the segment; shell stays | N/A |
| Offline | Browser goes offline | One `role="alert"` offline message; it disappears when online | N/A |
| Online | Browser online | No offline alert in the DOM | N/A |

</intent-contract>

## Code Map

- `app/layout.tsx` -- add `<Toaster>`, `OfflineNotice` and `ToastHotkey` inside `NextIntlClientProvider`; keep skip link first, `RouteFocus`, landmarks.
- `app/events/page.tsx` -- server page the skeleton and error boundary wrap; unchanged.
- `src/components/ui/sheet.tsx` and `src/components/mobile-menu.tsx` -- pattern for a CLI-added shadcn file fixed by hand and a client component using `useTranslations`.
- `src/components/route-focus.tsx` -- pattern for a small client effect component.
- `src/lib/utils.ts` -- `cn`. `messages/{nb,en}.json` -- existing `shell`, `events`, `privacy`; parity test guards both.
- `vitest.config.ts` -- check the environment (node or jsdom) before choosing how to test components; `react-dom/server` `renderToString` works in node.
- `e2e/shell.spec.ts` and `e2e/support.ts` -- `loggedIn`-style helpers for a logged-in page; `context.setOffline(true)` drives the offline test.
- To create: `src/components/ui/{sonner,skeleton}.tsx` (CLI), `src/lib/feedback.ts`, `src/lib/feedback.test.ts`, `src/components/{load-error,offline-notice,toast-hotkey}.tsx`, `app/events/{loading,error}.tsx`, `e2e/feedback.spec.ts`, `src/components/load-error.test.tsx`.
- Not to change: `_bmad/`, planning documents, `supabase/`, `src/types/database.ts`, `proxy.ts`, `.github/workflows/*`.

## Tasks & Acceptance

**Execution:**
- `src/components/ui/{sonner,skeleton}.tsx`, `package.json`, `pnpm-lock.yaml` -- add via shadcn CLI, repair what it gets wrong -- UX-DR23, UX-DR24
- `src/lib/feedback.ts`, `src/components/toast-hotkey.tsx` -- `undoToast`, `saveFailedToast`, F6 handler -- UX-DR23
- `src/components/{load-error,offline-notice}.tsx`, `app/events/{loading,error}.tsx` -- state primitives and their first use -- UX-DR24
- `app/layout.tsx`, `messages/{nb,en}.json` -- mount host and notice; `feedback.*` strings in both languages
- `src/lib/feedback.test.ts` -- Vitest with `sonner` mocked: durations, action labels, `onUndo` and `onRetry` wiring, `role="alert"` on save-failed
- `src/components/load-error.test.tsx` -- render to string: `role="alert"`, the text, a *Retry* button
- `e2e/feedback.spec.ts` -- logged in, `setOffline(true)` shows exactly one offline `role="alert"` and `setOffline(false)` removes it; `/events` markup has no toast region content or offline alert when online; nb text in an nb browser
- `docs/ki-logg.md` -- this story's entry in the existing format (Norwegian)

**Acceptance Criteria:**
- Given an undoable action raises a toast, when it appears, then it lasts 10 s, pauses on hover or focus, is `polite` and is reachable with F6 or Alt+T.
- Given a page is loading data, when it first renders, then a `Skeleton` in the final layout shape shows, not a full-page spinner.
- Given a load fails, when the error appears, then an inline `role="alert"` card says "Couldn't load this. Check your connection and try again." with *Retry*, and the shell stays visible.
- Given the browser goes offline or a save fails, when it happens, then one `role="alert"` says "You're offline. Changes will save when you're back." or a toast says "Couldn't save. Trying again." with *Retry*, and motion is 150–250 ms ease-out and honours `prefers-reduced-motion`.

## Spec Change Log

## Review Triage Log

### 2026-10-15 — Review pass
- verdicts: 16 grouped entries from four layers — high 0, medium 4, low 9, false 2, maybe-false 1 (duplicates across layers share a row)
- findings:
  - `[medium]` `[patch]` Retry on `/events` calls only `reset()`, which re-renders on the client without refetching a failed server render (edge) — `error.tsx` now runs `router.refresh()` then `reset()` in a transition.
  - `[low]` `[patch]` Sonner passes the click event to `onUndo`/`onRetry` (edge) — callbacks are wrapped so they get no arguments.
  - `[low]` `[patch]` `saveFailedToast` duration not pinned (gap) — test asserts `Infinity`.
  - `[medium]` `[defer]` F6 handler, hover/focus pause, polite region, skeleton, error boundary and Retry click untested (blind, gap, edge, intent) — see `deferred`.
  - `[medium]` `[reject]` Sticky-bar offset, 150–250 ms toast motion and stroke 1.75 on toast icons (edge) — no sticky bar exists yet; Sonner already disables transitions for `prefers-reduced-motion`; revisit with the first sticky bar (Epic 4/7).
  - `[low]` `[reject]` F6 swallowed while focus is already in the list or during exit animation (edge) — the list has `tabIndex=-1`; second press re-focuses the same list.
  - `[low]` `[reject]` Helper signatures differ from the spec text (blind, gap, intent) — the spec says labels are passed in as arguments; the three-argument form does exactly that.
  - `[low]` `[reject]` `navigator.onLine` misses captive-portal offline; notice shifts layout (blind, edge) — the spec scopes the notice to the browser's online/offline events; an offline banner pushing content is the intended inline alert.
  - `[low]` `[reject]` Offline copy promises saving although nothing is queued (blind) — copy is fixed by the story's acceptance criteria.
  - `[low]` `[reject]` `loading.tsx` lacks `aria-busy`, `error.tsx` does not log or hold an `h1`, `cn-toast` class undefined, `.test.tsx` glob, brittle `&#x27;` assertion, nb test flakiness (blind, edge) — cosmetic or test-hygiene; no user-visible harm today.
  - `[low]` `[reject]` Process notes: `ki-logg` has NIL and no PR link, no reflection entry (blind, intent) — the owner's assessment and PR link are added after review; no choice here needs a reflection note.
  - `[false]` `[reject]` `focus()` on `[data-sonner-toaster]` may no-op (blind, edge) — the list element has `tabIndex: -1` in Sonner's source.
  - `[false]` `[reject]` Toaster list present with no toasts, so F6 is hijacked (blind) — the e2e asserts zero `[data-sonner-toaster]` when online, so the list mounts only with toasts.
  - `[maybe-false]` `[reject]` Nested `role="alert"` in the `polite` region double-announces (blind) — the story's criteria require `role="alert"` for save-failed; a browser test with a screen reader is out of reach.

## Design Notes

No story yet raises an undoable action or a failing write, so the toast helpers have no product caller; the Vitest tests with `sonner` mocked are their proof, and the first real caller (Epic 4) adds a browser test. F6 may be taken by the browser (focus address bar) unless `preventDefault` runs in a `keydown` listener on `window`; that is why the handler is explicit. Sonner already provides `aria-live="polite"` on its region, hover and focus pause and the Alt+T hotkey; check each in `node_modules/sonner` rather than rebuilding it.

## Verification

**Commands:**
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test` -- expected: all pass (stale `.next` types may be ignored)
- `pnpm test:e2e` -- expected: all pass, including existing specs
- `.githooks/test.sh` -- expected: all checks pass

**Manual checks (if no CLI):**
- In dev, call `undoToast` from the browser console is not possible; instead inspect the Sonner region markup for `aria-live="polite"` and confirm F6 focuses it once a toast exists (first caller in Epic 4 completes this).

## Auto Run Result

Status: done

**Summary:** Toast host with `undoToast` (10 s, polite) and `saveFailedToast` (`role="alert"`, Retry), an F6 handler beside Sonner's Alt+T, `Skeleton`, a load-failed card with Retry wired into `/events` (`loading.tsx`, `error.tsx`) and one global offline alert.

**Files changed:**
- `src/components/ui/{sonner,skeleton}.tsx`, `src/lib/feedback.ts`, `src/components/{toast-hotkey,load-error,offline-notice}.tsx` -- primitives.
- `app/layout.tsx`, `app/events/{loading,error}.tsx`, `messages/{nb,en}.json` -- mounting, first use, strings.
- `src/lib/feedback.test.ts`, `src/components/load-error.test.tsx`, `e2e/feedback.spec.ts`, `vitest.config.ts`, `package.json`, `pnpm-lock.yaml`, `docs/ki-logg.md` -- tests, `sonner` dependency, AI log.

**Review:** 16 grouped entries. Patched 3 (1 medium, 2 low): Retry now refetches, callbacks get no click event, duration pinned. Deferred 1 (medium): F6, pause, polite region, skeleton, boundary and Retry click lack browser or DOM tests until a real caller exists. The rest rejected with reasons in the triage log.

**Follow-up review recommended:** false.

**Verification:** `pnpm lint`, `format:check`, `tsc --noEmit` pass (stale `.next` types ignored); `pnpm test` 97 passed; `pnpm test:e2e` 32 of 32 after the patches; `.githooks/test.sh` 26 of 26 before the patches.

**Residual risks:** The toast behaviours (10 s, pause, F6, Alt+T) rest on Sonner's source and mocked tests, not a browser run; the manual check in this spec is still open until Epic 4 adds a caller.
