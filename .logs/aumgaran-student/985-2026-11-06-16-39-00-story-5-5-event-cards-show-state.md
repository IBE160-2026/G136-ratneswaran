# Story 5.5: Event cards show state

## 2026-11-06 kl. 16:39 — aumgaran-student

### Oppgave

Bygge Story 5.5 («Event cards show state») med bmad-build-auto, kun Core: _All events_ skal vise Åpne, Nye og haster/i fare per kort, uten push eller PR.

### Plan

- Merke 5.4 ferdig i sprint-status, så spec `spec-5-5-event-cards-show-state.md`.
- Subagent implementerer fra spec-en; fire parallelle reviewere (blind, edge-case, verifikasjonsgap, intent), triage, patch av medium.
- Verifisere, commite i små commits, ki-logg, PR-kommentar i `out/pr-comment.md`.

### Resultat

- Commits på `feat/5.5-event-cards-show-state`: sprint-status 5.4 (017c5e9), migrasjon + pgTAP + typer (06d8843), kort-kode (82fd8a5), e2e (7500b66), ki-logg (d4b0670), spec + sprint-status review (a5ad072).
- `events_card_counts()` (security invoker) og indeks `tasks (event_id, owner_user_id)`; `card-state.ts` med én rpc; kortet viser sirkel, «N new», «N overdue» / «N need you» / «N at risk» og tilgjengelig navn.
- Review: 21 funn (4 medium patchet: pgTAP for stale/obsolete/dismissed, e2e for need you og at risk; 13 lave og 4 falske avvist; beslutningstall utsatt).
- Verifisert: `supabase db reset`, `supabase test db` (28 filer), lint, format, Vitest 420, tsc, Playwright 110 passerte.

### Åpne punkter

- SQL-funksjonen gjentar Dashboard-reglene fra `classifyDashboard`; kan divergere. Vurder refleksjonsnotat.
- En leder ser «0 open tasks» sammen med «N overdue» (Åpne = egne Tasks per AC).
- Beslutningstall på kort venter på Target-historiene; gjest-RSVP på kort venter på Epic 7.
- Push feat/5.5, åpne PR med `Closes #106` og post triage fra `out/pr-comment.md`.
