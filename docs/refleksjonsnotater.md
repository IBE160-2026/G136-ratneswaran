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
