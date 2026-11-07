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
**Min vurdering:** Vurdert 2026-10-13. Alle anbefalte standardvalg bekreftet: `landing_pages` under events-modulen og `landing_snapshots` under guests-modulen, og Rolle-innehavere får lese, men ikke redigere, landingssiden.
**Spor:** `epics.md` › Epic 9, branch `plan/epic-9-landing`

## 2026-10-12 — Epic 10 (Varsler og kanaler, Target 3) skrevet uten elicitation

**Prompt:** «Epic 8, 9 og 10 skrives som Target … kjør uten Elicitation i denne omgangen og ta utgangspunkt i at jeg støtter anbefalingene som gis.» (Kjørt over natten mens jeg sov.)
**KI foreslo:** Ni stories: kanalpreferanser, web push med 410-opprydding, at beslutningsvarslene fra Epic 4 blir reelle, e-post på rolleinvitasjoner og personlige gjestelenker, en selvbetjent frisk lenke for gjester, kunngjøringer med mottakerscoping per Rolle, «I can help»/tildeling i ett steg, manuell påminnelse (FR17), og en sjekk mot flaggskipet. KI fant at Story 4.10 og 4.11s `decision_requested`/`decision_resolved`-kall ble skrevet uten samme «(Target 3)»-sperre som Story 4.5 bruker for `task_assigned`, og satte dette opp som et `bmad-correct-course`-punkt mot Epic 4 i stedet for å rette det direkte i et dokument KI ikke skal redigere under denne kjøringen.
**Min vurdering:** Vurdert 2026-10-13. Alle anbefalte standardvalg bekreftet: kunngjøringer til Rolle-innehavere er scopet til egen Rolle, e-post på gjestelenker er et tillegg til kopiering, og Epic 4-sperre-funnet rettes i `bmad-correct-course`-PR-en.
**Spor:** `epics.md` › Epic 10, branch `plan/epic-10-announcements`

## 2026-10-13 — Epic 11 (Klar for lansering, Core) skrevet med fem elicitation-metoder

**Prompt:** «Epic 11 som Core … kjør de mest hensiktsmessige elicitationene, inntil 5 modeller.» Kjørt av KI alene fordi jeg sov.
**KI foreslo:** Security Audit Personas, Failure Mode Analysis, Pre-mortem Analysis, Boundary & Edge Case Sweep og Assumption Audit, samme sett som Epic 7. Funn som endret stories: den ukentlige `pg_dump`-jobben er selve holde-i-live-mekanismen fordi den spør databasen og nullstiller 7-dagers-pausen, så sjekklistepunktet om å åpne prosjektet dagen før sensur ble gjort til et andre, uavhengig sikkerhetsnett i stedet for den eneste; en backup tatt før en gjest sin 15-dagers-sletting beholder dataene en stund etter at raden er borte, skrevet ned som en akseptert, avgrenset unntak i stedet for løst; CI-jobben som pusher migrasjoner til `main` kjører aldri `seed.sql`, og seed-skriptet sjekker for sitt eget flaggskip-Event før det setter inn rader, slik at en ny kjøring eller en vanlig merge ikke kan duplisere flaggskipet; den ene lovlige AI-kallet i produksjon gjenbruker sin `request_key` ved en eventuell retry og sjekkes med margin til takhøyden, og er markert «ikke relevant ennå» hvis Core lanseres før noe Target-arbeid er bygget; og gjestelenken README og den avsluttende sjekken bruker kopieres på nytt rett før den brukes, i tilfelle en tidligere manuell gjennomgang allerede har forbrukt den.
**Min vurdering:** Vurdert 2026-10-13. Alle anbefalte standardvalg bekreftet: ukentlig backup dekker holde-i-live uten egen jobb, gamle backup-er kan en tid holde på slettede gjestedata som en avgrenset aksept, og AI-sjekken utsettes til Target-arbeid finnes.
**Spor:** `epics.md` › Epic 11, branch `plan/epic-11-launch`

## 2026-10-13 — Correct course: rettighetsmodell, gjestedata og Epic 7-omfang

**Prompt:** «Jeg har vurdert alle punkter og bekrefter valgene som anbefales. Flytt 4 av de minst viktigste storiesene i Epic 7 til target … kjør A som en samlet correct course.»
**KI foreslo:** Én modell for alle åtte åpne punkter: AD-2-funksjonene er `security definer` og gis til `authenticated` med autorisasjon fra `auth.uid()`, mens bare systemfunksjoner er avskåret. Det løser Epic 4, 6, 7 og 8 samtidig, gjør at `route-request` kjører under gjestens egen økt uten systemkaller, og at auth-brukere slettes i SQL slik at hemmelig nøkkel bare brukes tre steder. KI foreslo også å flytte 7.2, 7.6 og 7.9, og la frem 7.4 mot 7.7 og 7.5 som fjerde story fordi 7.9 ikke kan stå uten 7.4.
**Min vurdering:** Godtatt. Jeg valgte 7.4 (allergi, mat og hotell), slik at Core ikke samler helsedata og ikke trenger noen retention-jobb. Kostnaden er at flaggskip-scenarioets allergi-steg blir Target 2 og at Core sletter gjestedata bare på forespørsel eller når Eventen slettes. `AGENTS.md` må oppdateres etterpå fordi den fortsatt sier fire steder for hemmelig nøkkel.
**Spor:** `sprint-change-proposal-2026-10-13.md`, branches `plan/epic-7-guests` og `plan/correct-course-privilege-and-scope`

## 2026-10-13 — Sluttvalidering av epics (steg 4)

**Prompt:** «Start validering» og deretter «Kjør det øvrige, commit og push» (sprint planning venter til en fersk kontekst).
**KI foreslo:** Skriptet sjekket FR1–FR23, NFR og UX-DR mot stories, fremoverreferanser og Core-stories som avhenger av Target-stories. Dekningen var komplett, men Story 11.1 (Core) forutsatte nodemailer, dagstak, varsellinje og Vault-verdier fra Story 3.2–3.4 (Target 3), som ikke finnes i Core. UX-DR17 og UX-DR18 var ikke sitert i noen story. KI foreslo å begrense 11.1 til SMTP i Supabase Auth og flytte resten til Target 3, og å tagge de to UX-DR-ene.
**Min vurdering:** Godtatt. Rettelsen i 11.1 retter også «fire steder» til «tre» etter correct-course. Sprint planning kjøres i fersk kontekst.
**Spor:** branch `plan/validate-epics`


## 2026-10-13 — Sprint planning: sprint-status.yaml for alle 11 epics

**Prompt:** «/bmad-sprint-planning» i fersk kontekst, etter at sluttvalideringen av epics var merget.
**KI foreslo:** Klarhetssjekken fikk PASS uten ny gjennomgang, fordi sluttvalideringen samme dag allerede hadde dekket FR1–FR23, fremoverreferanser og Core/Target-avhengigheter. Skriptet genererte `sprint-status.yaml` fra `epics.md`: 11 epics og 98 stories som `backlog`, og 11 retrospektiver som `optional`. Ti overskrifter ble ikke tolket (dokumenttittel, «Epic List» og «Carry-forwards from Epic N»); KI vurderte dem som ikke-stories og lot dem stå. Filen ble lagt på en egen `plan/`-gren fra `main`, siden `main` ikke skal endres direkte.
**Min vurdering:** Godtatt. Jeg ba KI pushe grenen og åpne en PR som jeg gjennomgår og merger selv. Neste steg er Story 1.1 med egen issue og `feat/1.1-…`-gren.
**Spor:** `_bmad-output/implementation-artifacts/sprint-status.yaml`, commit 2ed8833, branch `plan/sprint-status`

## 2026-10-13 — Story 1.1: appen kjører lokalt på den låste stacken

**Prompt:** «/bmad-build på Story 1.1», med ferdig spec `spec-1-1-app-runs-locally-on-the-pinned-stack.md`.
**KI foreslo:** Scaffold av Next.js 16.3 for hånd (mappen var ikke tom); `components.json` skrev KI først for hånd uten å prøve `shadcn init`, og jeg påpekte avviket. Ved kjøring feilet init på pnpm 12 sitt byggescript-avslag for `unrs-resolver` (løst med `allowBuilds: false`), og den byttet `cn` ut med npm-pakken `cn`, la til Geist fra Google Fonts og en ubrukt Button; KI rullet de tre tilbake (clsx/tailwind-merge, systemfont, ingen Google-behandler) og beholdt `components.json` og tokens fra init, en Zod-env med klient- og serverdel som avviser `ANON_KEY` og `SERVICE_ROLE_KEY`, og en liten lokal ESLint-regel som feiler når en `"use client"`-fil importerer serverdelen eller nevner `SUPABASE_SECRET_KEY` (AD-5). pnpm, gitleaks og Supabase CLI ble installert med Homebrew etter spec. ESLint ble satt til 9 fordi eslint-plugin-react ikke virker med 10. CI bruker gitleaks-binæren, ikke action-en, som krever lisens for organisasjoner. Corepack følger ikke med Node 25+, så README ber om `brew install corepack`.
**Review:** Tre uavhengige review-agenter ga 26 funn. KI rettet 9 (blant dem at AD-5-regelen slapp gjennom destrukturering, re-eksport og dynamisk import, og at den ikke hadde noen test), utsatte 2 og avviste resten med begrunnelse i spec-ens triage-logg.
**Min vurdering:** Det var bra jeg fikk feilsøkt Corepack for å muliggjøre avvisning av npm og yarn. Det gjorde at resten av steget gikk greit.
**Spor:** branch `feat/1.1-app-runs-locally`, issue #17

## 2026-10-14 — Story 1.2: designsystem og språkgrunnlag

**Prompt:** «/bmad-build på story 1.2», med spec `spec-1-2-design-system-and-language-foundation.md` godkjent uten endringer.
**KI foreslo:** DESIGN.md-tokens som `light-dark()`-verdier, slik at mørkt tema følger OS uten duplisert blokk og `data-theme` er klar for Story 1.9; next-intl uten locale i URL, der første `Accept-Language`-tag gir `nb` for nb/nn/no og ellers `en`; hopp-lenke, landemerker, tittelmønster og fokus til `h1` ved rutebytte; én `StatusLabel` med de 11 statusene. Underveis feilet byggingen på at tittelmalen i layouten ikke gjelder rotsiden (hver side setter nå hele tittelen), og `next dev` la igjen nextjs-agent-rules-blokken i `AGENTS.md`, som KI rullet tilbake siden den allerede ligger i `deferred-work.md`.
**Review:** Tre uavhengige review-agenter ga flere titalls funn. KI rettet 7 (blant dem at `main` ikke kunne få fokus fra hopp-lenken, at `muted` pekte på Blocked-fargen, og at statustestene bare sjekket én status), utsatte 2 (e2e i CI hører til Story 1.3, `RouteFocus`-test venter på rute nummer to) og avviste resten med begrunnelse i spec-ens triage-logg. Funnet om manglende ikon på `atRisk` og `newItem` ble avvist fordi DESIGN.md oppgir «none» for dem.
**Min vurdering:** Ingen merknader til selve storyen. Jeg vil sette VS Code i Bypass mode for å kunne jobbe parallelt med andre prosjekter. Det blir en egen innsats før neste story.
**Spor:** branch `feat/1.2-design-system-and-language-foundation`, issue #20

## 2026-10-14 — Story 1.3: kvalitetsportene kjører på hver push

**Prompt:** «Implementer spec-1-3-quality-gates-run-on-every-push.md», spec som eneste kilde.
**KI foreslo:** `checks`-jobben utvidet med `tsc --noEmit`, lokal Supabase i Docker, pgTAP, sjekk av genererte typer (regenerert fil mot `src/types/database.ts`, feiler med instruks) og Playwright med `.env.local` fra `.env.example` pluss hemmelig nøkkel fra `supabase status -o env`. En egen `deploy`-jobb (`needs: checks`, kun push til `main`) holder de tre skyhemmelighetene i `env`, hopper over med merknad når en mangler, og kjører ellers `supabase link` og `supabase db push`. `database.ts` er generert fra det tomme skjemaet og ignorert av Prettier og ESLint, slik at diffen sammenligner rå utdata.
**Min vurdering:** NIL
**Spor:** branch `feat/1.3-quality-gates-run-on-every-push`, issue #22

