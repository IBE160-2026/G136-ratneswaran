# Product Brief: {Arrangly}

## Executive Summary

{Arrangly} er et KI-basert vertikalt ERP-system for arrangementer, med særlig fokus på prosjektstyring, operativ ledelse og håndtering av mennesker, roller og ansvar. Plattformen skal samle de viktigste delene av et arrangement i én felles arbeidsflate: roller, ansvar, oppgaver, tidslinjer, gjester, kommunikasjon og selve gjennomføringen. Målet er å redusere behovet for å kombinere regneark, gruppechatter, e-post, notater, RSVP-løsninger og separate prosjektstyringsverktøy.

Mens mange eksisterende eventplattformer primært fokuserer på invitasjoner, billetter og RSVP, skal {Arrangly} først og fremst støtte menneskene som faktisk får arrangementet til å skje. En arrangementsansvarlig skal kunne organisere teamet, fordele roller og oppgaver, følge progresjonen og se hvor det kreves oppfølging. Samtidig får gjestene en egen, enklere side av plattformen hvor de kan administrere deltakelse, følge, allergier, praktisk informasjon og eventuelle gaveønsker.

Kunstig intelligens skal være en aktiv planleggingsassistent og beslutningsstøtte gjennom hele prosessen. {Arrangly} skal kunne foreslå roller, oppgaver, leverandører, tidslinjer og kjøreplan basert på hva slags arrangement som skal gjennomføres. Under selve arrangementet skal systemet kunne hjelpe arrangøren med å forstå konsekvensene av forsinkelser eller endringer og foreslå hvordan planen kan justeres.

## The Problem

Planlegging av arrangementer foregår ofte fragmentert. Invitasjoner sendes gjennom én løsning, gjestelisten ligger i et regneark, oppgaver fordeles i en gruppechat, budsjettet ligger et annet sted og kjøreplanen eksisterer kanskje bare som et dokument eller i hodet til arrangementsansvarlig.

Dette fungerer så lenge arrangementet er enkelt. Når flere mennesker får ansvar for ulike deler av arrangementet, oppstår imidlertid et koordineringsproblem.

Ved et julebord kan én person være ansvarlig for maten, en annen for underholdning, en tredje for lokale og en fjerde for økonomi. Arrangementsansvarlig må kontinuerlig spørre:

- Er menyen bestemt?
- Er maten kjøpt inn?
- Er DJ bestilt?
- Er lokalet bekreftet?
- Hvem følger opp allergiene?
- Er teknisk utstyr avklart?
- Er quiz klar?
- Hvem skal rigge før gjestene kommer?

Statusen finnes ofte bare hos den enkelte ansvarlige. Arrangementsansvarlig må derfor aktivt etterspørre informasjon gjennom meldinger, møter eller samtaler.

Problemet blir enda større under selve arrangementet. Hvis middagen varer 25 minutter lenger enn planlagt, kan taler, quiz, teknisk omrigg og DJ-start bli påvirket. Informasjonen må raskt videreformidles til de riktige personene, samtidig som arrangøren må vurdere hva som skal flyttes, forkortes eller beholdes.

For gjestene er opplevelsen tilsvarende fragmentert. Invitasjonen kan komme på sosiale medier eller e-post, allergier samles inn gjennom meldinger, ønskelisten ligger på en annen tjeneste og praktisk informasjon må finnes igjen i en lang gruppechat.

Resultatet er unødvendig administrasjon, dårlig situasjonsforståelse og høy avhengighet av enkeltpersoner.

## The Solution

{Arrangly} skal gjøre et arrangement om til et strukturert prosjekt med mennesker, roller, ansvar, oppgaver og tidslinjer. Arrangementet er navet som kobler sammen gjester, team, oppgaver, leverandører, program, budsjett og kommunikasjon.

Når et arrangement opprettes, etableres en organisasjon rundt det. Arrangementsansvarlig tildeler roller som for eksempel matansvarlig, økonomiansvarlig, toastmaster, teknisk ansvarlig eller sikkerhetsansvarlig til de aktuelle personene. Det er dermed arrangementsansvarlig som bestemmer hvem som skal ha hvilken rolle; brukerne velger ikke roller selv.

{Arrangly} skal bruke rollebasert tilgangsstyring (**Role-Based Access Control**, RBAC). Hver rolle skal være knyttet til bestemte ansvarsområder, oppgaver og tilganger. En brukers rolle avgjør dermed hvilken informasjon personen kan se, hvilke funksjoner personen kan bruke, og hvilke data personen kan opprette eller endre. Arrangementsansvarlig har overordnet kontroll over rolletildelingene og kan endre eller trekke tilbake roller ved behov.

En matansvarlig kan eksempelvis få ansvar for:

