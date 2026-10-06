# Tilbakemelding på product brief

| | |
|---|---|
| **Gruppe** | G136 – G136-ratneswaran |
| **Product brief** | `_bmad-output/planning-artifacts/briefs/brief-Arrangly-2026-09-20/brief.md` (commit `0cb9793`), med `addendum.md` i samme mappe |
| **Tilbakemelding fra** | Faglærer i IBE160 (utarbeidet med KI-støtte) |
| **Dato** | 2026-10-06 |

## Samlet vurdering

- **Godt utgangspunkt med justeringer.** Gruppen kan gå videre og innarbeide punktene under.

**Det som er bra:**

1. Problemet er levende beskrevet og forankret i egen erfaring: bryllupsfesten der alt måtte skje i riktig rekkefølge, og der arrangøren ble den som gjorde jobben i stedet for å lede den. Flaggskipscenarioet med 40-årsdag for 80 gjester og tre personaer (arrangør, rolleinnehaver, gjest) gir et konkret grunnlag for design og testing.
2. Inndelingen i Core, Target og Stretch er et svært godt grep, og flere suksesskriterier er klart testbare: «brukere kan ikke tildele seg selv roller eller utvide egen tilgang», og en gjest kan svare, registrere følge og allergier mens arrangøren ser summen. Dere har også allerede PRD, UX og arkitektur, så briefen er brukt videre.

**De viktigste endringene:**

1. Core-nivået er for stort for én person. Det inneholder elleve punkter, blant annet RBAC per arrangement, oppgaver med avhengigheter, prioritert dashbord, full teammatrise, invitasjon med registrering, gjestesiden, to tidslinjer, meldinger og KI-forslag. Flytt flere punkter til Target nå, ikke først når det haster. Teammatrisen, meldinger og «run of show» er naturlige kandidater.
2. Planlegg hvordan sensor kan kjøre appen lokalt etter README. Suksesskriteriet sier «deployed by day 70», og arkitekturen bygger på Supabase og Vercel. Sensor må likevel kunne kjøre appen uten tilgang til deres prosjekter og nøkler, for eksempel med lokal Supabase, seed-data for flaggskipscenarioet og testbrukere for de tre personaene.
3. Beskriv KI-funksjonen og hvordan den kan kjøres uten nøkkel. Briefen sier at KI foreslår roller og oppgaver fra en kort beskrivelse, men ikke hva det koster eller hva som skjer når KI ikke svarer. Arkitekturen og `AGENTS.md` nevner Anthropic API og faste testsvar (fixtures). Det er et godt grep. Sørg for at README forklarer hvordan sensor kjører appen med disse når nøkkel mangler.

## Vanskelighetsgrad og gjennomførbarhet

### Vurdert vanskelighetsgrad

- **Vanskelig**

**Sammenlignbart med:** 3) KI-styrt simulering av prosjektledelse (vanskelig). Arrangly behandler et arrangement som et prosjekt med roller, oppgaver, avhengigheter og tidslinjer, og legger rollebasert tilgangsstyring per arrangement på toppen.

**Begrunnelse:**

| Faktor | Nivå (lav / middels / høy) | Kommentar |
|---|---|---|
| Domenelogikk – hvor mange og hvor kompliserte regler og beregninger må stemme? | Middels | Avhengigheter mellom oppgaver, status for blokkert og forsinket, og prioritering i dashbordet. Bakoverplanlegging ligger i Target. |
| Datamodell – antall entiteter og relasjoner mellom dem | Høy | Arrangement, bruker, rolle, rollemedlemskap, oppgave, deloppgave, avhengighet, tidsvindu, gjest, følge, allergi, tidslinjer og meldinger. |
| Brukere, roller og innlogging | Høy | Arrangør, rolleinnehavere og gjester med ulik tilgang per arrangement, der én person kan ha ulike roller i ulike arrangementer. Arkitekturen bruker RLS og kolonnerettigheter. |
| KI-funksjonalitet i appen, f.eks. kall til språkmodell, prompts i koden og håndtering av usikre svar | Middels | Forslag til roller og oppgaver i Core. Mer avansert planlegging og avviksdeteksjon i Target og Stretch. |
| Integrasjoner og eksterne tjenester, f.eks. API-er, betaling og e-post | Middels | Supabase, språkmodell-API og sannsynligvis e-post for invitasjoner. Eksterne kalendre og betaling er ute. |
| Sanntid, samtidighet eller flere brukere som påvirker hverandre | Middels | Flere rolleinnehavere oppdaterer status i samme arrangement, og arrangøren skal se fremdriften. Sanntid er ikke et krav. |
| Filhåndtering, f.eks. opplasting, PDF-lesing og eksport | Lav | Ikke en del av Core. |
| Sikkerhet og personvern | Høy | Tilgangsstyring er sentralt, og gjestedata inkluderer allergier (helseopplysninger). |

