# KI-logg

Spor av hvordan KI ble styrt: hva som ble bedt om, hva KI foreslo, og hva jeg godtok, rettet eller avviste. Hver oppføring lenker til endringen den gjelder.

**Planfasen (til og med 2026-10-12):** Prompts ble ikke lagret ordrett. Oppføringene er rekonstruert i etterkant fra review-filer, commits og refleksjonsnotater, og kildene er oppgitt.
**Fra Epic 1:** Hver story-PR legger til en oppføring med nøkkelprompts ordrett (se AGENTS.md › Traceability).

## Format

```markdown
## ÅÅÅÅ-MM-DD — <story-id eller fase>: <kort tittel>

**Prompt:** <nøkkelprompt, ordrett eller sitert kort>
**KI foreslo:** <hva KI leverte>
**Min vurdering:** Godtatt | Rettet | Avvist — <hva og hvorfor>
**Spor:** <commit, PR eller fil>
```

---

## 2026-09-29 — UX: Undo-toast og kontrastpåstander rettet etter tilgjengelighetsreview

**Prompt:** Tilgjengelighetsreview av UX-spec (EXPERIENCE.md og DESIGN.md) mot WCAG 2.2.
**KI foreslo:** Den første UX-specen hadde 5 sekunders undo-toast som eneste angremulighet, reflow bare til 375 px, og en påstand om at alle statusfarger hadde kontrast ≥ 5,0.
**Min vurdering:** Rettet. Reviewen viste at toasten ikke kan nås med tastatur på 5 s (WCAG 2.2.1, 2.1.1), at reflow må fungere på 320 px (1.4.10), og at kontrastpåstanden var feil for seks fargepar. Toasten ble 10 s med pause ved fokus og F6-snarvei, og kontrastpåstanden ble erstattet med en tabell over målte par.
**Spor:** `ux-designs/ux-Arrangly-2026-09-27/review-accessibility.md`, EXPERIENCE.md › Interaction Primitives, commit `202703a`

## 2026-09-30 — Arkitektur: Innloggingsmetoder kuttet fra fem til tre

**Prompt:** Vurdering av innloggingsleverandører (e-post, Google, GitHub, Facebook, Apple, Vipps).
**KI foreslo:** Supabase støtter alle fem, så alle kunne vært med.
**Min vurdering:** Rettet. Jeg valgte e-post, Google og GitHub. Vipps krever organisasjonsnummer, Apple et betalt utviklermedlemskap, og Facebook en godkjenning fra Meta med usikker tidsbruk.
**Spor:** `docs/refleksjonsnotater.md` (2026-09-30), ARCHITECTURE-SPINE AD-6

## 2026-10-02 — Arkitektur: Adversarial review fant regler som motsa hverandre

**Prompt:** Adversarial review av ARCHITECTURE-SPINE: «to enheter som følger alle AD-er bokstavelig, men likevel ikke passer sammen».
**KI foreslo:** Den første arkitekturen, skrevet med KI, hadde fem kritiske motsigelser. AD-3 tillot bare `role_members` og `organizer_id` i RLS-policyer, slik at en gjest ikke kunne lese sine egne data. AD-5 utelukket `notifications_emit`, som AD-7 trenger. Server Action-grensen kunne omgås ved å kalle PostgREST direkte.
**Min vurdering:** Rettet før epics ble skrevet. AD-3 fikk hjelpefunksjonene `is_guest_of`/`is_guest_self` (aldri e-postmatching), AD-5 fikk en eksplisitt whitelist, og AD-19 gjorde databasen til grense med kolonnerettigheter.
**Spor:** `architecture-Arrangly-2026-09-29/reviews/review-adversarial.md`, commit `430de9c`

## 2026-10-02 — PRD/arkitektur: GDPR tatt inn i Core mot PRD-ens opprinnelige avgrensning

**Prompt:** Arkitekturarbeid på gjestedata (allergier, mat, hotell).
**KI foreslo:** PRD-en sa at formell GDPR-håndtering var utenfor v1.
**Min vurdering:** Rettet. Allergier er helseopplysninger (art. 9), og det er ikke forsvarlig å behandle dem uten samtykke og sletting. Et GDPR-grunnlag ble lagt inn i Core: EU-lagring, samtykke, aldri til KI, sletting etter 15 dager, og *Slett mine data*.
**Spor:** `docs/refleksjonsnotater.md` (2026-10-02), AD-11, NFR2

## 2026-10-11 — Epic 4: 26 funn fra elicitation før oppgavene ble skrevet

**Prompt:** Security Audit Personas, Failure Mode Analysis og Pre-mortem på Epic 4 (oppgaver og beslutninger) før stories skrives.
**KI foreslo:** 9 sikkerhetsfunn, 12 feilmoder og 5 pre-mortem-funn, pluss fire valg jeg måtte ta.
**Min vurdering:** Godtatt med egne valg. `tasks_create` ble lagt til AD-2-listen, deloppgaver får bare ett nivå, og offline statusendring gir toast + Prøv igjen i stedet for kø. Konflikten mellom AD-2 og AD-5 er satt opp som et åpent `bmad-correct-course`-punkt i stedet for å lappes i en story.
**Spor:** `epics.md` › Epic 4, commit `12a4766`

