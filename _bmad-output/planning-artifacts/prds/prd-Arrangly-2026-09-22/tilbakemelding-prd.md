# Tilbakemelding på PRD

| | |
|---|---|
| **Gruppe** | G136 – G136-ratneswaran |
| **PRD vurdert** | `_bmad-output/planning-artifacts/prds/prd-Arrangly-2026-09-22/prd.md` (status i frontmatter: `final`, sist endret 2026-10-13, commit 799045a) |
| **Dato** | 2026-11-12 |
| **Type** | Formativ tilbakemelding, ikke karakter |

## 1. Samlet inntrykk

Dette er en gjennomarbeidet og tydelig egen PRD. Den har en klar tese (roller som tilgangsmodell, rekkefølge og avhengigheter som førsteklasses begreper), et konsekvent glossar og FR-er med testbare konsekvenser. Den største risikoen er at PRD-en ble omskrevet til en mindre Core 2026-10-12, men FR-tekstene, brukerreisene og SM-1 fortsatt beskriver hele produktet. Det gjør det vanskelig å se hva «ferdig» betyr for Core, og KI-kontroll og kjørbarhet for sensor er i liten grad forankret i selve PRD-en.

## 2. Dette fungerer godt

1. **Ærlig tiering og begrunnede avgrensninger.** §6.1 viser en rekkefølge for Target (1–4), og FR-13 sier at manuell venue-inntasting «may remain the better path permanently», med begrunnelse fra gjennomførbarhetsvurderingen (ingen strukturert kapasitetsdata i places-API-er). Slik ser en leser hva som er valgt bort og hvorfor.
2. **Testbare FR-er.** FR-2 («rejected server-side (not just hidden in the UI)»), FR-8 («A user cannot set Blocked or Overdue directly») og FR-23 («One user action produces at most one notification per recipient») kan nesten kopieres rett inn som testtilfeller.
3. **Personvern som krav, ikke pynt.** §4.9 sier at allergidata er helseopplysninger, at de aldri sendes til KI, at de slettes 15 dager etter arrangementet, og at gjester kan velge *Delete my data*. Dette er konkrete og kan testes.

## 3. Oversikt per dimensjon

| Dimensjon | Vurdering | Kort begrunnelse |
|---|---|---|
| Beslutningsklarhet | god | Avveininger og endringer er dokumentert (§6.2, sprint-change-forslag), men §8 sier «None open» selv om §4.9 henviser til et åpent spørsmål. |
| Substans | sterk | Personaer og scenarier styrer valgene; NFR-ene (GDPR, 375 px, språk) er produktspesifikke. |
| Strategisk sammenheng | god | Tydelig tese, men visjonen lover KI som «working assistant throughout» mens all KI ligger i Target. |
| Testbarhet | god | De fleste FR-er har gode konsekvenser; noen er tynne (FR-14, FR-18) eller vage («minimum strength policy»). |
| Scope og avgrensning | god | Non-goals og tiering er eksplisitte, men FR-tekstene følger ikke Core-snittet (se 4.1). |
| Brukbarhet for neste fase | god | Kontinuerlige ID-er, glossar og krysshenvisninger; noen begreper mangler i glossaret. |
| Formtilpasning | god | Tung form er forsvarlig for tre identitetsmodeller, men 6 600 ord og gjentatt tekst er mye for en solo-leser. |

## 4. Viktigste forbedringer

### 4.1 FR-ene og SM-1 samsvarer ikke med Core
- **Alvorlighet:** høy
- **Hvor:** §6.1 «Re-scoped 2026-10-12…» mot SM-1 «Validates FR-1, FR-4, FR-6, FR-7, FR-15, FR-19, FR-22»; UJ-1 «invites go out to the full guest list in one action»; FR-9 (48-timers regel), FR-19 («flagged with a Problem, not yet accepted»), FR-18 («requests with replies»)
- **Problem og hvorfor det betyr noe:** FR-6 og FR-22 er Target, men SM-1 sier at Core skal validere dem. FR-9, FR-18 og FR-19 er Core, men inneholder oppførsel som først kommer i Target 2–4. §6.2 henviser til «Accept step … (FR-8/FR-12)», men aksepteringsregelen står i FR-9. Epics og tester vil enten bygge for mye eller for lite.
- **Forslag:** Merk hver konsekvens med nivå, for eksempel `[Core]` og `[Target 2]`. Skriv SM-1 i to trinn: «SM-1a (Core): flaggskipscenarioet kan kjøres manuelt for alle tre personaer. SM-1b (Target 1–4): …». Legg et kort «Core-utgave» på UJ-1 uten e-postutsendelse.

