# Story 5.3 Dashboard: At risk and On track

## 2026-11-06 kl. 06:50 — aumgaran-student

### Oppgave

`/bmad-build-auto på story 5.3`: bygg Dashboard-seksjonene _At risk_ og _On track_ på `/events/[eventId]`, slik at Organizer kan lese status uten å åpne Tasks.

### Plan

- Grein `feat/5.3-dashboard-at-risk-and-on-track` fra `Arrangly/main`; spec `_bmad-output/implementation-artifacts/spec-5-3-dashboard-at-risk-and-on-track.md`.
- Subagent implementerer fra spec-en; fire reviewere (blind, edge-case, verifikasjonsgap, intent-alignment); trie og rette.

### Resultat

- Kode: `summarizeRoles` i `src/modules/tasks/dashboard.ts`, bufret `loadListed` med roller, medlemmer og notatutdrag, `at-risk.tsx`, `on-track.tsx`, nb/en-tekster, utvidet `e2e/dashboard.spec.ts`.
- Seks commits `92a5755`..`87aea01` på grenen; sprint-status: 5-2 done, 5-3 review. Issue #102 opprettet.
- 34 funn fra review, 7 rettet (blant annet rekkefølge etter `roleKeys`, fjernede notater, én lasting per forespørsel). Lint, format, 414 Vitest, tsc og 107 e2e grønne etter rettingene. Ingen migrasjon, ingen pgTAP.
- Subagentene ble startet i bakgrunnen, ikke synkront som workflowen krever.

### Åpne punkter

- Ny review-runde anbefalt: `cache()` i `loadListed` forutsetter at `loadEvent` gir samme objekt per forespørsel.
- Retry-kortet ved lastefeil og layout ved 375px er ikke testet.
- Push og PR for 5.3 (`Closes #102`) gjenstår.
