# Story 5.4: Dashboard housekeeping

## 2026-11-06 kl. 07:25 — aumgaran-student

### Oppgave

Bygge story 5.4 (Core-omfang) via bmad-build-auto: issue, gren, spec, implementering, fire review-lag, verifisering, commits, ki-logg, sesjonslogg og PR-kommentar. Ikke push, PR eller merge.

### Plan

- Issue #104, gren `feat/5.4-dashboard-housekeeping`, sprint-status for 5.3 satt til done.
- Spec: `_bmad-output/implementation-artifacts/spec-5-4-dashboard-housekeeping.md`.
- Funn under planlegging: publiseringsbanner (2.8) og holderens landing (5.2) finnes allerede, så Core-leveransen er bare Playwright-bevis.
- Review: blind, edge-case, verifikasjonsgap og intent-alignment som separate subagenter.

### Resultat

- Commits: `a0f7505` (5.3 done), `7d13d0b` (e2e), `744c9a7` (ki-logg), `09525ac` (spec, triage, sprint-status 5.4 = review).
- `e2e/invite-join.spec.ts`: join → Dashboard → egen forfalte Task først (2 rader) → _My tasks_ i sidemenyen → _Accept task_.
- `e2e/dashboard.spec.ts`: avlyst Event uten Publish, banner eller knapper.
- Ingen produksjonskode, migrasjon eller SQL endret.
- Review: 18 funn, ingen medium eller høyere; 3 lave rettet, 1 utsatt, resten avvist (se triage-loggen i spec-en). PR-kommentar i `out/pr-comment.md`.
- Verifisering: db reset, `supabase test db`, lint, format:check, Vitest (414), tsc og full Playwright (108) grønne. Etter de tre review-rettelsene: første kjøring av de to berørte spec-ene hadde 4 invite-join-feil (ikke undersøkt), andre kjøring 12/12. En tsc rett etter e2e viste utdaterte `.next/dev/types`-feil og var grønn ved ny kjøring.

### Åpne punkter

- Rolle-fjernet `role="alert"`-toast og omdirigering (siste akseptkriterium) er ikke bygget: Story 3.9 flyttet dem til Story 3.10. Kriteriet «still apply» stemmer ikke med koden; eier må avgjøre.
- _Show dismissed (n)_ og _Restore_ venter på Story 4.14-funksjonene (Target).
- «Your invitation»-kortet er Epic 7; ingenting er reservert i koden.
- Første omkjøring av invite-join/dashboard-spec-ene feilet på 4 tester; mulig flake.
- Push, PR (`Closes #104`) og triage-kommentar fra `out/pr-comment.md` gjenstår.