### 4.2 KI-kontroll og kostnad står utenfor PRD-en
- **Alvorlighet:** høy
- **Hvor:** §4.9 «Cost: … see Open Question 1 for the specific numbers still to be set» og §8 «None open»
- **Problem og hvorfor det betyr noe:** Henvisningen er død. Tak, budsjett og fixture-modus er flyttet til arkitekturen (AD-9), så PRD-en kan ikke brukes alene til å teste KI-funksjonene. Det står heller ikke hva som skjer når KI-svaret er dårlig utover «per-Task confirmation» (FR-6).
- **Forslag:** Legg inn et eget krav, for eksempel: «FR-24 KI-funksjoner har tak og testmodus. *Konsekvenser:* Når taket for en funksjon er nådd, vises tom editor med forklaring og funksjonen blokkerer aldri resten (jf. FR-22). Uten API-nøkkel returnerer KI-funksjonene faste testsvar. Ingen allergi-, mat- eller hotelldata sendes i KI-kall.» Oppdater §8 til å henvise til AD-9 med tallene.

### 4.3 Suksessmål mangler kjørbarhet og en måle-metode
- **Alvorlighet:** medium
- **Hvor:** SM-1 «A deployed, working web application … by 2026-12-20», SM-3 «within about a minute»
- **Problem og hvorfor det betyr noe:** Tilbakemeldingen på briefen ba om at appen kan kjøres lokalt uten gruppens nøkler (seed-data, testbrukere, mock-KI). Det er ikke tatt inn i SM-ene. SM-3 sier ikke hvem som måler eller hvordan.
- **Forslag:** «SM-6: En utenforstående kan følge README og kjøre appen lokalt med seed-data for flaggskipscenarioet og testbrukere for arrangør, rolleinnehaver og gjest, uten egne nøkler.» For SM-3: «To personer som ikke har sett appen, finner sin første oppgave på under ett minutt (stoppeklokke, mål 2 av 2).»

### 4.4 Glossaret dekker ikke alle begreper som brukes
- **Alvorlighet:** medium
- **Hvor:** §3 mot FR-21, FR-16, FR-4, FR-19
- **Problem og hvorfor det betyr noe:** *Announcement*, *Guests tab*, *Event language*, *custom group* og «Arrangly ✦» brukes i FR-er, men er ikke definert. Kodenavn og tabeller avledes fra glossaret.
- **Forslag:** Legg til fire til fem korte oppføringer, for eksempel: «**Announcement** – ensrettet melding fra Organizer eller Role-holder til en person, en Role eller Team; ingen svar utover *I can help*.»

### 4.5 Lengde og gjentatt tekst
- **Alvorlighet:** lav
- **Hvor:** UJ-1 og UJ-2 har identisk «Core path»-avsnitt; frontmatter `updated: 2026-09-29` er eldre enn omskrivingen 2026-10-12/13
- **Problem og hvorfor det betyr noe:** Gjentakelse skjuler hva som faktisk gjelder per reise, og PRD-en er lang å bruke som oppslagsverk.
- **Forslag:** Skriv en reisespesifikk Core-linje per UJ, og oppdater `updated`. Flytt endringshistorikken (Core/Target-flyt) til et eget kort vedlegg.

## 5. Mekaniske funn

- ID-er: FR-1–FR-23, UJ-1–3 og SM-1–5/C1–C2 er sammenhengende. FR-23 står før FR-22 i dokumentet, noe som er greit, men kan forvirre.
- Død henvisning: «Open Question 1» (§4.9) finnes ikke lenger (§8).
- Feil henvisning: §6.2 «FR-8/FR-12» for Accept-steget; regelen står i FR-9. §6.1 «FR-12 (delegation and its history)» passer ikke med FR-12 (delegert/ikke delegert); historikken er i FR-7.
- Vage konsekvenser: «a password meeting a minimum strength policy» (FR-1), «ordered by dependency» (FR-20).
- `[ASSUMPTION]`: ingen åpne, og indeksen stemmer.

## 6. Før dere går videre

**Må avklares nå (før epics og tester):**
- Hvilke konsekvenser i FR-9, FR-12, FR-18 og FR-19 som gjelder Core (se 4.1).
- Hvor KI-tak, testmodus og feilmåter er forankret, og at SM-ene kan måles uten gruppens nøkler.

**Kan vente:**
- Nye glossaroppføringer (4.4), opprydding i lengde og tekstgjentakelser (4.5), skjerping av passordkrav.

**Oppfølging av tilbakemeldingen på briefen:** delvis. Core er kraftig redusert og flyttet til Target i rekkefølge (ja), og testsvar for KI er nevnt som strategi. Tilgangsmatrise som fasit og lokal kjøring med seed-data og testbrukere er ikke funnet i PRD-en.

## 7. Refleksjonsspørsmål

1. §0 sier at KI-skillen strukturerte reisene, og SM-C1 sier at høy aksept av KI-forslag kan bety «rubber-stamping». Hva i denne PRD-en godtok dere fra KI uten å endre, og hvordan kontrollerte dere at det var riktig?
2. Visjonen beskriver KI som «working assistant throughout», men Core har ingen KI. Hva er dere komfortable med å vise frem hvis bare Core blir ferdig, og hvordan skal visjonsteksten gjenspeile det?

_Vurdert mot kvalitetsrubrikken i bmad-prd. Dette er veiledning, ikke sensur._