## 2026-10-14 — Story 1.4: opprett konto med e-post

**Prompt:** «/bmad-build på story 1.4», spec skrevet av KI og godkjent etter at jeg valgte alternativ C for limiteren.
**KI foreslo:** Rate-limiteren som `security invoker`-funksjon `abuse_hit` med en tellertabell der `anon` bare har INSERT og UPDATE på `hits` (ingen definer, ingen hemmelig nøkkel, ingen AD-endring), passordregel på 8 tegn med bokstav og tall like i Zod, regelliste og `config.toml`, `proxy.ts` som bare fornyer cookien, og en `signUp`-action med `{ ok, data }`-svar. Underveis viste e2e at Auth svarer annerledes på en ny registrering av en ubekreftet e-post innen ett minutt (`over_email_send_rate_limit`); KI mappet den ene koden til suksess, så svaret fortsatt er likt (AD-4).
**Min vurdering:** NIL
**Spor:** branch `feat/1.4-create-an-account-with-email`

## 2026-10-14 — Story 1.5: logg inn, logg ut og tilbakestill passord

**Prompt:** «Implementer spec-1-5-log-in-log-out-and-reset-password.md», spec som eneste kilde.
**KI foreslo:** `logIn`, `resendVerification`, `forgotPassword`, `updatePassword` og `logOut` i `src/modules/auth`, med én felles limiter-hjelper med `signUp`, `passwordSchema` og `safeNext` i schemas, `/auth/reset` som bytter PKCE-koden mot en sesjon, og beskyttet `/events` via `getClaims()`. Underveis viste e2e at `abuse_hit` bare godtar bøttene `signup_ip` og `signup_email` (check-constraint), og spec forbyr ny migrasjon; KI lot derfor alle flyter dele de to bøttene i stedet for å legge til nye. Oppsummeringen i Auth krever 60 sekunder mellom e-poster, så e2e for *Resend* venter ut vinduet.
**Review:** Fire uavhengige review-lag ga 45 funn. KI rettet åtte (blant dem åpen redirect via kontrolltegn i `safeNext`, at et tilbakestilt passord ikke avsluttet andre økter, og at en Auth-feil felte hele layouten), utsatte to (delte limiter-bøtter og skyens redirect-liste) og avviste resten med begrunnelse i spec-ens triage-logg.
**Min vurdering:** NIL
**Spor:** branch `feat/1.5-log-in-log-out-and-reset-password`, issue #26

## 2026-10-15 — Story 1.6: logg inn med Google eller GitHub

**Prompt:** «Implementer spec-1-6-sign-in-with-google-or-github.md», spec som eneste kilde.
**KI foreslo:** `signInWithProvider` (Zod på leverandør, `Origin` som `redirectTo`, `skipBrowserRedirect` og `redirect(data.url)`), `/auth/callback` som bytter koden og mapper feil til `/login?oauth=…`, to knapper på logg inn og opprett konto, og en tilstandsløs mock-GitHub-server som lokal Auth peker på, styrt av en `mock_identity`-cookie. Underveis viste e2e to feil i mocken: id-en kollidert fordi en hash ble flyttall (alle brukere ble samme konto), og `/user` med `email` ble stolt på som verifisert. Auth sender også `access_denied` med «Unverified email» som beskrivelse, så callbacken sjekker beskrivelsen før feilkoden. Auth beholder en ubekreftet rad for uverifisert e-post, så testen krever at ingen er bekreftet i stedet for null rader. Google testes manuelt med ekte nøkler.
**Min vurdering:** NIL
**Spor:** branch `feat/1.6-sign-in-with-google-or-github`

## 2026-10-15 — Story 1.7: app-skall og Alle arrangementer

**Prompt:** «Implementer spec-1-7-app-shell-and-all-events.md», spec som eneste kilde.
**KI foreslo:** Rotlayouten som skall-bryter på `getClaims()`: sidemeny (`AppNav`, delt klientkomponent) fra 1024px, og under det en menyknapp etter `{children}` i `main` som åpner shadcn `Sheet` fra høyre. Tom tilstand «La oss planlegge noe.» på `/events`, personvernside på `/privacy` og bunntekst med lenke på alle sider. Underveis la shadcn-CLI-en til en feil `cn`-pakke og glemte `@base-ui/react`; KI rettet importen til `@/lib/utils` og la til base-ui. En lenke til samme side endrer ikke `pathname`, så Sheet lukkes også på klikk, og `RouteFocus` flytter da ikke fokus til `h1` i det tilfellet.
**Min vurdering:** Jeg valgte `bmad-build-auto`, som gjennomfører spec, implementering og review i én kjøring per story. Det er nødvendig med tanke på behandlingstid per story og tiden jeg har til rådighet.
**Spor:** branch `feat/1.7-app-shell-and-all-events`

## 2026-10-15 — Story 1.8: tilbakemeldings- og tilstandsprimitiver

**Prompt:** «Implementer spec-1-8-feedback-and-state-primitives.md», spec som eneste kilde.
**KI foreslo:** Sonner-vert i rotlayouten, `undoToast` (10 s) og `saveFailedToast` i `src/lib/feedback.ts`, F6-håndterer som fokuserer Sonners toast-liste, `Skeleton`-lasting og `LoadError` med *Prøv igjen* på `/events`, og ett felles frakoblet-varsel via `useSyncExternalStore`. Underveis la shadcn-CLI-en til feil pakke `cn` og `next-themes`; KI rettet importen til `@/lib/utils`, fjernet begge og satte `theme="system"`. Sonner har ingen `role`-innstilling, så `role="alert"` ligger på selve meldingselementet i lagringsfeil-toasten. Vitest tok bare `.test.ts`, så mønsteret ble utvidet til `.tsx`.
**Min vurdering:** Jeg valgte `bmad-build-auto`, som gjennomfører spec, implementering og review i én kjøring per story, på grunn av behandlingstid per story og tiden jeg har til rådighet.
**Spor:** branch `feat/1.8-feedback-and-state-primitives`

## 2026-10-15 — Story 1.9: profil og innstillinger

**Prompt:** «Implementer spec-1-9-profile-and-settings.md», spec som eneste kilde.
**KI foreslo:** Siden `/profile` med seks seksjoner (navn, e-post, passord, tilkoblede kontoer, språk, utseende) og seks Server Actions i `src/modules/auth`. Navn, språk og utseende ligger i Auth `user_metadata` og leses fra `getClaims()`, så det trengs ingen tabell eller migrasjon; etter hver skriving kalles `refreshSession()` og `revalidatePath`. Kontoer kobles med `linkIdentity` og en kortlivet `oauth_next`-cookie som lar `/auth/callback` sende brukeren tilbake til `/profile`, siden `redirectTo` ikke kan bære en query. Lokale radiogrupper sender skjemaet ved endring. Underveis viste e2e at bekreftelseslenken fra e-post ikke logger brukeren inn, så testene logger inn etter bekreftelse.
**Min vurdering:** Jeg valgte `bmad-build-auto`, som gjennomfører spec, implementering og review i én kjøring per story, på grunn av behandlingstid per story og tiden jeg har til rådighet.
**Spor:** branch `feat/1.9-profile-and-settings`

## 2026-10-17 — Story 1.10: grenser per flyt for misbrukstelleren

**Prompt:** «Implementer spec-1-10-per-flow-limiter-buckets.md», spec som eneste kilde.
**KI foreslo:** En migrasjon som bytter sjekken på `abuse_counters.bucket` med en formsjekk (`^[a-z0-9_]{1,32}$`), og `limit(flow, …)` i `src/modules/auth/actions.ts` som teller i `<flow>_ip` og `<flow>_email` for `signup`, `resend` og `forgot`, med uendrede grenser. pgTAP viser et godtatt og to avviste navn og at `signup_email` ikke bruker opp `forgot_email`; Vitest sjekker eksakt bucket per handling og tre flyter etter hverandre.
**Min vurdering:** Jeg valgte `bmad-build-auto`, som gjennomfører spec, implementering og review i én kjøring per story, på grunn av behandlingstid per story og tiden jeg har til rådighet.
**Spor:** branch `feat/1.10-per-flow-limiter-buckets`

## 2026-10-18 — Story 2.1: arrangementstabell og tilgang bare for Organizer

**Prompt:** «/bmad-build-auto på story 2.1».
**KI foreslo:** Én migrasjon med `public.events`: RLS, `select` og `update (name)` som eneste rettigheter for `authenticated`, sjekken `events_publishable` som bare krever navn, tider, tidssone og språk når `published_at` er satt, hjelperen `is_organizer` (stable, security invoker) og `events_create()` uten argumenter (security definer), som setter `organizer_id` fra `auth.uid()`. Policyene på `events` sammenligner `organizer_id` direkte i stedet for å kalle `is_organizer`, fordi en security invoker-hjelper som leser `events` ville gått i rekursjon under RLS. AD-3 sier at alle policyer bruker hjelperne, så KI foreslår `bmad-correct-course` for å avklare ordlyden. pgTAP dekker hver tillatelse og hvert avslag, og `src/types/database.ts` er regenerert.
**Review:** Fire uavhengige review-lag. KI la til tester for `is_organizer` uten RLS-filter, for hvert påkrevd felt ved publisering, for AD-11-regelen om fremmednøkler til `auth.users` og for anons avslag ved faktiske kall, og avviste blanke navn. AD-3-spørsmålet ble utsatt til eieren. Resten ble avvist med begrunnelse i spec-ens triage-logg.
**Min vurdering:** NIL
**Spor:** branch `feat/2.1-events-table-and-organizer-only-access`, issue #40

## 2026-10-19 — Story 2.2: spørreskjema med strukturerte svar

**Prompt:** «Er vi klare for bygging av story 2.2?», deretter «ja, gjør alt som trengs» og godkjenning av spec-en i `bmad-build`.
**KI foreslo:** Issue #43 og story-grenen, så en spec med to åpne spørsmål jeg svarte på: ett skjema for steg 1 i stedet for ett spørsmål per skjerm, og en enkel *Create new event*-knapp på `/events` til 2.3 og 2.4 finnes. Én migrasjon legger til svarkolonnene og funksjonen `events_save_questionnaire`. «Ikke sikker ennå» lagres som en nøkkel i `unknown_answers` med null i verdikolonnen, slik at «aldri spurt» og «usikker» holdes adskilt og Epic 4 leser ett felt. En CHECK hindrer at en verdi og nøkkelen står samtidig, og en annen at fristen kommer etter arrangementsdagen i arrangementets tidssone. Zod, Server Actions, skjemaet med inline feil, pgTAP, Vitest og Playwright dekker flyten. Skjemastiler og `Result` ble flyttet til felles filer (Epic 1-retro A4).
**Review:** Tre uavhengige subagenter ga 27 funn. KI rettet ni: `ends_at` overskrives ikke når start og varighet er uendret, Zod bruker samme tidssoneliste som skjemaet, klasse 22-feil vises som ugyldig input, og e2e dekker svar etter omlasting. Tretten ble avvist med begrunnelse i spec-ens triage-logg. KI antok først at fokus flyttes til `h1` etter opprettelse. Målingen viste en full sideinnlasting, der fokus ligger på hopp-lenken etter UX-DR25, så antakelsen ble droppet. `next dev` skrev en blokk inn i `AGENTS.md`; den ble ikke committet.
**Min vurdering:** NIL
**Spor:** branch `feat/2.2-questionnaire-with-structured-answers`, issue #43

## 2026-10-19 — Story 2.3: utkast som aldri går tapt

