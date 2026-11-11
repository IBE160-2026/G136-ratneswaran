# Story 7.8: Delete guest data

## 2026-11-11 kl. 19:14 — aumgaran-student

### Oppgave

Bygge Story 7.8 («Delete guest data») med `/bmad-build-auto`: en gjest skal kunne slette alt Arrangly har om dem, og Organizerens fjerning av en gjest og sletting av et Event skal gå gjennom samme funksjon.

### Plan

- Spec: `_bmad-output/implementation-artifacts/spec-7-8-delete-guest-data.md` (triage og resultat står der).
- Én byggeagent implementerte spec-en. Den ble stoppet av bruksgrensen to ganger og tok opp igjen med `SendMessage`; arbeidet var da allerede committet.
- Fire reviewere leste diffen; seks rettelser gikk tilbake til byggeagenten, som ble stoppet av grensen en tredje gang etter at alle seks var committet.
- Jeg fant og rettet selv en feil i en e2e-test som de nye rettelsene utløste.

### Resultat

- Branch `feat/7.8-delete-guest-data`, 15 commits siden `aed920f` (ikke pushet).
- `guests_delete_guest_data(guest_id)` i `supabase/migrations/20261110130000_guests_delete_guest_data.sql`; `guests_remove` og `events_delete` går gjennom den. Server Action `deleteMyData`, knapp og dialog på Guest Dashboard (også før gjesten har svart), egne tekster for ferdig, allerede slettet, manglende økt og uventet feil, én setning i personvernerklæringen.
- Verifisert etter `supabase db reset`: pgTAP 1178/1178, lint, format og tsc, Vitest 509/509, Playwright serielt 37/37 (rsvp, guests, cancel-delete, guest-link). SQL ble ikke endret etter review, så pgTAP ble ikke kjørt på nytt etter rettelsene.
- Review: 34 funn (0 høy, 5 medium, 27 lave, 2 falske); 6 rettelser, 3 utsatte punkter, resten avvist med begrunnelse i spec-en. Et tidligere foreløpig tall på 30 funn var feil.
- Feilen jeg rettet: testen «a delete without a session» klikket før svarvisningen hadde erstattet spørsmålsvisningen, som nå har sin egen sletteknapp, og tidsavbrøt i serie (9e19ad6).
- `sprint-status.yaml` står som `review` for 7-8.
- Byggeagenten ble igjen startet frakoblet, i strid med arbeidsflyten (samme som 7.5 og 7.7, allerede logget som observasjon 10).

### Åpne punkter

- En bruker som både er gjest og Role-holder i bare ett Event, og aldri har satt passord, blir igjen i `auth.users` etter `events_delete`; eier avgjør hvem som rydder det.
- Personvernteksten fra Epic 1 sier fortsatt at *Delete my data* fjerner mat, hotell og forespørsler, og dialogen sier ikke at kontoen slettes og gjesten logges ut; planleggingsdokumentene eier ordlyden.
- Låsen på brukerraden som hindrer en bruker uten data ved samtidige slettinger er ikke testet med to tilkoblinger.
- Oppfølgingsreview anbefales: den nye sletteknappen på første spørsmål kom til etter at review var gjort, og den samspiller med innsending av svaret.
- Dialogen og sluttsidene er ikke sett i nettleser i lyst og mørkt tema.
- «Min vurdering» i `docs/ki-logg.md` for 7.8 og eventuelt et refleksjonsnotat gjenstår.
- Push og PR gjenstår.
