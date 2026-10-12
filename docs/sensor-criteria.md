# Sensorkriterier som krav til Arrangly

Kilde: *Sensorveiledning IBE160 – Del 1, Applikasjon og prosess (70 %)*, høst 2026.
Hvert punkt sensor ser etter er gjort om til et krav (`SK-x.y`). Kolonnen **Dekning** viser hvor kravet allerede står i planverket per 2026-10-12, og **Tiltak** sier hva som mangler.

Status: ✅ dekket · ⚠️ delvis dekket · ❌ ikke dekket

## Vekting

| Nr. | Kriterium | Vekt |
| --- | --- | --- |
| 1 | Prosess og KI-styring | 30 % |
| 2 | Funksjonalitet og omfang | 20 % |
| 3 | Kvalitetssikring og testing | 15 % |
| 4 | Design og brukeropplevelse | 10 % |
| 5 | Kodekvalitet og arkitektur | 10 % |
| 6 | README og kjørbarhet | 10 % |
| 7 | Ryddighet i repoet | 5 % |

Kriterium 1, 6 og 7 (prosess og etterprøvbarhet) teller 45 %. Karakter per kriterium regnes om til tall (A=5 … F=0), vektes og summeres; A ≥ 4,5 · B ≥ 3,5 · C ≥ 2,5 · D ≥ 1,5 · E ≥ 0,5.

## Nivåvurdering av dekningsgraden (A–F)

Vurdert 2026-10-12 mot sensorveiledningens kjennetegn. Det finnes ingen kode ennå, så vurderingen gjelder to ting:

- **Nivå nå:** hvilket kjennetegn planverket og repoet treffer slik de er i dag, og hvilket nivå appen vil få hvis planen gjennomføres akkurat som skrevet.
- **Nivå med tiltak:** hvilket nivå som er realistisk hvis tiltakene i tabellene under gjennomføres.

For kriterium 1, 6 og 7 vurderes det som allerede ligger i repoet. For kriterium 2–5 er dette en vurdering av planen, ikke av ferdig kode.

| Nr. | Kriterium | Vekt | Nivå nå | Nivå med tiltak | Avgjørende for nivået |
| --- | --- | --- | --- | --- | --- |
| 1 | Prosess og KI-styring | 0,30 | **C** | B (A mulig) | Prompts er ikke koblet til konkrete endringer; noen store commits med uklare meldinger |
| 2 | Funksjonalitet og omfang | 0,20 | **B** | B (A mulig) | Planen gir A–B, men Core er stor for én utvikler; risikoen er å ikke nå egen ambisjon |
| 3 | Kvalitetssikring og testing | 0,15 | **B** | A | Testkravene er på A-nivå; feil som ble funnet og rettet dokumenteres ikke |
| 4 | Design og brukeropplevelse | 0,10 | **A** | A | Fullstendig UX-spine, tilgjengelighetsreview og valideringsrapport |
| 5 | Kodekvalitet og arkitektur | 0,10 | **B** | A | Linter, formatterer og regel mot død kode mangler |
| 6 | README og kjørbarhet | 0,10 | **D** | B (A mulig) | Ingen story eller NFR stiller krav til README; dagens README har ingen oppstartsinstruks |
| 7 | Ryddighet i repoet | 0,05 | **C** | A | `.playwright-mcp/` med binærfil er versjonert; PDF i rotmappen |
| | **Vektet skår** | 1,00 | **3,55 → B** | **4,40 → B** (A hvis 1 eller 2 når A) | |

Utregning nå: 0,30·3 + 0,20·4 + 0,15·4 + 0,10·5 + 0,10·4 + 0,10·2 + 0,05·3 = 3,55, altså B, men bare så vidt over grensen (≥ 3,5). Et fall på ett kriterium gir C.
Med tiltak (1=B, 2=B, 3=A, 4=A, 5=A, 6=B, 7=A): 1,2 + 0,8 + 0,75 + 0,5 + 0,5 + 0,4 + 0,25 = 4,40, altså B. For å nå A (≥ 4,5) må også kriterium 1 eller 2 nå A.

