# Story 5.8: Timeline List view

## 2026-11-07 — aumgaran-student

### Oppgave

Bygge Story 5.8 («Timeline: List view») med bmad-build-auto, uten tilsyn, og åpne PR (ikke merge).

### Plan

- Spec `spec-5-8-timeline-list-view.md`; subagent implementerer; fire reviewere, triage, patch.
- Skjermbilder på 375, 320 og 1280px; små commits, ki-logg, PR med `Closes #112`, triage-kommentar fra `out/pr-comment.md`.

### Resultat

- Branch `feat/5.8-timeline-list-view`; liste og veksler (`?view=list|lanes`) på tidslinjesiden, CSS velger liste under 768px, delt `useBarText` gir lik lenketekst.
- Review: 25 funn (0 høye/medium, 10 lave, 15 falske). 3 rettet, 1 utsatt.
- Verifisert: lint, format, tsc, Vitest 446, `.githooks/test.sh` 27, Playwright timeline, shell, dashboard, holder-view; skjermbilder vurdert, ingen horisontal overflow.

### Åpne punkter

- Beslutningspunkter i listen er utestet til Story 4.8 leverer data (og ord mangler i lenkenavnet).
- Full Playwright-suite ikke kjørt.
