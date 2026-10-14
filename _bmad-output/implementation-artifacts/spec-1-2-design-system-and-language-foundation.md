---
title: 'Story 1.2: Design system and language foundation'
type: 'feature'
created: '2026-10-14'
status: 'done'
baseline_commit: 'e3bfc710a0c4a4f8068485664c4beb43be673b5b'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app still carries shadcn's neutral defaults and one hard-coded English page. Every UI story from 1.4 onward needs the Arrangly theme, the nb/en message setup and the accessibility floor in place first (issue #20).

**Approach:** Map the DESIGN.md tokens onto the shadcn CSS variables (light "Warm Sky", dark "Clear Sky"), add type, density and radius tokens, wire next-intl without locale URLs, build the root layout accessibility floor, and ship the status vocabulary once as a reusable component.

## Boundaries & Constraints

**Always:** Token values come from DESIGN.md, never invented; ⚠ contrast pairs are not lightened. Sizes ship as rem. Dark mode follows `prefers-color-scheme` by default and also honours `data-theme="light|dark"` on `<html>`, so Story 1.9 can add the manual override. Language is `nb` when the first `Accept-Language` tag is `nb`, `nn` or `no`, else `en`; Story 1.9 adds the saved setting. All UI text, including the skip link and status words, is in `messages/nb.json` and `messages/en.json` with identical keys. Norwegian strings are written natively. Lucide icons use 1.75 stroke. pnpm only; `next-intl` is the one new dependency.

**Never:** Locale in URLs or `middleware.ts`. Auth, schema, migrations, the real sidebar shell (1.7), toasts and skeletons (1.8), or the language/appearance switch UI (1.9). Emojis in the interface. Editing `_bmad/` or planning documents. Red for Blocked.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Norwegian browser | `Accept-Language: nb-NO,en;q=0.8` | `<html lang="nb">`, Norwegian strings | N/A |
| Other or missing language | `de`, `en-GB`, header absent | `<html lang="en">`, English strings | Fallback to `en` |
| Key drift | A key exists in only one message file | Vitest fails naming the key | N/A |
| Dark preference | `prefers-color-scheme: dark`, no `data-theme` | Clear Sky tokens apply | N/A |
| Reduced motion | `prefers-reduced-motion: reduce` | Animations and transitions become cross-fades or none | N/A |
| Blocked status | `StatusLabel status="blocked"` | `lock` icon, "Waits for: {task}" in muted foreground on the blocked-row tint | Never destructive colour |
| Route change | Client navigation | Focus moves to the page `h1` (`tabindex="-1"`) | No `h1` present: no focus move |

</frozen-after-approval>

## Code Map