- Bestemme meny
- Kartlegge allergier
- Beregne mengde
- Gjennomføre innkjøp
- Forberede maten
- Koordinere servering

Arrangementsansvarlig trenger dermed ikke kontakte matansvarlig for å få status, men kan se progresjonen direkte i {Arrangly}.

Plattformen skal ha to tydelige brukeropplevelser:

- **Arrangørsiden** brukes til planlegging, koordinering og gjennomføring.
- **Gjestsiden** brukes til deltakelse og informasjon.

En gjest skal blant annet kunne:

- Takke ja eller nei til invitasjonen
- Administrere følge
- Registrere allergier eller matpreferanser
- Se program og praktisk informasjon
- Motta kunngjøringer
- Bruke gaveregister dersom arrangementet støtter dette

Roller kan også tildeles personer som samtidig er gjester. Et bursdagsbarn kan eksempelvis få tilgang til gjestelisten uten nødvendigvis å få tilgang til planleggingen av en overraskelse.

{Arrangly} skal i tillegg inneholde kommunikasjon knyttet direkte til organiseringen av arrangementet. Arrangementsansvarlig skal kunne kommunisere med enkeltpersoner, roller eller grupper, eksempelvis alle personer som inngår i sikkerhetsteamet.

## What Makes This Different

{Arrangly} skal ikke primært være en RSVP-plattform eller en generell prosjektstyringsapplikasjon. Systemet er vertikalt fordi funksjonene er utviklet rundt arrangementet som operativ enhet, og fordi informasjon kan brukes på tvers av planlegging, mennesker og gjennomføring.

Kjernen er sammenhengen mellom **arrangement, mennesker, roller, oppgaver, gjester, tidslinje og gjennomføring**.

Den rollebaserte tilgangsstyringen skiller også {Arrangly} fra en ordinær oppgaveliste. Roller beskriver ikke bare ansvar, men fungerer som systemets tilgangsmodell. Den samme personen kan ha ulike roller i forskjellige arrangementer og får bare innsyn og handlingsmuligheter som er relevante for rollen vedkommende er tildelt i det aktuelle arrangementet.

Hvis DJ legges til i arrangementet, skal dette kunne påvirke flere deler av planen samtidig. {Arrangly} kan foreslå:

- Finne og velge leverandør
- Innhente tilbud
- Signere avtale
- Avklare musikkønsker
- Kontrollere behov for lyd- og lysutstyr
- Planlegge rigging
- Legge inn soundcheck
- Plassere DJ-en i arrangementets kjøreplan

På samme måte kan en endring i antall gjester påvirke mat, bordoppsett, bemanning og budsjett.

Kunstig intelligens skal brukes til å forstå disse sammenhengene og gi beslutningsstøtte, ikke bare generere tekst.

{Arrangly} skal kunne oppdage potensielle hull i arrangementet, for eksempel:

- Ingen tid satt av til bordsetting mellom velkomstdrink og middag
- DJ krever soundcheck, men dette finnes ikke i planen
- Quiz krever projektor, men ingen har ansvar for teknisk utstyr
- Lokalet må tømmes kl. 01:00, men programmet avsluttes kl. 01:00 uten tid til nedrigg

Arrangøren beholder kontrollen og kan godta, endre eller avvise forslagene.

{Arrangly} skal også skille mellom to tidsdimensjoner:

- **Plan Timeline** beskriver alt som må skje frem mot arrangementet.
- **Run of Show** beskriver hva som skjer under selve arrangementet.

De to skal være koblet sammen.

## Who This Serves

### Primærbruker: Arrangementsansvarlig

En person som har ansvar for å planlegge og gjennomføre et arrangement sammen med andre.

Dette kan være en privatperson som arrangerer bryllup eller bursdag, en student som organiserer julebord, en forening som arrangerer en sammenkomst eller en organisasjon som gjennomfører et større arrangement.

Brukeren trenger oversikt over:

- Hva som må gjøres
- Hvem som har ansvaret
- Hva som er ferdig
- Hva som er forsinket
- Hva som krever oppfølging
- Hvordan endringer påvirker resten av arrangementet

Suksess for denne brukeren betyr at vedkommende kan forstå statusen på arrangementet uten å måtte kontakte alle involverte individuelt.

### Sekundærbruker: Rolleinnehaver

En person som har ansvar for en del av arrangementet, for eksempel mat, teknikk eller underholdning.

Brukeren skal enkelt kunne se egne oppgaver, frister og relevant informasjon uten å bli eksponert for hele prosjektets kompleksitet.

### Sekundærbruker: Gjest

En person som er invitert til arrangementet.

Gjesten ønsker en enkel opplevelse hvor det er lett å administrere deltakelse og finne informasjon uten å forholde seg til arrangørens interne prosjektstyring.

