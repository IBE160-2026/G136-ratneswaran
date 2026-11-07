# Story 7.1: Personlig gjestelenke

## 2026-11-07 kl. 14:26 — aumgaran-student

### Oppgave

Bygge Story 7.1 (personlig gjestelenke) med bmad-build-auto uten tilsyn, fram til en PR mot `main` som eieren reviewer.

### Plan

- Kompilerte Epic 7-kontekst og skrev spec-en `_bmad-output/implementation-artifacts/spec-7-1-personal-guest-link.md`.
- En subagent implementerte, fire review-lag gikk gjennom diffen, og funnene ble rettet i en ny runde.

### Resultat

- Migrasjon `20261107120000_guest_links.sql`, server-actions `copyGuestLink`/`copyGuestLinks`/`openGuestLink`, gjestevisning på `/invite`, kopimeny på Guests-siden, pgTAP, Vitest og e2e. 22 commits fra `e9d91c1` til `2695f28`.
- Lint, format og tsc er grønne. Vitest 479/479, pgTAP 1060/1060. Playwright 31/31 når testene kjøres én og én; parallelt får flere spesifikasjoner tidsavbrudd fordi dev-serveren er under last.
- PR #118 (`Closes #117`) med triage-kommentar. Sprint-status: 7-1 står på review, epic-7 på in-progress.

### Åpne punkter

- Høy risiko er utsatt: en gjestesession kan sette passord eller koble en OAuth-identitet og beholde kontoen etter _New link_. Eieren må bestemme Auth-innstillingene (bmad-correct-course).
- `vault.create_secret` i skymigrasjonen er ikke verifisert før CI har kjørt den.
- E2E-testene for team og gjester får tidsavbrudd når de kjøres parallelt under last.