## 2026-10-11 — Epic 5: Ønsket om innsyn for alle rolleinnehavere ble ikke tatt inn

**Prompt:** Jeg ba om at rolleinnehavere skal se alt med mindre arrangøren blokkerer det, og om et kakediagram over invitasjonsstatus på dashbordet.
**KI foreslo:** KI påpekte at innsyn på tvers av roller bryter FR2, NFR1 og AD-3, og at RSVP-data først finnes i Epic 7.
**Min vurdering:** Avvist for nå. Dagens rollebaserte innsyn beholdes, og blokkering fra arrangøren droppes. Innsyn på tvers er satt opp som et `bmad-correct-course`-punkt. Kakediagrammet flyttes til Epic 7 (med tabell ved siden av, aldri bare farge), og Epic 5 viser bare «N gjester lagt til».
**Spor:** `epics.md` › Epic 5 og «Carry-forwards from Epic 5», commit `12a4766`

## 2026-10-12 — Prosess: Sensorkriterier vurdert med nivå, ikke bare «dekket»

**Prompt:** «Bryt [sensorveiledningen] ned til sensor-criteria.md … Vurder hvorvidt dette allerede er hensyntatt i kravdokumentene», og deretter: «Selv om alt er dekket sier det ikke noe om dekningsgraden. Bruk nivåene A–F med de beskrevne kjennetegnene.»
**KI foreslo:** Den første versjonen markerte hvert krav som dekket, delvis dekket eller ikke dekket.
**Min vurdering:** Rettet. En binær status skjulte at prosessporet bare holdt nivå C og README nivå D. Etter nivåvurderingen ble tiltakene prioritert: denne KI-loggen, sporbarhetsregler i AGENTS.md, rydding i repoet, og README-krav i Story 1.1 og Epic 11.
**Spor:** `docs/sensor-criteria.md`, PR for `chore/sensor-criteria`

## 2026-10-12 — Prosess: Core redusert med bmad-correct-course

**Prompt:** «Jeg sier meg enig i forslaget» (Core = Epic 1, 2, 3, 4 trimmet, 5, 7, 11; Target i rekkefølge), deretter `bmad-correct-course` med valg av e-post, tidslinje og funksjonsstopp.
**KI foreslo:** Kuttliste og Target-rekkefølge basert på faglærerens tilbakemelding. Under analysen fant KI fem avhengigheter forslaget ikke hadde sett: invitasjon og engangskode gikk via e-post-outboxen (3.6, 3.7), varsler ved avlysning og delegering (3.10, 4.5), og at ingen kunne godta en delegert oppgave når godta-trinnet (4.6) flyttes ut, slik at eieren aldri kunne endre status (4.4, 4.9). KI anbefalte funksjonsstopp 8. desember med buffer til 13.
**Min vurdering:** Godtatt med egne valg. E-post ut av Core, tidslinjen beholdes. Jeg valgte funksjonsstopp 15. desember i stedet for KI-ens anbefaling, med README-test før stoppen som risikodemping.
**Spor:** `_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-12.md`, PR for `plan/core-scope`

## 2026-10-12 — Epic 6 (AI-assistent, Target 1) skrevet uten elicitation

**Prompt:** «Target epicsene kan du i første omgang kjøre uten Elicitation og ta utgangspunkt i at jeg støtter anbefalingene som gis.» (Kjørt over natten mens jeg sov.)
**KI foreslo:** Sju stories: bruksregister og `ai_reserve`, gateway i TypeScript med fixtures og fallback, forslag fra beskrivelse, gjennomgang og ny kjøring, forslag fra statusnotat, ✦ utkast til e-post (Target 4) og en AI-sjekk i CI. KI fant at AD-9 (`ai_reserve` må se `auth.uid()`) og AD-5 (revoke fra `authenticated`) motsier hverandre, og satte det opp som et åpent `bmad-correct-course`-punkt i stedet for å la en story omgå reglene. Forslag fra statusnotat fikk i tillegg en ordliste som stopper kall når notatet nevner allergi, mat eller hotell.
**Min vurdering:** Vurdert 2026-10-13. Alle anbefalte standardvalg bekreftet: språk på forslag følger Event-språket, `status-note` er Target 1 og ordlisten er sikkerhetsnett. AD-9/AD-5-motsigelsen om `ai_reserve` avgjøres i `bmad-correct-course`-PR-en.
**Spor:** `epics.md` › Epic 6, branch `plan/epic-6-ai-assistant`

## 2026-10-12 — Epic 7 (Gjester, Core) skrevet med fem elicitation-metoder