**Prompt:** «Ja iverksett» på story 2.3, og godkjenning av spec-en i `bmad-build`.
**KI foreslo:** `events_create` returnerer brukerens blanke utkast i stedet for å sette inn et nytt, bak en advisory lock per Organizer, uten ny kolonne og uten ny signatur. Jeg svarte på ett åpent spørsmål: steg 1 lagres bare ved *Neste*, så det som er skrevet i et uferdig steg går tapt ved lukking. Utkast vises som lenker «Draft · continue setup» på `/events` (kortene kommer i 2.4). `callSafely` gjør en nettverksfeil om til «kunne ikke lagre» slik at skjemaet beholder verdiene, og nettleseren som kommer online igjen prøver én gang til. pgTAP viser at en navneendring og en spørreskjema-lagring ikke overskriver hverandre, Playwright dekker dobbeltklikk og offline.
**Review:** Tre uavhengige subagenter ga 36 funn. KI rettet åtte: Retry sender det som står i skjemaet nå, ikke svarene fra den mislykkede lagringen, låsetesten sjekker nøkkelen, og en ny kolonne på `events` bryter testen til blank-sjekken er oppdatert. To ble utsatt (to-tilkoblings-test av kappløpet, og at publiserte Events ikke vises som utkast), åtte avvist. KI committet ved en feil blokken `next dev` skriver i `AGENTS.md`, fordi `git add -A` kjørte mens dev-serveren gikk. Review fant det, og filen er satt tilbake.
**Min vurdering:** CI feilet én gang på en e2e-test som ikke hører til denne storyen (`login.spec.ts`, ventetid på *Log out*), mens samme commit gikk grønt ved push. Jeg lot KI kjøre jobben på nytt og ba den deretter gjøre testen mer robust på forhånd (`test.slow()` og en eksplisitt venting på siden), i stedet for å vente på neste feil.
**Spor:** branch `feat/2.3-draft-that-is-never-lost`, issue #45, PR #46

## 2026-10-19 — Story 2.4: *All events* viser arrangementene mine

**Prompt:** «Gå over Specen og verifiser at alt er klart til build», deretter «Jeg støtter alle anbefalinger» og «Godkjenn og fortsett» i `bmad-build`.
**KI foreslo:** En sjekk før build fant at `cancelled_at` ikke fantes og at ingen publisert Event kan lages før 2.8. KI la fram ni valg, som jeg godtok. Én migrasjon legger til `cancelled_at` uten skriverett og skriver om `events_create`, slik at et avlyst blankt utkast aldri gjenbrukes. En ren funksjon, `groupEvents`, deler Events i kommende og tidligere og bestemmer rekkefølge og lenke. Den har Vitest for hver regel. Kortene har ett lenkenavn hver og holder av plass til tellesirkelen. *Create new event* er sist, og «Past events (N)» er en `<details>`. Interim-hjemmet ligger på `/events/[id]`, sidebaren har en event-gruppe (Overview og Questionnaire), og én `not-found.tsx` gir tilgangsmeldingen. E2e legger inn publiserte, passerte og avlyste Events via psql.
**Review:** To runder med tre uavhengige subagenter ga 41 funn. To var hull i intensjonen, og jeg avgjorde dem. Et utkast forblir redigerbart også etter at datoen har passert, slik at feil år kan rettes. En Event uten sluttid regnes som pågående i 24 timer. KI rettet tretten funn, blant annet stabil rekkefølge ved lik dato, *Retry* i stedet for «no access» ved databasefeil, `role="list"` for Safari og tester for det avlyste hjemmet. En `loading.tsx` for Event-sidene ble prøvd og fjernet, fordi den brøt `h1`-fokus ved navigasjon. Resten ble avvist med begrunnelse i spec-ens triage-logg.
**Min vurdering:** NIL
**Spor:** branch `feat/2.4-all-events-shows-my-events`, issue #47

## 2026-10-19 — Story 2.5: Roles fra Branch Pool

**Prompt:** «Gå gjennom 2.5», deretter «Program bør være med på seminar … Kjør A. Støtter alle anbefalingene.» og «Godkjenn og fortsett» i `bmad-build`.
**KI foreslo:** En sjekk før build fant at story-teksten ikke sa hva Branch Pool inneholder, hvilke Roles hver type får, eller hva «bare foreslår» betyr ved typeendring. Jeg valgte seks nøkler (Venue, Guests, Food & Beverage, Entertainment, Travel & Logistics, Program), en kobling per type og alternativ A: en ny type endrer bare Roles jeg ikke har rørt. Jeg la til at Program på et seminar betyr foredragsholdere og innlegg. Pool-en er en Postgres-enum, så de genererte typene er eneste TS-kilde. Koblingen ligger i `roles.ts` med Vitest og sendes inn i `events_save_questionnaire`, slik at lagring og aktivering skjer i én funksjon. `toggled_at` merker Roles jeg har endret, og `events_set_role_active` er eneste vei til å endre en Role. *Team & Roles* på `/events/[id]/team` har native brytere med «Suggested: on/off». pgTAP dekker tillatelse og avslag for alle veiene.
**Review:** Tre uavhengige subagenter ga 30 funn. KI rettet ti: bryteren beholder tastaturfokus mens den lagrer, låste brytere får en forklaring, Program-beskrivelsen flyttet inn i `roles.ts`, og flere tester dekker mislykket lagring, rekkefølge, utlogget bruker og tomme standardvalg. Ett ble utsatt (en test av backfill av gamle Events), og seks ble avvist med begrunnelse i spec-ens triage-logg. Under verifiseringen feilet de fleste e2e-testene fordi lokal Auth sin grense for registreringer var nådd etter tre kjøringer på rad. KI sjekket Auth-loggen, ventet ut vinduet og kjørte på nytt i stedet for å endre testene.
**Min vurdering:** NIL
**Spor:** branch `feat/2.5-roles-from-the-branch-pool`, issue #49

## 2026-10-19 — Story 2.6: Event settings med datoer, svarfrist og språk

**Prompt:** «/bmad-build-auto på story 2.6», kjørt uten avbrudd: KI skrev spec-en selv, en egen subagent implementerte den, og jeg sa «Sett i gang med det» for review.
**KI foreslo:** Én migrasjon med sjekken `events_starts_before_ends` og mutasjonsfunksjonen `events_update_schedule`, som er eneste skriver av start, slutt, tidssone, svarfrist og språk. Den leser lokale tider i arrangementets tidssone, setter `duration_minutes` til forskjellen når både start og slutt er satt, og fjerner nøklene for «Usikker ennå» som den fyller ut. En kommentar merker den som stedet der Epic 4 regner om frister. `events_save_questionnaire` beholder signaturen, men skriver tidsplanen bare gjennom den nye funksjonen. Fordi en CHECK gjelder etter hver setning, setter spørreskjemaet «RSVP ønsket» før svarfristen når en frist er oppgitt. *Event settings* på `/events/[id]/settings` har skjema med inline feil, «Settings saved.» og låste felt for et passert eller avlyst arrangement. `Field` er flyttet til `src/components/form.tsx`, og `signedIn`/`seed` til `e2e/support.ts`. pgTAP, Vitest og Playwright dekker hver rad i spec-ens tabell.
**Review:** Fire uavhengige subagenter (blind, kanttilfeller, verifiseringshull, samsvar med intensjonen) ga 26 funn, ingen høye eller middels. KI rettet seks: den lagrede tidssonen tilbys alltid, så en lagring aldri flytter arrangementet stille til UTC, «Settings saved.» leses opp hver gang, hint og read-only-forklaring er koblet til feltene, en tømt slutt tømmer også varigheten, og nye tester dekker et passert utkast og at B ikke kan skrive kolonnene direkte. Tjue ble avvist med begrunnelse i spec-ens triage-logg, blant annet sommertid-kanttilfeller og read-only i databasen (2.7). En full e2e-kjøring feilet sju tester fordi den gikk samtidig med at subagenten endret filer; en ny kjøring etterpå var grønn.
**Min vurdering:** NIL
**Spor:** branch `feat/2.6-event-settings-dates-rsvp-due-date-and-language`, issue #51

## 2026-10-19 — Story 2.7: avlys eller slett et arrangement

**Prompt:** Spec-en `spec-2-7-cancel-or-delete-an-event.md`, implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én migrasjon med kolonnen `cancellation_note` (1–500 tegn, uten skriverett), mutasjonsfunksjonene `events_cancel` og `events_delete`, og én trigger-funksjon på `events` og `roles` som gir `55000` når arrangementet er avlyst eller publisert og over. Triggeren dekker alle skrivere, også den direkte `name`-retten og publisering i 2.8, mens et passert utkast fortsatt kan endres. `events_delete` er merket som stedet der Epic 7 legger inn sletting av gjestedata. Server Actions `cancelEvent` og `deleteEvent` sjekker det skrevne navnet på serveren, slik at klienten ikke kan hoppe over det ved å kalle arrangementet et utkast. *Event settings* har en seksjon med *Cancel event*, *Delete event* og *Discard draft* i Base UI-dialoger med *Keep event*. pgTAP sjekker også at alle fremmednøkler til `events` er `ON DELETE CASCADE`, og testen av kolonnene i blank-utkast-sjekken fikk den nye kolonnen.
**Review:** Fire uavhengige subagenter (blind, kanttilfeller, verifiseringshull, samsvar med intensjonen) ga funn samlet i 29 rader, ingen høye eller middels. KI rettet sju: kommentaren i `deleteEvent` lover ikke lenger at navnesjekken ikke kan omgås (Organizer kan kalle `events_delete` direkte, så navnet er en bekreftelse, ikke en sikkerhetsregel), de tre eldre handlingene viser «kan ikke endres lenger» i stedet for «prøv igjen» når triggeren svarer `55000`, slettedialogen tømmer navnet når den lukkes, notatfeltet har `maxLength`, og nye tester dekker at et avsluttet arrangement ikke kan avlyses, at anon nektes `events_cancel`, en feilet oppslag i `deleteEvent` og at bare *Delete event* vises for et avsluttet arrangement. Rettingen avslørte også at pgTAP-oppsettet la inn roller for alle arrangementer i databasen, ikke bare testbrukerens. Ti funn var feil og tolv ble avvist med begrunnelse i spec-ens triage-logg, blant annet at triggeren senere også vil stoppe systemjobber (Epic 7 avgjør unntaket). Den manglende `notifications_emit`-stubben er utsatt. En full e2e-kjøring feilet én innloggingstest som ikke berøres av endringen; den gikk grønt ved ny kjøring.
**Min vurdering:** NIL
**Spor:** branch `feat/2.7-cancel-or-delete-an-event`, issue #53

## 2026-10-19 — Story 2.8: beskrivelse og publisering til teamet

**Prompt:** Spec-en `spec-2-8-description-and-publish-to-the-team.md`, implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én migrasjon med kolonnen `description` (1–2000 tegn etter trim), `grant update (name, description)` og mutasjonsfunksjonen `events_publish`, som sjekker `is_organizer`, låser raden, nekter et avlyst arrangement med `55000` og setter `published_at` bare når den er tom, så et nytt kall ikke endrer noe. Sjekken `events_publishable` alene avgjør om utkastet er komplett; `missingForPublish` i `list.ts` speiler den bare for å formulere listen over det som mangler. Migrasjonen skriver også om `events_create` slik at et utkast med bare en beskrivelse ikke gjenbrukes som blankt. Den første versjonen tok utgangspunkt i en eldre `events_create` og fjernet dermed Roles-oppsettet fra 2.5; pgTAP fanget det, og funksjonen bygger nå på siste versjon. Steg 3 (*Name and description*) på `/events/[id]/setup/description` lagrer navn og beskrivelse med én direkte oppdatering, og steg 1 sin *Next* åpner steg 3 i stedet for `/events?saved=1`. Feil-toasten med *Retry* fra steg 1 er flyttet til en delt hook, `useSaveFeedback`. Event-hjemmet viser banneret «Only your team can see this event.» med *Publish* i en Base UI-dialog som lister det som mangler, eller lover at gjestene ikke er invitert ennå. pgTAP, Vitest og Playwright dekker radene i spec-ens tabell, og fire eldre pgTAP-tester fikk `description` i listen over skriverettigheter.
**Review:** Fire uavhengige subagenter (blind, kanttilfeller, verifiseringshull, samsvar med intensjonen) ga 34 funn, ingen høye eller middels. KI rettet ni: kommentaren på `events_publish` påsto at et avsluttet utkast ikke kan publiseres (det kan det, og blir da skrivebeskyttet), meldingen om manglende felt sendte brukeren til innstillingene selv om navnet står på steg 3, et tømt navn på et publisert arrangement gir nå feil på navnefeltet, publiseringsdialogen glemmer forrige feil når den lukkes, beskrivelsesfeltet fikk `maxLength`, `setupPath`-kommentaren lover ikke lenger noe 2.8 ikke bygde, og nye tester dekker at et utkast med bare beskrivelse ikke gjenbrukes, at steg 3 sender avlyste og avsluttede arrangementer til hjemmet, og at en utdatert fane får listen over det som mangler. Ti funn var feil (blant annet at start etter slutt kan gi en tom liste, men en sjekk fra 2.6 hindrer den raden) og ti ble avvist med begrunnelse i spec-ens triage-logg, blant annet en sperre mot å publisere et utkast som allerede er over.
**Min vurdering:** NIL
**Spor:** branch `feat/2.8-description-and-publish-to-the-team`, issue #55