### Begrunnelse per kriterium

**1. Prosess og KI-styring: C.** Dette treffer kjennetegnet for C nesten ordrett: «Planleggingsdokumenter og prompts finnes, men koblingen til koden er delvis implisitt. Historikken viser utvikling over tid, med noen store eller lite beskrivende commits.»
- *Hva som trekker opp mot B:* BMAD-dokumentene er brukt og oppdatert, ikke generert én gang. Brief → PRD (PRD1–PRD3, Final) → UX 0.1–1.0 → arkitektur → epics, med adversarial-, tilgjengelighets- og rubric-reviews og tilbakemelding på product brief. Det er flere tydelige eksempler på at KI-forslag ble vurdert og rettet. Beslutninger er begrunnet (AD-1–AD-21, refleksjonsnotater).
- *Hva som holder igjen på C:* Commit-meldingene «PRD3», «UX 0.2» og «Epic 0.3» er lite beskrivende. «UX 0.1» og «UX 0.2» er på rundt 6 500 linjer hver, og «UX 0.2» rører 44 filer. Tidlig arbeid ble committet rett på `main`, det finnes bare to PR-er og ingen issues. Prompts og KI-økter er ikke lagret slik at de kan knyttes til en bestemt endring.
- *Til B:* KI-logg per story med lenke til commit/PR (SK-1.5), story-id i commits, PR-er og issues (SK-1.2–1.4).
- *Til A:* det samme, fulgt konsekvent gjennom hele implementeringen, med flere dokumenterte eksempler på at KI-kode ble avvist eller rettet.

**2. Funksjonalitet og omfang: B.** Hvis Core leveres som planlagt, treffer appen A–B: tre personas, RBAC i databasen, KI-integrasjon, e-post/push, ikke-trivielle regler (beslutningsoppgaver, foreldede oppgaver, 48-timersregelen) og edge-case-AC i hver story.
- *Hvorfor ikke A nå:* A krever at kjernefunksjonaliteten er «komplett og stabil». PRD-ens egen PM-merknad sier at Core har vokst mer enn de ekstra dagene dekker. Hvis noe kuttes uten god begrunnelse, faller nivået til D–E («omfanget er klart mindre enn proposal tilsier uten god begrunnelse»). NFR13 sin kuttrekkefølge beskytter mot dette bare hvis kuttene også dokumenteres for sensor (SK-2.4).
- *Til A:* Core levert stabilt, flaggskipscenariet (NFR11) grønt i produksjon, og «levert vs. planlagt» i README.

**3. Kvalitetssikring og testing: B.** Testkravene i seg selv er på A-nivå: pgTAP med allow og deny for hver policy, Vitest, Playwright for UJ-1–3, alt i CI. A krever også at kvalitetssikringen er «systematisk og dokumentert, med konkrete eksempler på feil som ble avdekket og rettet». Dette mangler: review-funn lagres ikke i repoet, og det finnes ingen manuell testplan.
- *Til A:* review-funn som PR-kommentarer og i KI-loggen (SK-3.3), og `docs/testplan.md` (SK-3.2).

**4. Design og brukeropplevelse: A.** Alle punktene sensor ser etter er spesifisert:
- konsistent designsystem (DESIGN.md, shadcn/ui)
- navigasjon og informasjonsstruktur (EXPERIENCE.md)
- tilbakemeldinger og tomtilstander (NFR16)
- WCAG 2.2 AA med kontrastmatrise og tilgjengelighetsreview (NFR6)
- skjermstørrelser ned til 320 px
- spor av designarbeid (mockups, valideringsrapport)

Risikoen ligger i gjennomføringen, ikke i planen.

**5. Kodekvalitet og arkitektur: B.** Struktur og navngiving samsvarer med arkitekturen (AD-1, konvensjoner, ordliste), og konfigurasjon håndteres godt (Zod-validert env, pinnet stack). A krever «konsekvent» kode, og sensor ser spesifikt etter linter/formatterer og fravær av død kode. Ingen av delene er et krav i planen ennå.
- *Til A:* ESLint + Prettier i CI fra Story 1.1, og «ingen utkommentert kode eller ubrukte filer» i Definition of Done (SK-5.3, SK-5.4).

