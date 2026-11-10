# Story 7.7: Guests tab and RSVP summary

## 2026-11-10 kl. 14:59 — aumgaran-student

### Oppgave

Bygge Story 7.7 med `/bmad-build-auto`, med Fable 5.2 på bygging og Sonnet 5.5 på review-agentene, slik eieren ba om.

### Plan

- Spec: `_bmad-output/implementation-artifacts/spec-7-7-guests-tab-and-rsvp-summary.md` (triage og resultat står der).
- Én byggeagent (Fable 5.2) implementerte spec-en; fire reviewere (Sonnet 5.5) leste diffen; byggeagenten rettet funnene.
- Verifisering mot lokal Supabase etter `supabase db reset`.

### Resultat

- Migrasjon `20261110120000_guests_role_read.sql`: en holder som har blitt med i den aktive Guests-rollen leser `guests` og `rsvps`, aldri `guest_contacts`. pgTAP i `guests_role_read.test.sql` (27 påstander).
- Guests-fanen: fire fliser som filtrerer og kunngjør, 100 rader med _Show more_, «ingen treff» med _Clear filter_, og skrivebeskyttet visning uten e-post for holderen.
- Dashboard _On track_: RSVP-oversikt som inline-SVG-kakediagram med tabell og antall med følge; andre rolleholdere ser bare forventet antall fra spørreskjemaet.
- Review: 20 funn (0 høy, 1 medium, 13 lave, 6 falske). Rettet i tre commits: `90d1c5a`, `9d145b7`, `21ba0cd`. To punkter utsatt.
- Verifisert: pgTAP 1145/1145, Vitest 500/500, lint, format og tsc uten feil, Playwright serielt 33/33 (guests, holder-view, dashboard, rsvp).
- Commits `a67255b`..`1653385` på `feat/7.7-guests-tab-and-rsvp-summary`. Sprint-status: 7.7 `review`.
- Byggeagenten ble startet i bakgrunnen (harnessen tillater ikke blokkerende kall) og stoppet én gang på bruksgrensen; den ble gjenopptatt og fullførte.

### Åpne punkter

- Holder av Guests-rollen kan fortsatt lese gjester og svar i et avlyst Event via API-et; eier avgjør om policyen skal snevres inn.
- Guests-fanen og RSVP-oversikten teller høyst 1000 gjester (API-grensen); eksakt telling krever SQL-aggregat.
- Kakediagrammet er ikke sett i nettleser i lyst og mørkt tema.
- Tom gjesteliste viser bare «legg til for hånd»; epics-teksten nevner også «del en invitasjonslenke» (Story 7.2, Target 3). Eier bekrefter.
- «Min vurdering» i `docs/ki-logg.md` for 7.7 og eventuelt refleksjonsnotat (inline policy, klientside-vindu) gjenstår.
