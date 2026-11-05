# Story 5.1: Dashboard sections and scope

## 2026-11-05 kl. 22:45 — aumgaran-student

### Oppgave

`/bmad-build-auto` på story 5.1: én ren funksjon `classifyDashboard` som sorterer Tasks i _Needs you_, _At risk_ og _On track_, og pgTAP som viser hvem som ser hva i `task_state`. Før det: 4.9 merget (PR #97), issue #98 og grenen `feat/5.1-dashboard-sections-and-scope`.

### Plan

- Spec: [spec-5-1-dashboard-sections-and-scope.md](../../_bmad-output/implementation-artifacts/spec-5-1-dashboard-sections-and-scope.md), automatisk godkjent uten åpne spørsmål. Core-omfang: Decision-, Problem- og Proposed-grupper utelatt til Target-historiene.
- Epic 5-konteksten kompilert av subagent. Subagent implementerte, fire reviewere, patcher sendt tilbake.

### Resultat

- `src/modules/tasks/dashboard.ts` med Vitest (16 tester) og `supabase/tests/task_state_scope.test.sql`. Ingen UI, ingen migrasjon.
- Verifisert: `supabase test db` (27 filer), lint, format, tsc, Vitest (413). Playwright ikke kjørt (ingen UI).
- Fire commits `d95ebbb`..`114c540` på grenen, ikke pushet. Sprint-status er `review`.

### Åpne punkter

- Push feat/5.1, åpne PR med `Closes #98` og post review-triage som PR-kommentar.
- Gjest-testen er en bruker uten Rolle, siden gjester ikke har brukerkobling ennå; `anon` gir feil, ikke tomt resultat. Vurder refleksjonsnotat om begge valgene.
