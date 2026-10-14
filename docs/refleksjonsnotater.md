# Refleksjonsnotater

Løpende notater om valg og avveininger, til refleksjonsrapporten (30 %). Én oppføring per valg som skal forklares.

## 2026-09-30 — Innloggingsmetoder: bare e-post, Google og GitHub

**Valg:** Arrangører og rolleinnehavere logger inn med e-post og passord, Google eller GitHub. Facebook, Apple og Vipps er droppet helt fra v1.

**Hvorfor:**
- Supabase støtter alle fem teknisk, så grunnen er ikke koden, men det som kreves utenfor koden.
- **Vipps** krever en avtale med Vipps MobilePay knyttet til et organisasjonsnummer. Det har jeg ikke som privat student.
- **Apple** krever et betalt Apple Developer-medlemskap.
- **Facebook** krever at Meta godkjenner appen. Den tidsbruken er usikker og kunne truet fristen 2026-12-20.
- Google og GitHub er gratis og raske å sette opp, og dekker de fleste brukerne. GitHub passer ekstra godt fordi dette er et skoleprosjekt.

**Avveining:** Et smalere utvalg av innloggingsmåter mot lavere kostnad, mindre risiko for å ikke rekke fristen og mindre oppsett for én utvikler. Arkitekturen er likevel klar for flere leverandører, fordi alle gir en vanlig Supabase-bruker.

## 2026-09-30 — KI-modeller: Sonnet der det synes, Haiku der det ikke synes

**Valg:** Claude Sonnet 5 lager tekst brukeren ser (oppgaveliste, e-postutkast, About-tekst). Claude Haiku 4.5 gjør usynlig sortering (hvilken rolle en gjesteforespørsel går til, forslag fra statusnotater).

**Hvorfor:** Budsjettet er 5 USD i måneden. Et tungt testet arrangement koster ca. 0,40 USD med Sonnet og ca. 1 USD med Opus, altså rundt 12 mot 5 arrangementer per måned. Oppgavelisten er det første arrangøren ser og kjernen i demoen, så der er kvalitet viktigst. Sortering vises ikke, og der holder en billig modell.

**Avveining:** Litt lavere toppkvalitet enn Opus mot tre ganger så mye testing innenfor budsjettet. Alle KI-kall går gjennom én gateway, så modellen kan byttes på ett sted.

## 2026-09-30 — E-post: Gmail nå, egen tjeneste senere

**Valg:** All e-post (innlogging, invitasjoner, påminnelser, varsler) sendes via min Gmail-konto over SMTP. Alt går gjennom én e-postmodul, så å bytte til Resend med eget domene senere er bare en endring i oppsettet.

**Hvorfor:** Supabase sin innebygde e-post sender bare 2 per time og kan ikke brukes. Resend krever et eget domene, altså en ekstra kostnad og mer oppsett nå. Gmail er gratis og klart med en gang.

**Avveining:** Gratis og raskt mot risiko for at e-post havner i søppelpost og at avsenderen er en privat adresse. Jeg har bevisst valgt å utsette dette, og byttet er planlagt.

## 2026-10-02 — Personvern (GDPR): et grunnlag nå, ikke full etterlevelse

**Valg:** Et GDPR-grunnlag er en del av Core. Data lagres i EU. Gjesten krysser av for uttrykkelig samtykke før hen oppgir allergier. Allergier sendes aldri til KI. Gjestedata slettes automatisk 15 dager etter arrangementet (antall beholdes uten navn). Gjesten kan trykke *Slett mine data*. Det finnes en side med personvernerklæring.

**Hvorfor:** Allergier og matbehov er helseopplysninger, en særlig kategori i GDPR (art. 9). Opprinnelig sa PRD-en at formell GDPR-håndtering var utenfor omfanget av v1. Under arkitekturarbeidet så jeg at det ikke er forsvarlig å behandle helsedata uten samtykke og sletting. Hver del er liten og kan testes, og passer med det som allerede var valgt (pg_cron, RLS, KI-gatewayen, pgTAP).

**Avveining:** Hvis Arrangly var et ekte produkt, ville jeg valgt full etterlevelse: protokoll over behandlingsaktiviteter, databehandleravtaler med Supabase, Vercel, Anthropic og Google, risikovurdering (DPIA) og logg over samtykker. Det er mest arbeid utenfor koden og ville truet fristen. 15 dager etter arrangementet gir arrangøren tid til takkemeldinger før dataene slettes.

## 2026-10-12 — Core redusert til det én utvikler kan fullføre

**Valg:** Core er kuttet fra rundt 90 til rundt 52 stories. Med i Core: konto, arrangement og gjesteliste, team med invitasjon via lenke, oppgaver med eier, frist, status og enkle avhengigheter, dashbord og tidslinje, RSVP og gjestesiden. Til Target, i fast rekkefølge: KI-forslag til oppgaver, godta-trinn og beslutningsoppgaver, all app-e-post med varsler og kunngjøringer, og til sist gjesteforespørsler, landingsside og KI-utkast til e-post. Funksjonsstopp er 2026-12-15.