## 2026-10-20 — Story 2.9: legg til gjester for hånd

**Prompt:** Spec-en `spec-2-9-add-guests-by-hand.md`, implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én migrasjon med tabellene `guests` (navn) og `guest_contacts` (e-post), der en sammensatt fremmednøkkel `(guest_id, event_id)` hindrer at en kontakt peker på en gjest i et annet arrangement, og en unik indeks på `(event_id, lower(email))` stopper duplikater ved samtidige faner. Begge tabellene har RLS med `is_organizer` og bare lesetilgang. Mutasjonsfunksjonen `guests_add` sjekker `is_organizer`, nekter mer enn 200 rader, låser arrangementet, bruker samme read-only-regel som triggeren fra 2.7 (som ikke kan vokte en INSERT), og hopper over e-poster som allerede står på listen i hver sin unntaksblokk, slik at et tapt kappløp rapporteres som duplikat i stedet for feil. `events_create` regner nå et utkast med gjester som ikke blankt. Den rene funksjonen `parseGuestRows` leser `Navn <e-post>` eller navn og e-post delt ved siste tab, komma eller semikolon, sjekker hver rad med Zod og gir en grunn per mislykket linje. Hver gyldig rad beholder også linjen sin, slik at et tapt kappløp kan vises på samme linje som brukeren skrev. Steg 2 på `/events/[id]/setup/guests` og den nye *Guests*-siden deler skjema og liste; tekstfeltet beholder bare linjene som feilet, med fokus og `aria-invalid`. «Not invited yet» er lagt til som status i det felles statusvokabularet. Logger har bare arrangement-id, bruker-id og feilkode. pgTAP, Vitest og Playwright dekker radene i spec-ens tabell, og e2e-testene som gikk rett fra steg 1 til steg 3 går nå via steg 2.
**Review:** Fire uavhengige subagenter (blind, kanttilfeller, verifiseringshull, samsvar med intensjonen) ga 25 funn, ingen høye eller middels. KI rettet ti: `guests` fikk indeks på `(event_id, created_at)`, `created_at` bruker `clock_timestamp()` så en innliming vises i skrevet rekkefølge, `"Berg, Ann" <ann@x.no>` lagres uten anførselstegn, grensen på 200 står bare ett sted i tekstene, statusmeldingen leses opp på nytt ved like resultater, et skrivebeskyttet arrangement uten gjester ber ikke lenger om å legge til gjester, og nye tester dekker at et utkast med passert dato og et publisert framtidig arrangement tar imot gjester, at `p_rows` som ikke er en liste avvises, rekkefølgen i listen, *Retry* uten nett og at et avlyst arrangement viser gjestene sine. Seks funn var feil (blant annet at «validert inline» skulle bety sjekk før innsending; prosjektet bruker ordet om feil ved feltet etter innsending) og ni ble avvist med begrunnelse i spec-ens triage-logg.
**Min vurdering:** NIL
**Spor:** branch `feat/2.9-add-guests-by-hand`, issue #57

## 2026-10-20 — Story 2.10: endre og fjerne gjester

**Prompt:** Spec-en `spec-2-10-edit-and-remove-guests.md`, implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én migrasjon med mutasjonsfunksjonene `guests_update` og `guests_remove`. Begge leser arrangementet fra gjesteraden i stedet for å stole på en id fra kalleren, gir `42501` både for en ukjent gjest og for en som ikke er Organizer (så id-er ikke kan prøves ut), låser arrangementet og bruker samme read-only-regel som `guests_add`. `guests_update` skriver navn og e-post i samme transaksjon, slik at en opptatt e-post ikke etterlater en halv endring; derfor er det ingen nye skriverettigheter på tabellene. `guests_remove` sletter for godt, kontakten går med på kaskade, og en kommentar peker på `guests_delete_guest_data` i Epic 7. `rowSchema` er eksportert som `guestSchema`, så endring bruker samme validering som innlegging. Tre nye Server Actions (`updateGuest`, `removeGuest`, `restoreGuest`) deler innloggingssjekk og en logger med bare id-er og feilkode med `addGuests`. Radene i gjestelisten er en klientkomponent: *Edit* åpner et skjema i raden med fokus på *Name*, og *Remove* skjuler raden straks med `useOptimistic`, flytter fokus til neste rad, og viser en *Undo*-toast i 10 s som legger til samme navn og e-post igjen nederst i listen. pgTAP, Vitest og Playwright dekker radene i spec-ens tabell, også 40 gjester ved 320px.
**Review:** Fire uavhengige subagenter (blind, kanttilfeller, verifiseringshull, samsvar med intensjonen) ga 26 funn, ingen høye eller middels. Tre av dem fant først ingen diff fordi Playwright tømte `test-results/`, så de ble kjørt på nytt mot en kopi i `out/`. KI rettet seks: fokus etter *Remove* faller tilbake til sidens `h1` når naborader mangler eller står åpne i redigering (og en død gren til listeoverskriften er fjernet), en fjerning som avvises som ikke tillatt eller skrivebeskyttet sier det i stedet for «prøv igjen», pgTAP dekker nå begge halvdeler av read-only-regelen i begge funksjonene, Vitest sjekker at fjern- og angre-loggene ikke har navn eller e-post, og e2e dekker *Undo* etter at e-posten er lagt inn på nytt og redigeringsskjemaet ved 320px. Åtte funn var feil (blant annet en gjest uten kontaktrad, som ikke kan oppstå) og tolv ble avvist med begrunnelse i spec-ens triage-logg, blant annet at *Undo* gir gjesten ny id og plass nederst i listen.
**Min vurdering:** NIL
**Spor:** branch `feat/2.10-edit-and-remove-guests`, issue #59

## 2026-10-22 — Epic 2: retrospektiv og manuell test

**Prompt:** Kjør retrospektiv på Epic 2, og gi meg en steg-for-steg-guide basert på README så jeg kan teste appen selv.
**KI foreslo:** En retrospektiv med kilde til hvert funn (`epic-2-retro-2026-10-20.md`). Hovedfunnene var at CI på `main` har vært rød gjennom hele epicen, så ingenting er deployet, og at utkast-kortet ikke åpner det siste ufullførte steget. Elleve tiltak (B1–B11) og en verdict med åpne punkter fulgte. Deretter en guide fra README på en ny klone. Testen ga fem funn:
- forsiden for besøkende som ikke er logget inn viser bare en tittel og én setning;
- den hemmelige nøkkelen må kopieres for hånd fra `supabase status` til `.env.local`;
- klonen deler `project_id` og Docker-volum med andre utsjekker, og en annen lokal Supabase kan holde portene;
- innlogging med Google (`401 invalid_client`) og GitHub (`DNS_PROBE_FINISHED_NXDOMAIN`) virker ikke lokalt, fordi oppsettet bare er laget for de automatiske testene;
- gjestesiden mangler mye, og det er planlagt i Epic 7 (Story 7.7).

**Min vurdering:** Etter Epic 2 er skjelettet på plass. Det er likevel mye som gjenstår, både visuelt og funksjonelt. Visuelt ser det per nå primitivt ut og oppleves derfor lite brukervennlig. Dette blir avsluttende arbeid når funksjonene er på plass og virker, etter Epic 7. Vi holder oss til den opprinnelige planen.
**Spor:** PR #61 (retrospektiv), PR #62 (B1), branch `docs/epic-2-owner-assessment`

## 2026-10-25 — Story 2.3 (rettelse): utkast-kortet åpner første ufullførte steg

**Prompt:** «kjør!» på tiltak B3 fra retrospektiven for Epic 2: utkast-kortet skal åpne det første ufullførte steget, slik story 2.3 lover.
**KI foreslo:** En ren funksjon `draftPath` i `src/modules/events/list.ts` som leser utkastet. Den åpner steg 1 til spørreskjemaet er lagret (en type eller et «Not sure yet»), steg 2 til det finnes en gjest eller et navn, steg 3 til navnet er satt, og deretter arrangementets hjemside, der *Publish* ligger. Spørringen på *Alle arrangementer* henter `event_type`, `unknown_answers` og antall gjester. Appen lagrer ikke hvilket steg brukeren sist var på, så «første ufullførte steg» utledes av dataene. Vitest dekker hver regel, og e2e-testen for utkast følger nå kortet til steg 2.
**Min vurdering:** NIL
**Spor:** branch `fix/2.3-draft-opens-first-incomplete-step`, issue #64

## 2026-10-25 — B2: nøkler til skyen uten hemmeligheter i repoet

**Prompt:** Hva betyr det for produktet at deploy aldri har kjørt, og hvordan fikser vi det? Er det å legge inn hemmeligheter i strid med sensorkriteriene?
**KI foreslo:** At appen ikke finnes på nett ennå. `deploy`-jobben hopper over Supabase fordi repoet mangler `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` og `SUPABASE_PROJECT_ID`, og Vercel er ikke koblet til. Løsningen er å legge de tre inn som GitHub Secrets og miljøvariablene til appen i Vercel, aldri i en fil. KI gikk gjennom SK-7.3, SK-3.4 og F-beskrivelsen for repo-ryddighet og viste at GitHub Secrets er kryptert, ikke en del av git-historikken, ikke med i `git clone` og skjult som `***` i loggene. `ci.yml` inneholder bare navnet på hemmeligheten.
**Min vurdering:** Jeg stilte spørsmål ved om det å legge inn hemmeligheter bryter med kriteriet «ingen hemmeligheter i repoet eller historikken». Gjennomgangen viste at det ikke gjør det. Kriteriet gjelder filer og commits, og GitHub Secrets ligger utenfor begge. F-beskrivelsen gjelder hemmeligheter «som ikke er håndtert», mens GitHub Secrets er nettopp en måte å håndtere dem på. Valget er bevisst: nøklene til skyen ligger i GitHub Secrets og i miljøvariablene i Vercel, `.env*` er gitignored, `.env.example` har bare lokale standardverdier, og gitleaks i CI stopper en hemmelighet som ved en feil blir committet. Deploy støtter også SK-6.8, en deployet app som plan B for sensor.
**Spor:** Epic 2-retro tiltak B2, PR #62 (grønn CI på `main`), branch `docs/b2-secrets-assessment`

## 2026-10-25 — Story 3.5: invitasjonstokens og regler

