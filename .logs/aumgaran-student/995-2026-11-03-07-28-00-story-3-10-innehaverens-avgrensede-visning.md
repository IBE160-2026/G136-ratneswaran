# Story 3.10: innehaverens avgrensede visning

## 2026-11-03 kl. 07:28 — aumgaran-student

### Oppgave
`/bmad-build på story 3.10`: Rolle-innehaveren skal bare se det Rollen tillater, og databasen er grensen. Så walkthrough, godkjenning, push, PR og klargjøring av neste story.

### Plan
- Spec: `_bmad-output/implementation-artifacts/spec-3-10-the-role-holders-scoped-view.md`.
- Valg før implementering: generisk no-access-tekst uten Organizers navn, og toast og redirect for fjernet innehaver utsettes på nytt.
- Subagent implementerer, tre uavhengige reviewere, deretter triage.

### Resultat
- Migrasjoner `20261030120000_holder_scoped_view.sql` (`holds_role`, `is_team_member`, utvidede policyer, avlyste events skjules) og `20261030130000_role_member_contacts.sql` (e-post flyttet til Organizer-only tabell).
- App: sidemeny etter bruker, `organizerOnly` på Guests, Settings og oppsett, skrivebeskyttet Team-visning, Rolle-label på All events.
- Review fant at innehavere kunne lese andres e-post via API-et. Eieren valgte kontakttabell. Fire mindre funn ble rettet.
- Verifisert: lint, format, tsc, Vitest 354, pgTAP 529, relevante Playwright-spesifikasjoner (11).
- PR #80 (lukker #79) er merget. KI-logg-oppføring i `docs/ki-logg.md`, review-funn postet som PR-kommentar.
- Klargjort Story 4.1: issue #81, branch `feat/4.1-tasks-table-and-role-scoped-access`, commit `d56269d` (3.10 satt til done).

### Åpne punkter
- `is_team_member` leser tabellen policyen vokter og er avhengig av planleggerens rekkefølge (`deferred-work.md`).
- Kontakttabellen kom etter første reviewrunde og er ikke gransket av egne reviewere.
- Hele `pnpm test:e2e` ble ikke kjørt etter siste endring, bare de berørte spesifikasjonene.
- Toast og redirect for fjernet innehaver (UX-DR24) er utsatt på nytt, uten ny story. Vurder oppføring i `docs/refleksjonsnotater.md`.
- Epic 3 har igjen 3.1–3.4 (Target 3), og retro er valgfri. Gjennomgå task-observer-loggen ved epic-retroen.
