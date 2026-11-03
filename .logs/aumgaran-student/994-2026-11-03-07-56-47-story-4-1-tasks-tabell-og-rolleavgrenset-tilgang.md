# Story 4.1: tasks-tabell og Rolle-avgrenset tilgang

## 2026-11-03 kl. 07:56 — aumgaran-student

### Oppgave
`/bmad-build på story 4.1`: lag tabellen `tasks` med RLS, kolonnetilganger og hjelpefunksjoner, slik at hver Rolle bare leser sine egne Tasks. Deretter «godkjenn og fortsett» og «push og pr».

### Plan
- Kompilere `epic-4-context.md` (manglet), skrive `spec-4-1-tasks-table-and-role-scoped-access.md`, ingen åpne spørsmål.
- Implementering i subagent, tre uavhengige reviewere, triage, patcher via samme agent, egen verifisering.
- Fire små commits, KI-logg, push og PR.

### Resultat
- Migrasjon `20261103120000_tasks.sql`, `supabase/tests/tasks.test.sql` og regenererte typer. `supabase test db` (19 filer, 577 tester), `pnpm lint` og `pnpm test` grønne.
- Review: 28 funn, sju rettet, to utsatt i `deferred-work.md`, resten avvist (Review Triage Log i spec-en). Funnene er postet som PR-kommentar.
- Commits: `204853c` (spec og kontekst), `d3e63ae` (tabell), `318049e` (typer), `2e30bde` (spec, triage, sprint-status), `2b2851d` (KI-logg).
- Branch pushet til `Arrangly`, PR #82 (`Closes #81`). Sprint-status: 4-1 er `review`.

### Åpne punkter
- `tasks_update`-policyen (kun Organizer) ble lagt til utover spec-en; Story 4.2 må utvide den.
- Guest-only-testen er svakere enn matrisen (`guests` har ikke `user_id`).
- `updated_at` har mikrosekundpresisjon mot JS `Date`; 4.2 må sende verdien som rå streng (deferred-work.md).
- Foreldet `accepted_at`/`delegated_at` når en eier slettes (deferred-work.md).
- Når PR #82 er merget: sett 4-1 til done, lag issue og branch for Story 4.2.