## Success Criteria

Første versjon av {Arrangly} regnes som vellykket dersom brukere kan gjennomføre en komplett, grunnleggende arrangementsprosess i systemet.

Dette innebærer at:

- En arrangør kan opprette et arrangement.
- Arrangementsansvarlig kan tildele, endre og trekke tilbake roller for personer i arrangementet.
- Brukere kan ikke tildele seg selv roller eller utvide sine egne tilganger.
- Oppgaver kan knyttes til roller eller personer.
- Oppgavenes status kan oppdateres og følges av arrangementsansvarlig.
- En gjest kan inviteres og registrere sin deltakelse.
- Gjesten kan registrere relevant informasjon som allergier.
- Arrangøren kan se aggregert gjesteinformasjon relevant for planleggingen.
- Arrangementet kan ha en tidslinje for planleggingsfasen.
- Arrangementet kan ha en kjøreplan for arrangementsdagen.
- KI kan generere eller foreslå relevante roller, oppgaver og tidslinjer basert på informasjon om arrangementet.
- Brukere med ulike roller får forskjellige visninger og rettigheter gjennom rollebasert tilgangsstyring (RBAC).
- Tilgangskontrollen hindrer brukere i å se eller endre informasjon de ikke har rettigheter til.

Et sentralt kvalitativt suksessmål er at arrangementsansvarlig opplever å ha bedre situasjonsforståelse enn ved bruk av separate regneark, meldinger og notater.

## Scope

### In scope for første versjon

Første versjon skal fokusere på den grunnleggende sammenhengen mellom arrangement, arrangørteam og gjester.

Den skal omfatte:

- Opprettelse og administrasjon av arrangement
- Brukere og deltakere
- Roller og rollebasert tilgangsstyring (RBAC)
- Tildeling, endring og tilbaketrekking av roller utført av arrangementsansvarlig
- Rollebaserte rettigheter til å se, opprette og endre relevant informasjon
- Oppgaver og deloppgaver
- Ansvarlig person eller rolle
- Frister og status
- Dashboard for arrangementsansvarlig
- Invitasjon og RSVP
- Allergier og matpreferanser
- Grunnleggende program/kjøreplan
- Planleggingstidslinje
- KI-assisterte forslag til roller, oppgaver og tidslinje
- Enkel kommunikasjon eller meldingsfunksjon mellom arrangementsledelsen og relevante grupper

### Explicitly out of scope for første versjon

Følgende er interessante videreutviklinger, men skal ikke være nødvendige for at første versjon skal regnes som komplett:

- Full markedsplass og bestilling av leverandører
- Betalingsløsninger
- Billettsalg
- Avansert økonomi- og regnskapsfunksjonalitet
- Automatisk ansiktsidentifikasjon av personer
- Komplett bildegalleri
- Avansert gaveregister og spleis
- Sanntids KI-optimalisering av kjøreplan
- Integrasjon mot eksterne kalender-, meldings- eller betalingstjenester
- Profesjonelle funksjoner for svært store festivaler eller konferanser

Disse kan demonstreres som fremtidige konsepter dersom grunnplattformen fungerer.

## Vision

På lengre sikt skal {Arrangly} utvikle seg fra et planleggingsverktøy til et intelligent, vertikalt ERP-system og operativsystem for arrangementer.

Brukeren skal kunne starte med en enkel beskrivelse:

> «Vi skal arrangere 40-årsdag for 80 personer i oktober. Vi har leid lokale, ønsker middag, taler, quiz og DJ.»

{Arrangly} skal deretter kunne hjelpe med å etablere et første utkast til organisasjon, foreslå roller og ansvar, lage arbeidsplan, identifisere nødvendige leverandører og produsere et forslag til kjøreplan.

Etter hvert som planleggingen utvikler seg, skal {Arrangly} forstå konsekvensene av endringer.

Hvis antall gjester øker, kan systemet varsle om mulige konsekvenser for mat, bemanning, lokale og budsjett. Hvis en kritisk oppgave er forsinket, kan systemet identifisere hvilke andre aktiviteter som påvirkes.

Under selve arrangementet kan {Arrangly} utvikles til en operativ støtteplattform hvor arrangøren ser hva som skjer nå, hva som kommer neste og hvilke avvik som krever oppmerksomhet.

Ved en forsinkelse kan systemet eksempelvis foreslå alternative endringer i kjøreplanen og, etter godkjenning fra arrangementsansvarlig, distribuere oppdateringen til de aktuelle rolleinnehaverne.

Den langsiktige ambisjonen er at {Arrangly} ikke bare lagrer informasjon om arrangementet, men forstår hvordan arrangementets ulike deler henger sammen.

**Fra første idé til siste gjest har gått hjem.**