**6. README og kjørbarhet: D.** Dagens README treffer F («appen kan ikke kjøres ut fra beskrivelsen»), men det er naturlig så lenge det ikke finnes kode. Nivået D gjelder planen: seed-data, fixture-modus for KI og Zod-validert env gjør appen *mulig* å kjøre, men ingen story krever README, `.env.example`, versjonsliste, testbrukere eller testkommandoer. Det gir D–E («README er mangelfull … krever betydelig innsats»). Lokal kjøring krever i tillegg Docker og Supabase CLI, så hullene blir dyre innenfor sensors 15–20 minutter.
- *Til A–B:* SK-6.2–6.8 som akseptkriterier i Story 1.1 og Epic 11, med en siste test fra ren klon. Produksjons-URL med demobrukere er plan B.

**7. Ryddighet i repoet: C.** `.gitignore` er god, ingen hemmeligheter er committet, og strukturen er tydelig. Men `.playwright-mcp/` (skjermbilder og en `.crx`-binærfil) er versjonert, og PDF-en ligger løst i roten. Det gir C («enkelte overflødige filer»).
- *Til A:* rydd de to filene/mappene og legg til hemmelighetsskanning i CI (SK-7.2–7.4).

## Sensors fremgangsmåte, gjort om til krav

Sensor kloner repoet ved fristen, følger **bare** README, bruker 15–20 minutter på å få appen i gang, tester kjerneflytene (også feil input), ser på historikk, prosessdokumenter, tester og kode. Det gir disse overordnede kravene:

| Id | Krav | Dekning | Tiltak |
| --- | --- | --- | --- |
| SK-0.1 | Siste commit før 2026-12-20 er en kjørbar, komplett leveranse; ingenting viktig skjer etter fristen. | ✅ NFR11, Epic 11 | — |
| SK-0.2 | En fremmed får appen til å kjøre på en ren maskin på under 15 minutter, kun ved å følge README. | ❌ | Se SK-6. Største enkeltrisiko: lokal kjøring krever Docker + Supabase CLI. |
| SK-0.3 | Proposal/product brief, PRD og levert app beskriver samme app. | ⚠️ brief + PRD finnes | Avvik fra brief må samles ett sted (SK-2.4). |

## 1. Prosess og KI-styring (30 %)

| Id | Krav | Dekning | Tiltak |
| --- | --- | --- | --- |
| SK-1.1 | BMAD-dokumentene (brief, PRD, UX, arkitektur, epics/stories) er *brukt og oppdatert* underveis, ikke generert én gang. | ✅ Brief → PRD → UX → arkitektur → epics, med reviews, `.memlog.md` og versjonerte commits | Behold: oppdater planverket via `bmad-correct-course` når koden avviker, så historikken viser at planen lever. |
| SK-1.2 | Hver funksjon i koden kan spores til FR og story, og avvik fra planen er forklart. | ⚠️ Stories har id-er og FR-dekningskart; AGENTS.md krever `bmad-correct-course` ved avvik | Krev story-id i branchnavn, PR-tittel og commit-melding (f.eks. `feat/4.3-…`, `4.3: …`). |
| SK-1.3 | Jevn commit-historikk over tid; små, avgrensede commits med beskrivende meldinger. | ❌ Ikke et krav. Dagens meldinger er ofte uklare («PRD3», «UX 0.2», «Epic 0.3») | Innfør meldingsformat i AGENTS.md: `<story-id>: <hva og hvorfor>`. Minst én commit per arbeidsdag med fremdrift; ingen «big bang» før fristen. |
| SK-1.4 | Arbeidet organiseres med branches, pull requests og issues. | ⚠️ Branch + PR er påbudt i AGENTS.md; issues brukes ikke | Én GitHub-issue per story (eller per epic) som PR-en lukker (`Closes #n`). Feil funnet i KI-kode registreres også som issues. |
| SK-1.5 | Lagrede prompts og KI-økter; konkrete eksempler på at KI-forslag ble presisert, avvist, rettet eller forbedret. | ⚠️ `Co-Authored-By`-trailer, `.memlog.md`, `docs/team.md`, refleksjonsnotater. Ingen samlet KI-logg | Opprett `docs/ki-logg.md`: per story → nøkkelprompts, hva KI foreslo, hva som ble avvist/rettet og hvorfor, med lenke til commit/PR. Dette er motgiften mot varseltegnet «KI-dokumentasjon er generell og kan ikke knyttes til konkrete endringer». |
| SK-1.6 | Teknologi-, arkitektur- og løsningsvalg er dokumentert med begrunnelse. | ✅ ARCHITECTURE-SPINE (AD-1–AD-21), `docs/refleksjonsnotater.md` | — |
| SK-1.7 | Historikken viser arbeid over tid av gruppen. | ✅ Solo; jevnt fordelt i planfasen | Hold jevn takt i implementeringsfasen (se SK-1.3). |

