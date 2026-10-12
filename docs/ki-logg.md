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