**Prompt:** `/bmad-build-auto på story 3.5`. Spec-en `spec-3-5-invitation-tokens-and-rules.md` ble skrevet fra Epic 3-konteksten og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én migrasjon med tabellen `invite_tokens` (eid av events-modulen) og `kind ∈ {guest, role_holder, shared_event}`. Bare SHA-256 av tokenet lagres, og `authenticated` og `anon` har ingen rettigheter og ingen policyer på tabellen. Tre systemfunksjoner (AD-5): `invite_tokens_create` lager 32 tilfeldige byte og gir tokenet tilbake én gang; `invite_tokens_validate` slår opp på hashen og svarer `valid`, `used`, `expired` eller `invalid`, med id-er bare når tokenet er gyldig, så et ukjent token og et token for et annet arrangement ser like ut; `invite_tokens_revoke_for_user` trekker tilbake en brukers gjestelenker i kallerens transaksjon. Oppslag på hashen erstatter en eksplisitt konstant-tid-sammenligning, fordi klarteksten aldri sammenlignes. Taket på 30 invitasjoner per døgn gjelder bare Rolle-invitasjoner, fordi en gjesteliste på 150 ellers ville tatt fem dager. Et arrangement uten slutttid regnes som ikke utløpt. `limit()` fra Epic 1 er flyttet til `src/lib/limit.ts` og har fått en `invite`-flyt med egne bøtter `invite_ip` og `invite_token`.
**Review:** Fire uavhengige subagenter (blind, kanttilfeller, verifiseringshull, samsvar med intensjonen) ga 35 funn, ingen høye. KI rettet fem: `validate` godtok ethvert levende token når forventet type eller arrangement var NULL; `create` sjekket ikke at kalleren er Organizer, og uten innlogget bruker ble taket hoppet over; tre CHECK-regler var ikke dekket av pgTAP; `p_user_id` og `p_role_id` er nå valgfrie, så de genererte typene tillater gjeste- og delte lenker; og fremmednøklene `event_id` og `role_id` har fått indekser. 22 funn ble avvist med begrunnelse i spec-ens triage-logg, blant annet at en deaktivert Rolle ikke er blant avvisningsgrunnene i storyen, og at det å trekke tilbake alle gjestelenker er slik AD-4 er ment.
**Min vurdering:** NIL
**Spor:** branch `feat/3.5-invitation-tokens-and-rules`, issue #69

## 2026-10-26 — Story 3.6: inviter noen til en Rolle

**Prompt:** `/bmad-build-auto på story 3.6. Gjør det med /fewer-permission-prompts`. Først la KI til 13 lesende sjekkommandoer i `.claude/settings.json`, valgt ut fra hvor ofte de var brukt i tidligere økter. Deretter ble spec-en `spec-3-6-invite-someone-to-a-role.md` skrevet og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Tabellene `role_members` og `role_membership_log`, der loggen bare kan legges til i, bare lagrer id-er og har `ON DELETE SET NULL`. Mutasjonsfunksjonen `events_invite_to_role` tar e-post i stedet for bruker-id (AD-5), slår opp brukeren selv og skriver medlemsrad, logg og `role_holder`-token i én transaksjon. Den gir `invited`, `added`, `member` eller `self`, og håndterer *New link* og *Correct email*. Server Action-en oppretter den passordløse brukeren med den hemmelige nøkkelen, fra en egen `admin.ts` som en lint-regel holder unna klientkomponenter. På Team & Roles kom et invitasjonsskjema med bekreftelsessteg, lenken én gang med *Copy link*, en personliste og tilgangshistorikk.
**Review:** Første runde (31 funn) fant to alvorlige feil i spec-en. Brukeren ble opprettet før databasen avviste for tak, avsluttet arrangement eller avslått Rolle, så hver avvist invitasjon etterlot en bruker uten noen grense. Og *Correct email* til egen e-post eller et medlems e-post lot den feile adressen beholde en fungerende lenke. KI reverterte koden, rettet spec-en (funksjonen avviser i fast rekkefølge før den svarer `P0002`, og først da opprettes brukeren) og implementerte på nytt. Andre runde (34 funn) ga ti små rettelser, blant annet nytt navn ved ny lenke, test av lint-regelens relative importer og en e2e for «allerede på Rollen». To funn er utsatt: brukere som aldri blir med slettes ikke, og en Rolle som slås av beholder ventende lenker.
**Min vurdering:** NIL
**Spor:** branch `feat/3.6-invite-someone-to-a-role`, issue #71

## 2026-10-26 — Story 3.7: bli med via invitasjonslenken

**Prompt:** `/bmad-build på story 3.7`. Spec-en `spec-3-7-join-through-the-invitation-link.md` ble skrevet fra Epic 3-konteksten, godkjent med valg A (se under), og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** `GET /api/invite/[token]` endrer ingenting. Den bytter tokenet mot en kortlivet `httpOnly`-cookie og sender videre til `/invite`, uten token i adressen og med `Referrer-Policy: no-referrer`. En ny invitee får en engangskode på e-post (Supabase OTP, aldri en lenke) og kan først etter koden velge passord etter Epic 1-reglene. En eksisterende konto logger inn, også med Google eller GitHub (ny `login_next`-cookie), og trykker *Join*. Systemfunksjonen `events_join_role` kalles med den hemmelige nøkkelen og kobler bare til medlemskapet når innlogget bruker er den inviterte og har bekreftet e-post. Den bruker tokenet, logger `joined` og er idempotent. `invite_tokens_lookup` samler statusregelen ett sted, og `events_invite_preview` gir siden bare inviteens egne data. Under planleggingen viste KI to ting lokalt. Arrangementets hjemside var skjult for alle andre enn Organizer. Og Supabase sender en bekreftelseslenke, ikke en kode, til en bruker som ikke er bekreftet. Derfor bekreftes e-posten nå når invitasjonen opprettes. Implementeringen fant i tillegg at Supabase gir en bruker uten passord et tilfeldig passord, så en markør `password_pending` skiller nye invitees fra ekte kontoer.
**Valg:** Eieren valgte A, en smal lesetilgang `events_select_member` for innmeldte medlemmer allerede i 3.7, slik at akseptansekravet «land on the Event's interim home» holder. Sidemenyen og Rolle-etiketten ligger fortsatt i 3.10.
**Review:** Tre uavhengige subagenter (blind, kanttilfeller, verifiseringshull) ga 20 funn. KI rettet seks. Invitees fra 3.6 får en backfill, men bare de som aldri har logget inn og aldri fikk en bekreftelses-e-post, så en gammel ubekreftet registrering ikke blir overtatt. Utløpsteksten byttet til «allerede brukt» når cookien ble slettet. Koden fikk egen rate limit (`join_code`) mot gjetting. Rate limit sjekkes nå før databasekallet. Og det kom pgTAP- og e2e-tester for *Publish*-banneret og «feil konto». To funn er utsatt: en e2e-sjekk av `next` i OAuth-skjemaet, og at e-postmalen må legges inn i skyprosjektet for hånd, fordi CI bare kjører `db push`. Tolv ble avvist med begrunnelse i spec-ens triage-logg.
**Min vurdering:** NIL
**Spor:** branch `feat/3.7-join-through-the-invitation-link`, issue #73

## 2026-10-28 — Story 3.8: rolleleder

**Prompt:** `/bmad-build-auto på story 3.8`. Spec-en `spec-3-8-role-lead.md` ble skrevet fra Epic 3-konteksten og implementert av en subagent med spec-en som eneste kilde. Etterpå: «kjør ny review».
**KI foreslo:** Kolonnen `role_members.is_lead` med et partielt unikt indeks (`(role_id) where is_lead`) som invariant (AD-19), og mutasjonsfunksjonen `events_set_role_lead`, som bare Organizer kan kalle. En ventende invitee kan være leder, en null-verdi nullstiller lederen (brukes av Undo), og hver reell endring logges som `lead_changed`. Under planleggingen viste KI lokalt at én vanlig `UPDATE` som bytter leder, feiler med 23505 når den nye raden ligger først fysisk, fordi et partielt indeks sjekkes rad for rad og ikke kan utsettes. Akseptansekravet om «én setning» er derfor løst med en datamodifiserende CTE som tømmer den gamle lederen før den nye settes, og en pgTAP-test dekker nettopp rekkefølgen som feiler. Team & Roles viser «Lead: {navn}» eller «No lead yet» per aktiv Rolle, et «Role lead»-merke og *Make lead* med Undo-toast. Stedet der Epic 4 kaller `tasks_assign_role_owned_to_lead` er markert i funksjonen.
**Review:** Første runde med fire uavhengige subagenter ga 21 funn, ingen høye. KI rettet fem: read-only-sjekken kommer nå før sjekken for avslått Rolle, *Make lead* har synlig tekst i det tilgjengelige navnet (WCAG 2.5.3), merket vises bare på aktive Roller, radlåser hindrer at en samtidig *Correct email* gir en logg uten leder, og e2e dekker at Rollen viser «No lead yet» når lederen fjernes. Den oppfølgende runden ga 27 funn, de fleste videreført. KI rettet tre: e2e for at *Make lead* er skjult på avsluttede arrangementer og når Rollen slås av, og at gamle varsler på samme rad nullstilles. Underveis påpekte implementeringsagenten at den siste rettelsen også ville skjule en invitasjonslenke som bare vises én gang, så KI endret den til å fjerne bare feilmeldinger.
**Min vurdering:** KI påpekte at det å nullstille lederen (Undo av første leder) vises som «Role lead changed» i Access history, akkurat som det å sette en leder. Jeg vurderte det og beholdt teksten, fordi den er sann for begge og bare dukker opp rett etter en Undo.
**Spor:** branch `feat/3.8-role-lead`, issue #75

## 2026-10-28 — Story 3.9: fjern en Rolle

**Prompt:** `/bmad-build på story 3.9`, deretter «kjør A» og «Godkjenn og fortsett». Spec-en `spec-3-9-change-or-revoke-a-role.md` ble skrevet fra Epic 3-konteksten og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Mutasjonsfunksjonen `events_revoke_role(p_member_id)`, som bare Organizer kan kalle. Den sletter raden, sperrer personens åpne invitasjonslenker for Rollen og logger `revoked`. Lederflagget ligger på raden og forsvinner med den. En avslått Rolle kan fortsatt fjernes, og et avlyst eller avsluttet arrangement gir 55000. Tilgangen forsvinner via eksisterende RLS, så eventet forsvinner også fra *All events*. «Endre Rolle» er løst som fjerning pluss det eksisterende invitasjonsskjemaet, uten egen funksjon. Team & Roles fikk *Revoke* bak en bekreftelsesdialog (UX-DR23). Stedet der Epic 4 kaller `tasks_release_owner` er markert i funksjonen. KI stilte ett spørsmål: toast og redirect for en fjernet innehaver (UX-DR24) krever en logg innehaveren kan lese, en kilde til Organizers navn og en landingsside, og ingen av dem finnes før Story 3.10.
**Review:** Tre uavhengige subagenter ga 20 funn, ingen høye. KI rettet fire: pgTAP-testen for «fjernet innehaver leser ingenting» startet fra en ventende rad og passerte uten revoke-kallet, så den fikk en joined innehaver som leser eventet før og ingenting etter. Dialogen kan ikke lukkes mens fjerningen pågår, og fokus går til People-overskriften etter en fjerning, siden raden og knappen forsvinner. De øvrige ble avvist med begrunnelse, blant annet at `user_id` er `not null` og at et kappløp mellom to faner gir en litt mindre presis feilmelding.
**Min vurdering:** Jeg valgte å flytte toast og redirect til Story 3.10 (A) i stedet for å bygge en leselogg, et navnefelt og en redirect-side her. Det er ført i `deferred-work.md`.
**Spor:** branch `feat/3.9-change-or-revoke-a-role`, issue #77

## 2026-11-02 — Story 3.10: Rolle-innehaverens avgrensede visning

**Prompt:** `/bmad-build på story 3.10`, deretter «approve and continue» og `/bmad-walkthrough`. Spec-en `spec-3-10-the-role-holders-scoped-view.md` ble skrevet fra Epic 3-konteksten og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** `holds_role(role_id)` som `STABLE`, `security invoker` og `search_path = ''`, og utvidede lese-policyer på `role_members` og `roles` for innmeldte innehavere. Underveis viste implementeringen at en innebygd delspørring i `role_members`-policyen gir «infinite recursion», så en hjelper `is_team_member(event_id)` ble lagt til. `events_select_member` skjuler nå avlyste arrangementer. Sidemenyen vises etter hvem som ser på (Organizer alt, innehaver Overview, Team & Roles og All events), og Guests, Settings og oppsettsveiviseren viser no-access-siden uten data. Team & Roles har en skrivebeskyttet visning for innehavere, og kortene i All events viser Rolle-navnet.
**Valg:** Eieren valgte generisk tekst i no-access-meldingen i stedet for Organizers navn, og å utsette toast og redirect for fjernet innehaver på nytt.
**Review:** Tre uavhengige subagenter ga funn. Det alvorlige: RLS skjuler rader, ikke kolonner, så en innehaver kunne lese kollegers e-post direkte mot API-et selv om UI-et skjulte den. Eieren valgte å flytte e-posten til en Organizer-only tabell `role_member_contacts` etter `guest_contacts`-mønsteret, og KI skrev om `events_invite_to_role` og `events_invite_preview`. KI rettet også fire mindre funn: layouten kaster ved feil i Organizer-spørringen, utkastkortet skjuler *Continue setup* for innehavere, og pgTAP og e2e dekker isolasjon mellom arrangementer og oppsett-undersidene. Kontakttabellen kom etter første reviewrunde og er bare dekket av walkthroughen. Utsatt: `is_team_member` leser samme tabell som policyen den brukes i og er avhengig av planleggerens rekkefølge (`deferred-work.md`).
**Min vurdering:** NIL
**Spor:** branch `feat/3.10-role-holder-scoped-view`, issue #79