**Hvorfor:**
- Faglærer skrev 2026-10-06 at Core var for stor for én person, og at punkter burde flyttes «nå, ikke først når det haster».
- Regnestykket bekreftet det: rundt 90 stories mot et realistisk tempo på 4–6 i uka gir plass til omtrent halvparten før funksjonsstopp.
- Sensor gir best karakter for en kjerne som er «komplett og stabil», ikke for flest mulig funksjoner.
- E-post-outboxen var den tyngste infrastrukturen (trigger, Vault, kø, retry). Uten den deles invitasjoner som lenke, og bare Supabase Auth sender e-post (engangskoder). Det fjerner fire stories og mye risiko.

**Avveining:** Et mindre imponerende produkt i Core mot et som faktisk blir ferdig og testet. Det som mest skiller Arrangly fra en vanlig oppgaveliste (KI-forslag, beslutningsoppgaver som styrer oppfølgingsoppgaver) er nå Target, men fullt spesifisert og bygges først når Core er stabil. Funksjonsstopp 15. desember gir bare fem dager til README-test og stabilisering, så README-testen kjøres også før stoppen.

## 2026-10-13 — Én rettighetsmodell og ingen helsedata i Core

**Valg:** Alle funksjoner som skriver data er `security definer` og gitt til `authenticated`, men hver av dem sjekker `auth.uid()` selv. Bare systemfunksjoner (utsending, opprydding, retention, token-bytte) er stengt for innloggede brukere. I tillegg er allergi, mat, hotell og automatisk sletting flyttet ut av Core til Target 2.

**Hvorfor:**
- Åtte åpne `bmad-correct-course`-punkter i fem epics var samme spørsmål: hvordan skriver en funksjon til tabeller brukeren ikke kan skrive til? Én modell gir én regel å teste, ikke åtte unntak.
- Helsedata krever samtykke, rolle-synlighet og sletting etter 15 dager. Uten dem trenger Core verken tabellene, retention-jobben eller samtykkeskjermen.
- Færre steder med hemmelig nøkkel (tre i stedet for fire) gir mindre sårbar flate for én utvikler å holde oversikt over.

**Avveining:** Et Core uten allergi-steget er svakere som demo av en festplanlegger, og sensor ser ikke samtykkehåndteringen før Target 2 er bygget. Til gjengjeld er Core enklere å teste og lettere å få ferdig før funksjonsstopp 15. desember.


## 2026-10-14 — Verktøyvalg i Story 1.1: ESLint 9, gitleaks-binær og pnpm-regler

**Valg:** ESLint er låst til versjon 9, hemmelighetsskanningen i CI kjører gitleaks som binærfil med sjekksum (ikke GitHub-action), og `unrs-resolver` er eksplisitt nektet byggescript i `pnpm-workspace.yaml` (`allowBuilds: false`). Corepack må installeres og slås på for npm og yarn (`corepack enable npm yarn pnpm`) for at `packageManager` skal avvise dem.

**Hvorfor:**
- ESLint 10 feiler med `eslint-plugin-react` (som følger med `eslint-config-next`), så 9 er den siste versjonen som fungerer med Next 16.3.
- gitleaks-action krever lisens for organisasjoner, og repoet ligger under en GitHub-organisasjon. Binæren er gratis, og sjekksummen gjør at en endret utgivelse ikke kjører i CI.
- pnpm 12 stopper `pnpm add` med en feil når en pakke har uavklart byggescript. Det felte `shadcn init` til jeg tok stilling til `unrs-resolver`, som bare har et reserve-byggescript for en forhåndsbygd pakke.
- Node 25 og nyere har fjernet Corepack, så uten `corepack enable` avvises ikke `npm install`. Det oppdaget jeg først da jeg prøvde.

**Avveining:** Pinnet ESLint og en nektet byggescript-regel er gjeld som må følges opp ved oppgradering. Binær med sjekksum krever at jeg manuelt bytter versjon og verdi. Til gjengjeld får CI en secret scan uten lisens og uten en uverifisert nedlasting.

## 2026-10-15 — Story 1.5: alle kontoflyter deler samme limiter-bøtter

**Valg:** Registrering, ny bekreftelses-e-post og glemt passord bruker de to eksisterende limiter-bøttene (`signup_ip`, `signup_email`) i stedet for egne bøtter per flyt. Innlogging har ingen egen limiter, siden Supabase Auth begrenser den selv. Jeg tar spørsmålet om egne bøtter som en `bmad-correct-course` etter Story 1.5.

**Hvorfor:**
- `abuse_counters` har en check-constraint som bare tillater de to bøttene fra Story 1.4, og spec for 1.5 utelukket ny migrasjon. KI oppdaget det først da e2e kjørte, ikke under planleggingen.
- En ny migrasjon midt i en story som ellers ikke rører skjemaet ville ha blandet to hensyn i én PR. Planleggingsdokumentene skal ikke endres under implementering, og AD-21 sier ikke noe om bøtter per flyt.

**Avveining:** Én person kan bruke opp tre e-poster per time ved å registrere seg, be om tilbakestilling og sende bekreftelsen på nytt, og en annen kan brenne budsjettet til en e-postadresse for tilbakestilling. Jeg godtok samme svakhet for registrering i Story 1.4 (alternativ C), men her rammer den en eksisterende bruker. Til gjengjeld ble storyen levert uten skjemaendring, og begrensningen er logget som utsatt funn.