## 2. Funksjonalitet og omfang (20 %)

| Id | Krav | Dekning | Tiltak |
| --- | --- | --- | --- |
| SK-2.1 | Kjerneflytene fra brief/PRD og README fungerer fra start til slutt. | ✅ UJ-1–UJ-3, NFR11 (flaggskipscenario), Playwright-krav i NFR9 | README må beskrive de samme flytene (SK-6.1). |
| SK-2.2 | Omfanget matcher ambisjonen: datalagring, flere roller, integrasjoner, ikke-trivielle regler. | ✅ Tre personas, RBAC i databasen, KI-gateway, e-post/push, beslutningsoppgaver | — |
| SK-2.3 | Appen tåler feil input, gjentatte handlinger og uventet bruk uten å krasje. | ✅ Zod i alle Server Actions, `{ok,error}`-kontrakt, rate limits (NFR10), idempotens i FR11, edge-case-AC i stories | Legg inn en eksplisitt «feil input»-runde i manuell testplan (SK-3.2). |
| SK-2.4 | Det som er utelatt eller endret fra proposal/brief er beskrevet og begrunnet. | ⚠️ PRD §6 (Core/Target/Stretch), `review-feasibility.md`, NFR13 kuttrekkefølge | Lag en kort seksjon i README «Omfang: levert vs. planlagt» som lister Core levert, Target/Stretch utelatt, og eventuelle kutt etter NFR13, med lenker. |

## 3. Kvalitetssikring og testing (15 %)

| Id | Krav | Dekning | Tiltak |
| --- | --- | --- | --- |
| SK-3.1 | Automatiske tester (enhet, integrasjon, E2E) som kjører etter README og tester meningsfull logikk. | ✅ NFR9: pgTAP (allow + deny per policy), Vitest, Playwright, i CI på hver push | README må ha eksakte testkommandoer (SK-6.5). |
| SK-3.2 | Dokumenterte manuelle tester/testplaner der automatikk ikke passer. | ❌ | `docs/testplan.md`: manuelle sjekker for e-post, web push, skjermleser/tastatur, 320 px, feil input. Kryss av med dato før levering. |
| SK-3.3 | Spor av kodegjennomgang: PR-kommentarer, beskrivelser av feil i KI-kode og hvordan de ble rettet. | ⚠️ `bmad-code-review` finnes; eieren reviewer alle PR-er. Funn lagres ikke i repoet | Review-funn postes som PR-kommentarer (f.eks. `/code-review --comment`) og de viktigste føres i `docs/ki-logg.md` (SK-1.5). |
| SK-3.4 | Feilhåndtering, inputvalidering og sikkerhetsbevissthet; ingen hemmeligheter i koden. | ✅ Zod, RLS som sikkerhetsgrense, AD-5, AD-11, lint-regel mot hemmelig nøkkel i klient (Story 1.1) | Legg til hemmelighetsskanning i CI (SK-7.3). |