**Prompt:** «Epic 7 og 11 som Core … kjør de mest hensiktsmessige elicitationene, inntil 5 modeller.» Jeg ba senere om å stoppe etter inneværende epic, så Epic 8–11 er ikke skrevet.
**KI foreslo:** Security Audit Personas, Failure Mode Analysis, Pre-mortem, Boundary & Edge Case Sweep og Assumption Audit, kjørt av KI alene fordi jeg sov. Funn som endret stories: engangskode må tas før passord settes på en Gjest-konto (ellers kan en lekket lenke kapre e-posten), delt lenke kan brukes til å tømme Auth-e-postkvoten (tak på 100 koder per Event per dag, ingen `guests`-rad før koden er bekreftet), GET på gjestelenken oppretter ingen sesjon fordi forhåndsvisning i chat ville gjort det, tilbakekalling av passord/identitet via trigger så ingen vei glemmer det, e-post lagres i egen `guest_contacts` slik at Roller aldri ser den, og retention-jobben må ikke slette demo-Eventen før sensur. KI la også til *Copy all links* og *Copy invitation text* fordi 80 lenker for hånd ikke er realistisk uten e-post. Epic 7 ble estimert til ca. sju stories og endte på ti.
**Min vurdering:** Vurdert 2026-10-13. Alle anbefalte valg bekreftet: delingen `guests`/`guest_contacts`, sletting 15 dager etter avlysning, kladder slettes etter 90 dager, én plus-one per gjest og auth-brukere slettet i SQL. Jeg endret omfanget: Story 7.2 (delt lenke), 7.4 (allergi, mat og hotell), 7.6 (valgfri konto) og 7.9 (automatisk sletting) flyttes fra Core til Target, så Core ikke samler helsedata og ikke trenger retention-jobb. De tre `bmad-correct-course`-punktene avgjøres i egen PR.
**Spor:** `epics.md` › Epic 7, branch `plan/epic-7-guests`

## 2026-10-12 — Epic 8 (Gjesteforespørsler, Target 4) skrevet uten elicitation

**Prompt:** «Epic 8, 9 og 10 skrives som Target … kjør uten Elicitation i denne omgangen og ta utgangspunkt i at jeg støtter anbefalingene som gis.» (Kjørt over natten mens jeg sov.)
**KI foreslo:** Sju stories: `guest_requests`/`guest_results`-tabeller og `guests_submit_request`, et eget forslag fra RSVP-feltet «other needs», AI-rangering av riktig Rolle via `route-request`, ett svar per forespørsel, automatisk resultat til gjesten når oppgaven er løst, Dashboard-seksjonene «My requests»/«Resolved for you» med `tasks_purge_guest`, og en sjekk mot flaggskip-scenarioet. KI fant at `route-request` trenger en system-kaller uten økt (ingen Gjest eller Arrangør er innlogget når den kjører), og satte det opp som et åpent `bmad-correct-course`-punkt i samme familie som Epic 6 og 7s ubesvarte rettighetsspørsmål, i stedet for å utvide `ai_reserve`s rettigheter på egen hånd.
**Min vurdering:** Vurdert 2026-10-13. Alle anbefalte standardvalg bekreftet: «other needs» og forespørselsteksten når aldri en AI-prompt, standard-ruting til Arrangøren via Guests-rollen, og system-kaller-punktet for `route-request` avgjøres i `bmad-correct-course`-PR-en.
**Spor:** `epics.md` › Epic 8, branch `plan/epic-8-guest-requests`

## 2026-10-12 — Epic 9 (Landingsside, Target 4) skrevet uten elicitation

**Prompt:** «Epic 8, 9 og 10 skrives som Target … kjør uten Elicitation i denne omgangen og ta utgangspunkt i at jeg støtter anbefalingene som gis.» (Kjørt over natten mens jeg sov.)
**KI foreslo:** Seks stories: redigeringsflaten for Sted/Meny/Praktisk info, ✦ utkast og omskriving av About med tone-hint, Programmet bygget live fra oppgaver merket for gjesteprogrammet, publisering til et uforanderlig snapshot, den gjestevendte landingssiden, og en sjekk mot flaggskip-scenarioet. KI la `landing_pages` under events-modulen og `landing_snapshots` under guests-modulen (eid av funksjonen `guests_publish_landing` som AD-12 allerede navngir), slik at en Rolle-innehaver kan lese det publiserte Programmet uten skriverett, og slik at «Preview as guest» alltid beregnes likt som en reell publisering.
**Min vurdering:** Ikke vurdert ennå; anbefalingene er lagt inn som standardvalg og må gjennomgås av meg i PR-en. Jeg bekrefter eller endrer: modul-eierskapet mellom `landing_pages` og `landing_snapshots`, og at Rolle-innehavere får lese (men ikke redigere) landingssiden.
**Spor:** `epics.md` › Epic 9, branch `plan/epic-9-landing`