## 2026-11-03 — Story 4.1: Tasks-tabellen og Rolle-avgrenset tilgang

**Prompt:** `/bmad-build på story 4.1`, deretter «godkjenn og fortsett». Epic 4-konteksten manglet og ble kompilert av KI fra `epics.md` og arkitekturen. Spec-en `spec-4-1-tasks-table-and-role-scoped-access.md` ble implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én migrasjon med `tasks`, CHECK på at en aktiv Task trenger frist, og en lese-policy: Organizer ser alt, andre bare med Rollen eller som eier, og bare når arrangementet er publisert og Rollen aktiv. Kolonnetilgangen er `UPDATE (title, description)`, utløseren `events_refuse_read_only()` gjenbrukes, og `updated_at` settes av en utløser. `tasks_assert_writable`, `tasks_check_expected` og viewet `task_state` er `security invoker`. Privilegiemodellen for senere `tasks_*`-funksjoner står i migrasjonshodet og bevises i pgTAP med en midlertidig `security definer`-funksjon. `is_delegated` betyr at en eier finnes (FR-12).
**Review:** Tre uavhengige subagenter ga 28 funn. KI rettet sju: `tasks_check_expected` låser nå raden (`for update`), tittelen kan ikke være blank, en oppdatering uten endring flytter ikke `updated_at`, og pgTAP dekker avlyst arrangement, eier uten innmelding, anon-nektelser og eier som ikke er Organizer. Implementeringsagenten la også til en `tasks_update`-policy (kun Organizer), som spec-en ikke nevnte, men som `UPDATE`-tilgangen trenger. Flere funn ble avvist med begrunnelse, og to ble utsatt i `deferred-work.md`: mikrosekundpresisjon i `updated_at` mot JS `Date`, og foreldet `accepted_at` når en eier slettes.
**Min vurdering:** NIL
**Spor:** branch `feat/4.1-tasks-table-and-role-scoped-access`, issue #81

## 2026-11-03 — Story 4.2: opprett, rediger og åpne en Task

**Prompt:** `/bmad-build på story 4.2`. Spec-en `spec-4-2-create-edit-and-open-a-task.md` ble implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én migrasjon med kolonnene `days_before` og gjesteprogramfeltene, `is_role_lead`, en utvidet `tasks_update`-policy og en utløser som holder gjesteprogramfeltene Organizer-only. Funksjonene `tasks_create`, `tasks_set_deadline`, `tasks_dismiss` og `tasks_restore` er `security definer`; `tasks_recalculate_deadlines` er en systemfunksjon som `events_update_schedule` kaller etter at Event-raden er oppdatert, siden den leser den nye starten. Dismiss og restore deler den interne hjelperen `tasks_set_lifecycle` (security invoker, ikke kallbar for `authenticated`). Server Actions redigerer tittel og beskrivelse med `updated_at` som filter og setter fristen med den ferske verdien. Listen, opprettingsskjemaet og detaljsiden er nye ruter under `/events/[eventId]/tasks`.
**Valg som må forklares:** Gjesteprogramfeltene har kolonner og utløser, men ingen skjema i UI; Epic 7 eier dem. Tilbakeknappen er en lenke til listen, ikke en historikk-tilbakeknapp.
**Min vurdering:** NIL
**Spor:** branch `feat/4.2-create-edit-and-open-a-task`

## 2026-11-03 — Story 4.3: deloppgaver og avhengigheter

**Prompt:** `/bmad-build på story 4.3`. Spec-en `spec-4-3-subtasks-and-dependencies.md` ble implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én migrasjon med `parent_task_id`, tabellen `task_dependencies` og to utløsere som holder invariantene (AD-19): forelder og avhengighet i samme Rolle og Event, begge aktive, ett nivå, og sykelsjekk under `pg_advisory_xact_lock` på Eventet. `tasks_create` fikk `p_parent_id`; `tasks_promote_subtask`, `tasks_move_to_role`, `tasks_add_dependency` og `tasks_remove_dependency` er `security definer`, og en intern hjelper `tasks_may_link` (Organizer, leder eller innmeldt eier) deles av dem. `tasks_set_lifecycle` nekter avvisning med aktive deloppgaver eller avhengige (`55006`) og gjenoppretting under avvist forelder. `task_state` fikk `blocked`, `blocked_by`, `blocked_by_count` og `blocks_count`. Detaljsiden fikk kortene *Subtasks* og *Depends on*, og en blokkert rad har grå tone, lås-ikon og «Waits for: …». Kappløpet mellom to tilkoblinger testes i Playwright mot lokal database, fordi pgTAP kjører i én transaksjon.
**Valg som må forklares:** Ingen statusrullering: en forelder kan være Done med åpne deloppgaver. `tasks_move_to_role` har ingen UI. Under testingen viste e2e en feil fra Story 4.2: feilmeldinger fra Server Actions er hele nøkler, men komponentene oversatte dem med `tasks`-navnerommet, så toasten uteble. Rettet med rot-oversetteren i alle tre komponentene.
**Min vurdering:** NIL
**Spor:** branch `feat/4.3-subtasks-and-dependencies`

## 2026-11-04 — Story 4.4: status, notater og forfalt

**Prompt:** `/bmad-build på story 4.4`. Spec-en `spec-4-4-status-notes-and-overdue.md` ble implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én migrasjon med tabellen `status_history` (kun select for `authenticated`, en utløser som bare lar et notat fjernes eller `changed_by` nulles), funksjonene `tasks_set_status`, `tasks_remove_status_note` og `tasks_overdue_days`, og `task_state` utvidet med `overdue` og `overdue_days`. Forfalt regnes fra lokal midnatt etter fristen i Eventets tidssone, så grensen testes i pgTAP med 23:59:59 og 00:00:00 og en sommertidsdag. «Godta først» (`55007`) nekter en eier som ikke har akseptert; leder og Organizer slipper gjennom. Oppgavesiden fikk en statuskontroll (segmentert på desktop, `select` på mobil) med optimistisk oppdatering, en historikkliste og *Remove* bak bekreftelsesdialog; raden viser statusikon, ord og «Overdue N days».
**Valg som må forklares:** Overdue er aldri lagret (AD-13). Å fjerne et notat beholder raden og tidspunktet, så historikken forblir sporbar. Eieren får ingen kontroll før Story 4.6 lar vedkommende godta; siden skjuler den i mellomtiden for en eier med delegert, ikke-akseptert oppgave.
**Min vurdering:** NIL
**Spor:** branch `feat/4.4-status-notes-and-overdue`

## 2026-11-04 — Story 4.5: deleger en Task

**Prompt:** `/bmad-build på story 4.5`. Spec-en `spec-4-5-delegate-a-task.md` ble implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én migrasjon med tabellen `task_assignment_log` (kun select, utløser som bare tillater at FK-handlinger nuller en brukerkolonne), `tasks_delegate` (`security definer`; Organizer eller innmeldt leder, målregelen avgjøres før skriving, samme eier på nytt skriver ingenting) og en `notifications_emit`-stub med endelig signatur og typen `recipient_spec`, tilbakekalt fra `authenticated`. Oppgavesiden fikk en `Command`-velger og linjen «Held before».
**Valg som må forklares:** Delegering teller som godtatt i Core (`accepted_at = now()`); Story 4.6 endrer det. shadcn la inn en feil `cn`-pakke i importene; importene ble rettet til `@/lib/utils` og pakken fjernet.
**Review:** Tre uavhengige reviewere ga funn. To ble godtatt og rettet: en Task eid av Organizer (eller sist holdt av Organizer) viste tom eiercelle og ingen «Held before»-linje for alle andre enn Organizer, siden Organizer ikke har rad i `role_members`; `nameOf` gir nå en oversatt «Organizer»-etikett. Velgerlisten manglet e2e-dekning for `joined_at`-, `role_id`- og `pending`-filtrene, så en egen test viser hva leder og Organizer får se. Avvist: ubrukte shadcn-filer (de importeres transitivt av `command`), `null`-navn vist som «You» (`role_members.name` er NOT NULL), løs utløser (den speiler Story 4.4), kappløp før radlåsen (autoriser først er AD-2-rekkefølgen), generisk `42501`-melding, og manglende `accepted`-rad i loggen (Story 4.6 eier den).
**Min vurdering:** NIL
**Spor:** branch `feat/4.5-delegate-a-task`

## 2026-11-05 — Story 4.6: godta en Task og 48-timersregelen

**Prompt:** `/bmad-build på story 4.6`. Spec-en `spec-4-6-accept-a-task-and-the-48-hour-rule.md` ble implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én migrasjon med `tasks_accept` (`security definer`; bare gjeldende eier, allerede godtatt gir `updated_at` tilbake uten skriving), en erstattet `tasks_delegate` (godtatt med en gang bare ved selvdelegering, som også logger en `accepted`-rad) og `task_state` utvidet med `accepted` og `stale_unaccepted` (strengt over 48 timer). Oppgavesiden fikk en godta-banner, og rad og detaljside viser «Delegert til …» med eget godtatt-signal; bare Organizer ser antall dager.
**Valg som må forklares:** `tasks_set_status` er urørt; «godta først»-regelen fra Story 4.4 gjelder nå på ekte. Playwright-testene kjører som holder og som Organizer i hver sin test, siden en test har én innlogget bruker.
**Review:** Tre uavhengige reviewere ga funn. Godtatt og rettet: godtatt-signalet vistes på lukkede Tasks og dobbelt for Organizer (nå ett signal, bare på åpne Tasks), «Delegert til Du» i nb (ny `youObject`-tekst), og manglende tester for Organizer-regelen om dager, delegering til gjeldende eier og at godta løfter «godta først»-regelen. Utsatt til Story 4.7: en tilbakekalt eier som beholder en Task kan fortsatt godta den. Avvist: kappløp mellom to godta-kall (radlåsen i `tasks_check_expected` dekker det), retry på ugyldige kall, `daysSince` fra en UI-modul og navn under RLS (`is_team_member` gir lesetilgang).
**Min vurdering:** NIL
**Spor:** branch `feat/4.6-accept-a-task`

## 2026-11-05 — Story 4.7: Role-leder og tilbakekallingskroker

**Prompt:** `/bmad-build på story 4.7`. Spec-en `spec-4-7-role-lead-and-revoke-hooks.md` ble implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én migrasjon med to systemfunksjoner, `tasks_assign_role_owned_to_lead` og `tasks_release_owner` (`security definer`, tilbakekalt fra alle klientroller), og erstattede `events_set_role_lead` og `events_revoke_role` som kaller dem i samme transaksjon. En ny leder overtar Rollens åpne Tasks uten eier, med én `delegated`-rad per Task og én `task_assigned`. En tilbakekalt bruker mister Tasks i Rollen, og i hele Eventet når vedkommende ikke holder noen Rolle igjen (Organizer unntatt).
**Valg som må forklares:** Hookene har ingen brukerparametre; aktøren er `auth.uid()` og brukeren hentes fra raden som ble slettet. pgTAP bytter ut `notifications_emit`-stubben med en loggende versjon inne i testtransaksjonen for å bevise «nøyaktig ett varsel».
Storyen løser utsettelsen fra Story 4.6: en tilbakekalt eier som beholdt en Task kunne fortsatt godta den; nå frigjøres Tasken ved tilbakekalling.
**Review:** Tre uavhengige reviewere ga funn. Rettet: tre hull i testene (ny leder på publisert Event uten åpne Tasks sender ingenting og logger ingenting; Organizer tilbakekalt fra Rollen som holder deres egen Task får den frigjort, mens en Organizer-eid Task i en annen Rolle blir; den ventende lederen får nøyaktig én `task_assigned` for Rollen). Avvist: at frigjøring lar åpne Tasks stå uten eier i en Rolle med leder (spec-en sier de går tilbake til Rollen), å la `accepted_at` stå på ferdige Tasks (spec-en sier uansett status), `null` i `role_members.user_id` (kolonnen er not null), varsel for frigjorte Tasks (spec-en forbyr det), og skrivenekt på en allerede frigjort Task (select-sjekken fastslår frigjøringen).
**Min vurdering:** NIL
**Spor:** branch `feat/4.7-role-lead-and-revoke-hooks`