**Hva vanskelighetsgraden betyr for dere:**

- _Vanskelig:_ Et vanskelig prosjekt gir større mulighet for toppkarakter, men også større risiko. Definer en minimal versjon som sikkert kan bli ferdig, og legg resten i tydelige trinn etterpå. Tiers-modellen deres er et godt utgangspunkt, men Core må bli mindre for å være den sikre minimumsversjonen.

### Gjennomførbarhet med BMAD og Claude Code

Dere skal planlegge med BMAD (product brief → PRD → arkitektur → epics og stories) og implementere med Claude Code. Vurderingen under tar hensyn til at det må være tid til hele denne flyten, og til testing, retting og README til slutt.

| Spørsmål | Vurdering (OK / risiko / stor risiko) | Kommentar |
|---|---|---|
| **Tid og omfang** – kan v1 realistisk bli ferdig og stabil i løpet av semesteret, med tid til flere iterasjoner? | Stor risiko | Elleve Core-punkter for én person er for mye til at alle blir stabile. Dere har kommet langt i planleggingen, men implementeringen gjenstår. |
| **BMAD-flyten** – er briefen konkret nok til at PRD, arkitektur og stories kan lages uten store hull, og blir det overkommelig mange stories? | OK | Briefen er konkret og har allerede båret videre til PRD, UX og arkitektur. Antall stories i Core blir høyt. |
| **Egnet for Claude Code** – bruker løsningen en vanlig, godt dokumentert teknologistakk som Claude Code håndterer godt, eller krever den nisjeteknologi, spesialmaskinvare eller mye manuell konfigurasjon? | Risiko | Next.js og Supabase er godt dokumentert. Arkitekturen med RLS, kolonnerettigheter, SQL-funksjoner og transaksjonell outbox er avansert og krever at dere forstår sikkerhetsreglene godt nok til å kontrollere Claude Codes arbeid. |
| **Kontroll på KI-ens arbeid** – kan gruppen selv avgjøre om koden gjør det riktige? Krever domenet kunnskap gruppen ikke har, f.eks. avanserte beregninger eller fagregler, så er det vanskelig å kvalitetssikre. | Risiko | Domenet er kjent for dere. Det vanskelige er å kontrollere at tilgangsreglene faktisk holder. Lag en tilgangsmatrise (hvem kan se og endre hva) som fasit for tester. |
| **Testbarhet** – finnes det tydelige regler og forventede resultater som tester kan skrives mot? | OK | RBAC-kriteriene, gjestekriteriene og oppgavestatus er godt egnet for automatiske tester. |
| **Kjørbar for sensor** – kan appen kjøres lokalt etter README, uten gruppens nøkler, betalte kontoer eller egen infrastruktur? | Risiko | Avhengig av Supabase og KI-nøkkel. Lokal Supabase krever Docker. Beskriv oppsettet steg for steg og inkluder seed-data og testbrukere. |
| **Avhengigheter og kostnader** – krever løsningen betalte API-er, f.eks. språkmodeller, og finnes det en plan for kostnad, testmodus eller mock-data? | Risiko | Arkitekturen bruker Anthropic API, men kostnad er ikke omtalt i briefen. Faste testsvar for utvikling og test er planlagt, og bør også brukes som fallback for sensor. |

**Konklusjon om gjennomførbarhet:**

- **Gjennomførbart med justert omfang.** Se forslagene under.

**Forslag til justering av omfang eller vanskelighetsgrad:**

1. Gjør Core til: opprette arrangement, roller og RBAC, oppgaver med eier, frist, status og enkle avhengigheter, arrangørdashbord, rolleinnehaverens visning, invitasjon med lenke, og gjestesiden. Flytt teammatrisen, meldinger, «run of show» og KI-forslag til Target.
2. Når Core er stabil, legg KI-forslag til roller og oppgaver først i Target, med mock-modus, siden det er den mest synlige KI-funksjonen og knytter an til visjonen.

## Hvorfor product brief er viktig for mappen

Product brief er utgangspunktet for PRD, arkitektur, stories og til slutt koden. Del 1 av mappen vurderes blant annet på om sensor kan følge en sporbar vei fra plan til ferdig app. Den vurderes også på om appen gjør det dere har beskrevet, om den er testet, om den er godt designet, og om den kan kjøres etter README. Et uklart, for stort eller for lite brief gjør alt dette vanskeligere senere. Det er mye enklere å rette nå enn sent i semesteret.

## 1. Gjennomgang av briefens deler