- `app/globals.css` -- replace shadcn neutral `:root`/`.dark` values with DESIGN.md tokens; keep the `@theme inline` mapping and extend it with status, primary-soft, at-risk, badge colours, type roles and radius scale; change the `@custom-variant dark` selector to match `data-theme` plus the media query.
- `app/layout.tsx` -- static `lang="en"` and title; becomes async, sets `lang` from the resolved locale, wraps children in `NextIntlClientProvider`, renders skip link, `header`, `nav`, `main`.
- `app/page.tsx` -- placeholder; read its strings from messages and set the title through `generateMetadata`.
- `next.config.ts` -- wrap with the next-intl plugin.
- `eslint.config.mjs`, `src/lib/env.ts`, `src/lib/utils.ts` -- leave unchanged (AD-5 rule; `cn` helper to reuse).
- `e2e/home.spec.ts` -- keep; extend for lang, skip link and title.
- New: `src/i18n/request.ts` (locale resolution), `messages/{nb,en}.json`, `src/i18n/messages.test.ts` (key parity), `src/components/route-focus.tsx` (client), `src/components/status-label.tsx` and `src/lib/status.ts` (vocabulary table), `src/lib/locale.test.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `pnpm-lock.yaml` -- `pnpm add next-intl` -- AD-14
- [x] `src/i18n/request.ts`, `next.config.ts` -- resolve `nb`/`en` from `Accept-Language`, load the matching messages -- AC 3
- [x] `messages/nb.json`, `messages/en.json` -- skip link, nav label, placeholder text, all status words with their parameters -- AC 3, 5
- [x] `src/i18n/messages.test.ts`, `src/lib/locale.test.ts` -- key parity (nested keys flattened) and locale resolution for the matrix rows -- AC 3
- [x] `app/globals.css` -- colour, type, density, radius tokens; `prefers-reduced-motion` rule; 16px phone gutter and Airy/Balanced density variables switching at 1024px; `overflow-wrap` so text wraps at 320px -- AC 1, 2, 4
- [x] `app/layout.tsx`, `app/page.tsx`, `src/components/route-focus.tsx` -- landmarks, skip link first in the DOM, `lang`, title pattern "{Surface} – {Event} – Arrangly" (event segment omitted when no event is in scope), focus to `h1` on route change -- AC 4
- [x] `src/lib/status.ts`, `src/components/status-label.tsx` -- the eleven statuses with fixed colour token, Lucide icon and message key; icon plus word always rendered -- AC 5
- [x] `e2e/home.spec.ts` -- assert `lang`, first focusable is the skip link, title, `h1` -- AC 4

**Acceptance Criteria:**
- Given light or dark preference, when the theme is inspected, then `--background`, `--primary`, `--border`, `--input` and `--ring` equal the DESIGN.md values for that mode, and `border` is never used as a control boundary.
- Given a 320px viewport, when the placeholder page renders, then there is no horizontal scroll.
- Given every status, when rendered, then colour, icon and word are all present and Blocked uses no destructive colour.

## Implementation Notes

- Key-parity and locale tests live together in `src/i18n/locale.test.ts` (Code Map named two files). `src/i18n/locale.ts` holds the pure resolver.
- Dark mode uses `light-dark()` tokens plus a `@custom-variant dark` for utilities, replacing the shared-block idea in Design Notes.
- `@parcel/watcher` and `@swc/core` build scripts are disallowed in `pnpm-workspace.yaml`; `next-intl` works without them (build and e2e pass).
- `--muted` maps to the sidebar tone, not the blocked-row tint, so shadcn `bg-muted` never reads as a status.
- `next dev` re-adds the nextjs-agent-rules block to AGENTS.md; reverted again (already in deferred-work).

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| atRisk/newItem have no icon, spec says icon always | low | rejected | DESIGN.md Colors table lists icon "none" for these two; word is always rendered. Test now pins the exception. |
| StatusLabel tests weak (keys, icons) | medium | patch | Added key-to-message and icon tests. |
| Tinted status pills lack padding | low | patch | Added px/py to blocked and newItem tones. |
| Skip link target `main` not focusable | medium | patch | Added `tabIndex={-1}`. |
| RouteFocus uses first `h1` | low | patch | Now `main h1`. |
| `--color-muted` maps to blocked-row tint | medium | patch | Now maps to sidebar. |
| Unused `locales` export | low | patch | Removed. |
| RouteFocus when h1 renders late; no navigation test | maybe-false | defer | Only one route exists; needs Story 1.4 route to settle. |
| E2E not run in CI | medium | defer | Story 1.3 wires Playwright into CI. |
| `headers()` makes routes dynamic | false | rejected | Inherent to AD-14 (no locale in URL). |
| Only first Accept-Language tag, no q-values, `*`, `nb_NO` | low | rejected | Spec decision; fix adds parsing complexity. |
| `overflow-wrap: anywhere` heavy-handed | maybe-false | rejected | 320px e2e passes; revisit if a flex child collapses. |
| `light-dark()` browser support | low | rejected | Baseline since 2024 (Safari 17.5). |
| Brand name and title suffix hard-coded | false | rejected | Product name, not UI copy. |
| `keys()` null/array crash, typed messages, typed `values` | low | rejected | Fix adds complexity; no such value exists. |
| Breakpoint `63.999rem` vs 1024px | low | rejected | rem tracks user text size by design (UX-DR2). |
| Spec file names, Design Notes stale | low | rejected | Fix edits the spec; recorded in Implementation Notes. |
| `pnpm-workspace.yaml` builds disabled unexplained | false | rejected | Build and e2e pass; noted above. |
| ki-logg entry missing | medium | patch (next) | Added with the commits, per AGENTS.md. |

## Design Notes

Dark mode selectors: `:root` holds light; `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` and `:root[data-theme="dark"] { … }` share one token block via a CSS custom-property layer to avoid duplication where possible.

## Verification

**Commands:**
- `pnpm lint` -- expected: no errors
- `pnpm format:check` -- expected: no errors
- `pnpm test` -- expected: all pass, including key parity
- `pnpm build` -- expected: builds (also catches type errors, see deferred-work)
- `pnpm test:e2e` -- expected: passes

**Manual checks (if no CLI):**
- Toggle OS dark mode and a Norwegian browser language; confirm tokens, `lang` and strings switch; Tab once and see the skip link.