## 2026-11-05 — Story 4.9: Mine oppgaver

**Prompt:** `/bmad-build på story 4.9`. Spec-en `spec-4-9-my-tasks.md` ble implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én migrasjon som utvider `task_state` med `obsolete`, og en ny side `/events/[eventId]/my-tasks` med egne Tasks (ikke godtatt først, så frist, så tittel), en «Ikke delegert»-bryter med `aria-pressed` og levende region, skjult liste «Vis utgåtte» og den skrivebeskyttede Team-listen gjenbrukt fra holder-visningen. Sidemenyen fikk «Mine oppgaver» med et Urgent-merke, og en innmeldt holder som ikke er Organizer sendes dit fra Event-hjemmesiden.
**Valg som må forklares:** Urgent-merket hentes med to spørringer i `app/layout.tsx` (egne Tasks og `task_state.overdue`), ikke én, fordi `task_state` ikke har eier og spec-en forbød andre kolonner enn `obsolete`. `HolderTeam` fikk en `embedded`-variant slik at siden bare har én `h1`.
**Review:** Fire uavhengige reviewere (blind, edge-case, verifikasjonsgap, intent-alignment) ga 31 funn. Rettet: ferdige Tasks sorteres etter åpne, merket i sidemenyen faller tilbake til tomt i stedet for å kaste feil, «Oversikt»-lenken vises bare for Organizer (holdere sendes uansett videre), og e2e-testene dekker nå avviste, foreslåtte, andres og utgåtte Tasks, en annen Rolles ventende Task, og hele kjeden bli med → åpne Event → se tildelt Task. Utsatt: omdirigeringen gjelder alle som ikke er Organizer, så den må sjekke holder-rolle når gjester får tilgang (Epic 7). Avvist med begrunnelse: to spørringer i stedet for én (å rette det ville bare vært å endre spec-en), uavgrenset spørring og radgrense (liten Event-skala), merket i mobilmenyen, tom levende region, og påstanden om at merket blir utdatert (`router.refresh()` laster rotlayouten på nytt).
**Min vurdering:** NIL
**Spor:** branch `feat/4.9-my-tasks`

## 2026-11-05 — Story 5.1: Dashboard-seksjoner og omfang

**Prompt:** `/bmad-build på story 5.1`. Spec-en `spec-5-1-dashboard-sections-and-scope.md` ble implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Den rene funksjonen `classifyDashboard` i `src/modules/tasks/dashboard.ts` (Trenger deg, I faresonen, På sporet; hver Task én gang, i den første seksjonen den passer), Vitest for alle rader i spec-matrisen og en pgTAP-fil `task_state_scope.test.sql` som beviser visningsmatrisen på `task_state`. Ingen side, migrasjon eller UI.
**Valg som må forklares:** `anon` har ikke select på `task_state`, så pgTAP forventer `42501` i stedet for tomt resultat. En ren gjest har ingen kobling til brukere ennå, så den representeres av en bruker uten Rolle.
**Review:** Fire uavhengige reviewere ga 30 funn. Rettet: «ikke godtatt»-gruppen og `notAccepted`-flagget bruker nå samme regel (`accepted === false`, så `null` havner ikke i *Needs you*), sorteringen får `id` som siste tiebreak, og Vitest dekker lederens egne Tasks i en annen Rolle, holderens egen foreldede Task, Tasks uten frist, tom input og lik frist og tittel. Avvist med begrunnelse: gjest-testen (gjester har ingen brukerkobling ennå), `anon` som gir feil og ikke tomt resultat (view-et har ingen select-rettighet for `anon`), manglende pgTAP for upublisert Event og inaktiv Rolle (dekket i `tasks.test.sql`), Decision-, Problem- og Proposed-grupper (Target-historier), og at funksjonen ikke har noen kaller ennå (5.2 og 5.3).
**Min vurdering:** NIL
**Spor:** branch `feat/5.1-dashboard-sections-and-scope`

## 2026-11-06 — Story 5.2: Dashboard: Trenger deg

**Prompt:** `/bmad-build på story 5.2`. Spec-en `spec-5-2-dashboard-needs-you.md` ble implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** `/events/[eventId]` blir Dashboardet for Organizer og innmeldte Role-holdere, med seksjonen *Needs you* fra `classifyDashboard` (overskrift med teller, Task-rader som åpner Task-siden, og linjen «Nothing needs you right now.» når den er tom). Task-oppslaget fra Mine oppgaver ble flyttet til én delt `load-listed.ts`. Sidemenyen heter nå *Dashboard* og vises også for holdere. Ingen migrasjon, så ingen ny pgTAP.
**Valg som må forklares:** Holdere sendes ikke lenger videre til Mine oppgaver, så landingssiden etter å ha blitt med er Event-roten (epic-konteksten sier at Dashboardet er landingssiden for innmeldte holdere, mens akseptkriteriet nevner bare Organizer). Decision-kort, Problem-rader, foreslåtte Tasks og `concurrent_edit`-toasten hører til Target-historiene, siden rader i Core er lenker uten handling på stedet. Norsk tekst («Dashbord», «Trenger deg») er KI-ens ordvalg.
**Review:** Fire uavhengige reviewere (blind, edge-case, verifikasjonsgap, intent-alignment) ga 25 funn. Rettet: e2e-test for en innmeldt leder som ser Role-kollegaens forfalte Task men ikke en annen Rolles, og en sjekk av at Tasks i en inaktiv Rolle ikke vises. Utsatt: `concurrent_edit`-toast og dobbeltklikkvern på Proposed-rader (Stories 4.13-4.14). Avvist med begrunnelse: ikke-null-påstanden på radoppslaget (samme liste), flere spørringer enn nødvendig (samme form som Story 4.9), manglende Vitest for lasteren (e2e dekker den), at lederens foreldede rad mangler dager (Mine oppgaver skal være uendret), og at Retry-kortet ikke er testet her (Story 1.8).
Utgangspunktet fikk også én korrigering: issue-teksten var avkortet, så siste kriterium ble lagt til.
**Min vurdering:** NIL
**Spor:** branch `feat/5.2-dashboard-needs-you`

## 2026-11-06 — Story 5.3: Dashboard: I faresonen og På sporet

**Prompt:** `/bmad-build-auto på story 5.3`. Spec-en `spec-5-3-dashboard-at-risk-and-on-track.md` ble skrevet av KI og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Seksjonene *At risk* (teller, ventende og blokkerte rader, notatutdrag på 80 tegn) og *On track* (én rad per aktiv Rolle med leder, holdere, antall ferdige, åpne og forfalte, og lenke til Tasks) under *Needs you*. Den rene funksjonen `summarizeRoles` erstattet On track-delen av `classifyDashboard`. Organizer ser «N guests added» og «N tasks belong to inactive Roles». Ingen migrasjon.
**Valg som må forklares:** Tellerne omfatter alle Tasks i en lesbar Rolle, ikke bare de som er igjen etter *Needs you* og *At risk*, ellers ville forfalte Tasks falle ut av Rollens forfalt-tall. En Rolle er lesbar bare for Organizer og innmeldte holdere, ellers vises «Tasks in {Role} are visible to its team.» uten tall. Gjestelinjen er bare for Organizer fordi `guests_select` er Organizer-only. Rekkefølgen venter-ekstern før blokkert følger epic-konteksten.
**Review:** Fire uavhengige reviewere ga 34 funn. Rettet: Rollene sorteres etter `roleKeys`, notatet er siste ikke-fjernede notat (som kontrakten sier), `loadListed` er bufret med `cache()` så siden laster én gang, Rollenavn for skjermlesere, `break-words` på notatet, tom linje uten aktive Roller, og e2e for fjernet notat, notatrekkefølge og «Invited · not joined yet». Avvist med begrunnelse: emoji-kutt i notatet, uavgrenset historikk-spørring, manglende tester for avlyste Events og norsk språk, og at gjestelinjen er skjult for holdere (RLS).
**Min vurdering:** NIL
**Spor:** branch `feat/5.3-dashboard-at-risk-and-on-track`

## 2026-11-06 — Story 5.4: Dashboard housekeeping

**Prompt:** `/bmad-build-auto på story 5.4`, kun Core. Spec-en `spec-5-4-dashboard-housekeeping.md` ble skrevet av KI og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Bare tester, ingen ny produksjonskode. Publiseringsbanneret (Story 2.8) og holderens landing på Dashboardet (Story 5.2) finnes fra før. Join-testen i `e2e/invite-join.spec.ts` dekker nå join → Dashboard → egen forfalt Task først → *My tasks* i sidemenyen → *Accept task*. `e2e/dashboard.spec.ts` har en ny test av at en avlyst Event ikke har Publish, banner eller knapper.
**Valg som må forklares:** *Show dismissed* og *Restore* ble utelatt fordi Story 4.14-funksjonen (Target) ikke finnes. «Your invitation»-sporet gjør ingenting før Epic 7, siden historien bare reserverer plassen. Rolle-fjernet-toasten og omdirigeringen ble ikke bygget: Story 3.9 flyttet dem til Story 3.10 etter eiers beslutning 2026-10-28, så akseptkriteriet «still apply» stemmer ikke med koden. En fjernet person får no-access-siden.
**Review:** Fire uavhengige reviewere ga 18 funn, ingen medium eller høyere. Rettet: bannerteksten er sjekket borte på avlyst Event, antall rader i *Needs you* er sjekket (2), og *Accept task* er sjekket borte etter aksept. Utsatt: rolle-fjernet-toasten (Story 3.10). Avvist med begrunnelse: at testen bare dekker en aldri publisert avlyst Event (det er det eneste tilfellet `isDraft` kunne feile på), skjøre locatorer, og manglende test av dobbel aksept (Story 4.6).
**Min vurdering:** NIL
**Spor:** branch `feat/5.4-dashboard-housekeeping`

## 2026-11-06 — Story 5.5: Arrangementskort viser tilstand

**Prompt:** `/bmad-build-auto på story 5.5`, kun Core. Spec-en `spec-5-5-event-cards-show-state.md` ble skrevet av KI og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Én SQL-funksjon `events_card_counts()` (security invoker) som grupperer åpne, nye, forfalte, «trenger deg» og «i fare»-Tasks per Event under brukerens RLS, med indeksen `tasks (event_id, owner_user_id)`. Siden kaller den én gang. Kortet viser tallsirkel (Åpne), «N new»-merke, linjen «N overdue» / «N need you» eller «N at risk», og et tilgjengelig navn som «Lucas's 40th, Sat 24 Oct, Organizer, 3 open tasks, 1 overdue, 1 new task». Draft-, avlyste og tidligere kort viser ingen tall.
**Valg som må forklares:** Funksjonen dupliserer seksjonsreglene fra `classifyDashboard` i SQL, fordi akseptkriteriet krever én gruppert spørring og reglene ikke kan kjøre i TypeScript. «Åpne» er brukerens egne Tasks, mens «forfalt» og «trenger deg» følger Dashboardets omfang (Organizer og leder ser hele Rollen), så en leder kan se «0 open tasks, 1 overdue». Beslutningstellingen er utelatt til Target-historiene (4.8 og utover).
**Review:** Fire uavhengige reviewere ga 21 funn (4 medium, 13 lav, 4 falske). Rettet: pgTAP for «stale unaccepted» for ledere (ikke for vanlige holdere) og for obsolete og dismissed Tasks, og en e2e-test for «N need you» og «N at risk». Utsatt: beslutningstall (Target). Avvist med begrunnelse: «0 open» ved siden av forfalt (AC definerer Åpne som egne Tasks), at telleren feiler hele siden (samme feilgrense som eventlisten), at indeksbruk ikke er bevist med EXPLAIN, og at mocken ikke viser sideforespørsler (siden har ett rpc-kall).
**Min vurdering:** NIL
**Spor:** branch `feat/5.5-event-cards-show-state`