| Del av brief | Status | Kommentar |
|---|---|---|
| Executive Summary – er det klart hva appen er, og hvilket problem den løser? | OK | Klart at Arrangly gjør et arrangement til et styrt prosjekt med roller, og at arrangøren skal lede i stedet for å mase. Briefen er på engelsk, noe som er greit. |
| The Problem – er problemet konkret, med reelle situasjoner og brukere? | OK | Svært konkret, med avhengigheter som setekart som venter på svar og barmeny som venter på cateringen. |
| The Solution – beskriver løsningen brukeropplevelsen, ikke bare teknologi? | OK | Beskriver hva arrangør, rolleinnehaver og gjest ser og gjør. |
| What Makes This Different – er vurderingen ærlig og realistisk? | OK | Ærlig om at ingenting er en teknisk voll, og at fordelen er fokus og integrasjon. |
| Who This Serves – er primærbrukerne tydelige, og vet vi hva de trenger? | OK | Amatørarrangøren som primærbruker, med rolleinnehaver og gjest som tydelige sekundærbrukere. |
| Success Criteria – kan kriteriene faktisk sjekkes eller testes? | Juster | Produktkriteriene er gode og testbare. «Deployed by day 70» bør suppleres med «kan kjøres lokalt etter README», og de kvalitative kriteriene kan gjøres litt mer konkrete, for eksempel med en enkel brukertest. |
| Scope – er det klart hva som er med i første versjon, og hva som ikke er det? | Juster | Svært tydelig inndeling, men Core er for stor. Flytt flere punkter til Target nå. |
| Vision – henger visjonen sammen med resten uten å blåse opp omfanget? | OK | Visjonen er ambisiøs, men tydelig adskilt fra Core. |

## 2. Utgangspunkt for del 1 av mappen

Punktene følger kriteriene i sensorveiledningen for del 1. Vektene i parentes viser hvor mye hvert kriterium teller i del 1.

| Kriterium i del 1 | Hva briefen bør legge til rette for | Status | Kommentar |
|---|---|---|---|
| **1. Prosess og KI-styring** (30 %) | Brief som er presis nok til at PRD og stories kan bygges direkte på den, slik at krav kan spores fra brief til kode. | OK | Briefen er brukt videre i PRD, UX og arkitektur, og historikken viser flere versjoner. Gode prosesspor. |
| **2. Funksjonalitet og omfang** (20 %) | Realistisk omfang for gruppen og semesteret: en tydelig kjerneflyt som kan bli ferdig og stabil, og nok innhold til å vise reell funksjonalitet. | Juster | Mye reell funksjonalitet, men Core er for stor. En mindre Core som er stabil, gir bedre grunnlag. |
| **3. Kvalitetssikring og testing** (15 %) | Suksesskriterier og funksjoner som er konkrete nok til å bli testtilfeller. | OK | RBAC- og gjestekriteriene er gode testtilfeller. Legg til en tilgangsmatrise som fasit. |
| **4. Design og brukeropplevelse** (10 %) | Tydelige brukere og brukssituasjoner som designet kan bygges rundt, gjerne med de viktigste skjermbildene eller flytene skissert. | OK | Tre tydelige personaer og et konkret scenario. Gjestesiden må fungere godt på mobil. |
| **5. Kodekvalitet og arkitektur** (10 %) | Teknologivalg som er begrunnet og ikke mer komplekse enn appen trenger. | Juster | Briefen holder teknologien utenfor, det er riktig. Arkitekturen med transaksjonell outbox og mye logikk i SQL-funksjoner er avansert for én person. Vurder om alt trengs i Core. |
| **6. README og kjørbarhet** (10 %) | Løsning som andre kan kjøre lokalt uten betalte kontoer, og uten tilgang til gruppens egne tjenester og nøkler. | Juster | Planlegg lokal kjøring med seed-data, testbrukere og mock-modus for KI. |
| **7. Ryddighet i repoet** (5 %) | En plan for hvor hemmeligheter, testdata og dokumentasjon skal ligge. | Juster | Planlegg `.env.example`, seed-data for flaggskipscenarioet og at Supabase-nøkler aldri committes. |

## 3. Neste steg for gruppen

1. Reduser Core ved å flytte teammatrisen, meldinger, «run of show» og KI-forslag til Target, og oppdater brief og PRD tilsvarende.
2. Lag en tilgangsmatrise for arrangør, rolleinnehaver og gjest, og bruk den som fasit for de første testene.
3. Beskriv i README-planen hvordan appen kjøres lokalt med seed-data og testbrukere, og hvordan KI-delen fungerer uten nøkkel.

Oppdater product brief i repoet når dere har gjort endringene, slik at historikken viser hvordan planen utviklet seg. Det er en del av prosessen sensor ser etter.