## 4. Design og brukeropplevelse (10 %)

| Id | Krav | Dekning | Tiltak |
| --- | --- | --- | --- |
| SK-4.1 | Konsistent visuelt uttrykk: farger, typografi, avstand, komponenter. | ✅ DESIGN.md, shadcn/ui, Story 1.2 | — |
| SK-4.2 | Tydelig navigasjon og informasjonsstruktur. | ✅ EXPERIENCE.md, NFR12 | — |
| SK-4.3 | Forståelige tilbakemeldinger, feilmeldinger og tomtilstander. | ✅ EXPERIENCE.md, NFR16, i18n-nøkler for feil | — |
| SK-4.4 | Grunnleggende tilgjengelighet: kontrast, tastatur, alt-tekst, skjemaetiketter. | ✅ NFR6 (WCAG 2.2 AA), `review-accessibility.md` | Bekreftes manuelt i testplanen (SK-3.2). |
| SK-4.5 | Tilpasning til relevante skjermstørrelser. | ✅ NFR5 (375 px), NFR6 (320 px / 400 %) | — |
| SK-4.6 | Spor av designarbeid i planleggingen. | ✅ UX-spine, mockups, validation report | Lenk dem fra README (SK-6.6). |

## 5. Kodekvalitet og arkitektur (10 %)

| Id | Krav | Dekning | Tiltak |
| --- | --- | --- | --- |
| SK-5.1 | Mappe- og modulstruktur samsvarer med beskrevet arkitektur. | ✅ AD-1, kildelayout i epics «Additional Requirements» | — |
| SK-5.2 | Lesbar kode, beskrivende navn, kommentarer der det trengs. | ✅ Navnekonvensjoner i arkitekturen, ordliste brukt ordrett | — |
| SK-5.3 | Lite duplisering, død kode og utkommenterte KI-rester. | ⚠️ Ikke et eksplisitt krav | Legg til i Definition of Done: ingen utkommentert kode eller ubrukte filer i en PR. |
| SK-5.4 | Konsekvent stil støttet av linter/formatterer. | ⚠️ Lint nevnes bare for AD-5-regelen; ingen formatterer valgt | Story 1.1: ESLint (Next-standard) + Prettier, `pnpm lint` og formatsjekk i CI. |
| SK-5.5 | Fornuftig håndtering av konfigurasjon og avhengigheter. | ✅ Zod-validert env, pinnet stack, pnpm-lås | — |

## 6. README og kjørbarhet (10 %)

Svakeste område i dag: README er en kort presentasjon, og ingen story eller NFR stiller krav til den.

| Id | Krav | Dekning | Tiltak |
| --- | --- | --- | --- |
| SK-6.1 | Kort beskrivelse av hva appen gjør og for hvem, med skjermbilde. | ⚠️ Beskrivelse finnes, ikke skjermbilde | Skjermbilder i `docs/images/` når UI finnes. |
| SK-6.2 | Forutsetninger med versjoner (Node, pnpm, Docker, Supabase CLI). | ❌ (Node-versjon er TODO i AGENTS.md) | Story 1.1 fastsetter versjonene; README lister dem. |
| SK-6.3 | Steg-for-steg installasjon og oppstart med eksakte kommandoer som kan kopieres. | ❌ | README «Kom i gang»: `pnpm install` → `supabase start` → `cp .env.example .env.local` → `supabase db reset` → `pnpm dev`. Testes på ren maskin før levering. |
| SK-6.4 | Miljøvariabler forklart, med `.env.example` uten ekte hemmeligheter. | ⚠️ `.gitignore` tillater `.env.example`; filen er ikke et krav i noen story | Story 1.1: `.env.example` med lokale standardverdier, slik at fixture-modus for KI og lokal e-post (Supabase sin innebygde e-postinnboks) virker uten egne nøkler. |
| SK-6.5 | Testdata/testbrukere, og hvordan testene kjøres. | ⚠️ Seed med flaggskipscenario (Epic 11); testkommandoer er TODO | README lister testbrukere fra `seed.sql` (e-post + passord for Arrangør, Rolleinnehaver, Gjest) og kommandoene for pgTAP, Vitest og Playwright. |
| SK-6.6 | Oversikt over mappestrukturen og lenker til planlegging og prosessdokumentasjon. | ⚠️ Lenke til `_bmad-output/` og `docs/team.md` | Mappeoversikt + lenker til PRD, arkitektur, UX, epics, KI-logg, testplan, refleksjonsnotater. |
| SK-6.7 | README er tilpasset og oppdatert, ikke mal eller generert tekst som ikke stemmer. | ⚠️ | Egen sjekk i Epic 11: følg README fra ren klon og rett alt som feiler. |
| SK-6.8 | (Avledet) Plan B hvis lokal kjøring feiler: deployet app sensor kan bruke. | ⚠️ NFR15 sier demo-prosjektet åpnes dagen før | Lenke til produksjons-URL og demobrukere øverst i README. |