## 2026-11-06 — Story 5.6: Tidslinje-beregning

**Prompt:** `/bmad-build-auto på story 5.6`, kun Core. Spec-en `spec-5-6-timeline-computation.md` ble skrevet av KI og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Den rene funksjonen `computeTimeline` i `src/modules/tasks/timeline.ts` (én bane per aktiv Rolle, topologisk rekkefølge med tie-break på frist, `created_at` og id, Subtasks nestet, søyler fra siste avhengighetsfrist eller opprettelsesdato, akse, tellere, lesbar/ulesbar bane), `eventToday` og `loadTimelineInput` med nøyaktig to spørringer. En additiv migrasjon gir `tasks` kolonnen `created_at`, som klienter ikke kan skrive. Kolonnen fantes ikke, selv om epic-teksten forutsetter den; eksisterende rader fylles fra `updated_at`.
**Valg som må forklares:** Rekkefølge lagres aldri (pgTAP sjekker at ingen kolonne eller tabell heter order, position, rank, sort eller timeline). Avhengigheter ordner bare søsken i samme gruppe, men setter fortsatt søylestart på tvers av grupper. Ved syklus faller hele gruppen tilbake til fristrekkefølge. Ulesbare baner får ingen Task-data i resultatet, og avhengigheter løses bare mot lesbare Roller.
**Review:** Fire uavhengige reviewere ga 38 funn (4 medium, 22 lave, 12 falske). Rettet: `dependsOn` viser bare synlige Tasks (skjulte obsolete avhengigheter henger ikke igjen), tom tidssone faller tilbake til UTC, ordningsløkka er lineær, loader-tester for ulesbar bane, ventende holder, Organizer, Rolle-rekkefølge og manglende frist, og pgTAP-navnesjekken matcher hele ord. Utsatt: beslutningspunkter i lastet data (Target, Story 4.8). Avvist med begrunnelse: sykluser på tvers av grupper (umulig etter Story 4.3), ingen side eller kallsted (Story 5.7), og at backfill av `created_at` ikke er testet (engangs-setning på en tabell før lansering).
**Min vurdering:** NIL
**Spor:** branch `feat/5.6-timeline-computation`

## 2026-11-06 — Story 5.7: Tidslinje, svømmebaner

**Prompt:** `/bmad-build-auto på story 5.7`, kun Core. Spec-en `spec-5-7-timeline-swimlane-view.md` ble skrevet av KI og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Siden `/events/[eventId]/timeline` (kun lesing, servergenerert) med lenke i sidemenyen. `computeTimeline` fikk status, forfalte dager, blokkert («venter på»-Task) og «ikke akseptert» per søyle, og lasteren leverer `canCreate`. Rene hjelpere i `timeline-layout.ts` (`axisWeeks` med mandagsetiketter og år ved årsskifte, `placeLane` som pakker søyler i spor med 112px minimumsbredde). Én klientkomponent håndterer rulling, 48px kantfade og *Jump to today*.
**Valg som må forklares:** Ulesbare baner viser bare Rolle-kolonnen og teksten fra Dashboardet, uten søyler eller tall. Tomme tidslinjer tegnes på en to ukers akse fra i dag, slik at banene fortsatt vises. Beslutningspunkter tegnes bare hvis en søyle har `point`, siden Decision Tasks er Target. Statusen er ikon pluss ord; blokkerte og ikke aksepterte søyler har stiplet kant.
**Review:** Fire uavhengige reviewere ga 29 funn (0 høye, 3 medium, 11 lave, 15 falske eller avvist). Rettet: «ikke akseptert» står nå som ord i søyle og lenkenavn (ikke bare stiplet kant), canvas vokser så en søyle med 112px minimumsbredde ikke havner utenfor, «I dag»- og «Arrangementsdag»-etikettene ligger på hver sin rad, kantfaden følger breddeendring ved *Show obsolete*, *Jump to today* ruller uten animasjon (reduced motion), døde meldingsnøkler fjernet, og e2e dekker tom tidslinje, avlyst arrangement, forfalt-ord og to års rulling. Avvist med begrunnelse: parameter-array i `?obsolete`, hardkodede scroll-margin-tall, duplisert `addDays`, ukjente avhengigheter (RLS skjuler dem med vilje) og at «Utgått»-ordet er gjennomstreket (statusvokabularet krever det).
**Min vurdering:** NIL
**Spor:** branch `feat/5.7-timeline-swimlane-view`

## 2026-11-07 — Story 5.8: Tidslinje, listevisning

**Prompt:** `/bmad-build-auto på story 5.8`, kun Core. Spec-en `spec-5-8-timeline-list-view.md` ble skrevet av KI og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Samme side `/events/[eventId]/timeline` med en lenkebasert veksler (`?view=list|lanes`). Uten `view` rendres begge visningene og CSS velger liste under 768px og svømmebaner over, så det trengs ingen klient-JS. Listen har én gruppe per Rolle med lead og holdere, nestede Subtasks, rader på minst 44px som bryter lange titler, «No tasks in this Role yet», ulesbar Rolle og Organizerens linje om inaktive Roller. En delt hook `useBarText` gir lik lenketekst i begge visninger.
**Valg som må forklares:** «Standard under 768px» kan serveren ikke avgjøre, så begge visninger sendes og veksleren rendres to ganger (riktig `aria-current` per bredde). URL bærer bare tilstand etter et valg. Beslutningspunkter vises som ord pluss rombe, men er utestet fordi lasteren ikke leverer dem i Core.
**Review:** Fire uavhengige reviewere ga 25 funn (0 høye, 0 medium, 10 lave, 15 falske). Rettet: `break-words` på lead og holdere, bredere trykkflate på veksleren, e2e for at veksleren beholder `obsolete`, Hide obsolete og ukjent `view`. Utsatt: beslutningsord i lenkenavnet (Story 4.8). Avvist med begrunnelse: inaktiv-linjen bare i listen (AC står under listehistorien), lead og holdere på ulesbar Rolle (kreves av AC), og at begge visninger ligger i HTML (display:none er utenfor tilgjengelighetstreet).
**Min vurdering:** NIL
**Spor:** branch `feat/5.8-timeline-list-view`

## 2026-11-07 — Story 5.9: Flaggskip-sjekk

**Prompt:** `/bmad-build-auto på story 5.9`, kun Core. Spec-en `spec-5-9-flagship-check.md` ble skrevet av KI og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** `supabase/seed.sql` med 40-årsdagen (fiktive brukere som kan logge inn, fire aktive Roller, Task-grafen med ferdig, forfalt, blokkert, venter, ikke akseptert etter 48 timer, Subtask og én foreslått rad), pgTAP over de seedede radene, Playwright for Organizer og Venue-holder og et tidsatt manuelt skript.
**Valg som må forklares:** Problem, Decision Task og Proposed-kort finnes ikke i Core, så seeden dekker bare Core-tilstander og testene hevder at ingen plassholdere vises. Seeden er gjenkjørbar: den sletter først sine egne brukere (kaskade). Tre eldre pgTAP-tester som talte alle rader i tabellen ble avgrenset, siden seeden nå ligger i databasen.
**Review:** Fire review-lag fant 5 fikser (manuelt skript manglet en Task til testeren, seed-datoer i UTC i stedet for Oslo og for nær i tid, lane-telling, lokal-advarsel); 3 utsatt (re-seed i pgTAP, plassholderstrenger, Problem/Decision/Proposed-kort). Triage står som PR-kommentar.
**Min vurdering:** NIL
**Spor:** branch `feat/5.9-flagship-check`, PR for 5.9

## 2026-11-07 — Story 7.1: Personlig gjestelenke

**Prompt:** `/bmad-build-auto på story 7.1`, kun Core, sikkerhetskritisk. Spec-en `spec-7-1-personal-guest-link.md` ble skrevet av KI og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** *Copy link*, *Copy invitation text*, *Copy all links* og *New link* på Guests-siden. Kopieringen finner eller lager en passordløs gjestebruker med secret key (invitee creation, AD-5) og gir gjestens ene aktive `guest`-token. `/invite` hilser gjesten, og *Continue* (POST, egen limiter-bucket) gir session bare til en guest-only bruker, ellers innlogging med e-posten utfylt. Guest-only avgjøres ett sted i SQL, og en trigger på `auth.users` fjerner `password_pending` og opphever gjestelenker når passordet endres.
**Valg som må forklares:** Tokenet er HMAC-SHA256 av token-id med en nøkkel i Supabase Vault, så samme lenke kan kopieres igjen (også i *Copy all links* etter en feil) mens bare SHA-256 lagres. Session lages med admin `generateLink` + `verifyOtp` på serveren med en gang; hashen forlater aldri serveren. *New link* avslutter sessions bare for guest-only brukere. En slettet Event gir den generelle teksten, fordi tokens slettes med Eventen (Story 3.5).
**Review:** Fire uavhengige reviewere ga 39 funn (1 høy, 10 medium, 24 lave, 4 falske). Rettet: endret e-post nullstiller «Opened» og låser raden, første åpning registreres også ved innlogging, *Copy all links* går gjennom én batch-action (Next kjører actions i rekkefølge), avlyst/avsluttet beholder cookien, AC-teksten for ugyldig lenke med Vitest, pgTAP for andre Events, fire nye e2e og tvungen rekkefølge i race-testen. Utsatt (høy): en gjestesession kan sette passord eller koble OAuth-identitet og beholde kontoen etter *New link*; krever eierens beslutning om Auth-innstillinger. Triage står som PR-kommentar.
**Min vurdering:** NIL
**Spor:** branch `feat/7.1-personal-guest-link`, PR for 7.1

## 2026-11-07 — Story 7.3: RSVP: ja eller nei, følgesvenn og andre behov

**Prompt:** `/bmad-build-auto på story 7.3`, kun Core. Spec-en `spec-7-3-rsvp-yes-or-no-plus-one-and-other-needs.md` ble skrevet av KI og implementert av en subagent med spec-en som eneste kilde.
**KI foreslo:** Tabellen `rsvps` (én rad per gjest, SELECT-only) skrevet bare av `guests_submit_rsvp(event_id, answers, expected_updated_at)`, som finner gjesten fra `auth.uid()` og Eventen. Siden `/rsvp/[eventId]` stiller ett spørsmål per skjerm (ja/nei, følgesvenn, andre behov) og bekrefter; *No* avslutter på første spørsmål og nullstiller følgesvenn og tekster. Guests-fanen viser «Coming» / «Not coming» med svarteksten. `/invite` sender gjestens egen session videre til `/rsvp/{event_id}`.
**Valg som må forklares:** Policyen `events_select_guest` er en bevisst utvidelse som ikke står i planleggingsdokumentene: gjester må lese navn, dato, tidssone, svarfrist og avlysningsnotat (AD-3 sier «egne rader»). Alle avviste kallere (annen Events gjest, Role-holder, anonym, fjernet gjest, ukjent eller upublisert Event) får samme `42501` uten å avsløre noe. Action-en revaliderer ikke noen sti: gjestens egen flyt skulle ellers remonteres midt i en endring.
**Review:** Fire uavhengige reviewere ga 24 funn (0 høy, 7 medium, 14 lave, 3 falske). Rettet: usynlig navnefeil på steg 3, skjult tekst som avviste et gyldig *No*, skjema som sto åpent etter avlysning, Retry under sending, tidsstempel tatt før radlåsen, svar som ble igjen etter e-postbytte, gjeste-Events i *All events*, manglende pgTAP-gren og e2e for avsluttet Event. `loadEvent` gir nå 404 for gjester. Utsatt: `events_select_guest` gir gjesten hele Event-raden (AD-3), og *Undo* etter fjerning mister svaret. Triage står som PR-kommentar.
**Min vurdering:** NIL
**Spor:** branch `feat/7.3-rsvp-yes-or-no-plus-one`