## 7. Ryddighet i repoet (5 %)

| Id | Krav | Dekning | Tiltak |
| --- | --- | --- | --- |
| SK-7.1 | Oversiktlig struktur med skille mellom kode, dokumentasjon og ressurser. | ✅ `src/`, `supabase/`, `docs/`, `_bmad-output/` | — |
| SK-7.2 | `.gitignore` holder byggeartefakter, avhengigheter og lokale filer ute. | ⚠️ God `.gitignore`, men `.playwright-mcp/` (skjermbilder og en `.crx`-fil) er versjonert | Fjern `.playwright-mcp/` fra git og legg den i `.gitignore`. |
| SK-7.3 | Ingen hemmeligheter i repoet eller historikken. | ✅ `.env*` ignorert, AD-5 | Legg til hemmelighetsskanning (f.eks. gitleaks) som ett steg i CI. |
| SK-7.4 | Ingen løse testfiler, sikkerhetskopier eller tilfeldige filer i rotmappen. | ⚠️ Sensorveiledningen ligger som PDF i roten | Ikke commit PDF-en, eller flytt den til `docs/kurs/`. |
| SK-7.5 | Fornuftige fil- og mappenavn. | ✅ Konvensjoner i arkitekturen | — |

## Varseltegn sensor sjekker

| Varseltegn | Vern i Arrangly |
| --- | --- |
| Nesten all kode i noen få commits rett før fristen | SK-1.3 (små commits per story), story-for-story PR-er |
| Planen beskriver en annen app enn den leverte | SK-1.1, SK-2.4, `bmad-correct-course` |
| README er en mal, eller kommandoene virker ikke | SK-6.3, SK-6.7 |
| API-nøkler, passord eller `.env` committet | SK-7.3 |
| `node_modules`, build-mapper eller binærfiler i repoet | SK-7.2 (`.playwright-mcp/` er et eksempel i dag) |
| Testene feiler eller er trivielle | NFR9 (allow + deny per policy, CI på hver push) |
| Død kode og rester fra forkastede KI-forsøk | SK-5.3 |
| KI-dokumentasjonen er generell og ikke knyttet til endringer | SK-1.5 (`docs/ki-logg.md` med lenker til commits/PR-er) |

## Anbefalte tilpasninger, i prioritert rekkefølge

1. **KI-logg knyttet til endringer** (SK-1.5, SK-3.3): størst vekt (kriterium 1, 30 %) og ingen dekning i dag.
2. **README og kjørbarhet** (SK-6.x): legg krav inn i Story 1.1 (`.env.example`, versjoner, oppstartskommandoer) og en egen «README fra ren klon»-story i Epic 11.
3. **Commit- og PR-konvensjon med story-id og issues** (SK-1.2–1.4): én linje i AGENTS.md, gjelder fra første implementeringscommit.
4. **Manuell testplan** (SK-3.2) og **lint/format i CI** (SK-5.4).
5. **Rydding nå**: `.playwright-mcp/` ut av git, PDF-en ut av roten (SK-7.2, SK-7.4).
