# Gruppe G136 - Arrangly

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Arrangly er en webapp for å planlegge arrangementer som bryllup og fester. Arrangøren får oppgaver sortert etter roller, en tidslinje og oversikt over gjester med påmelding (RSVP). Hjelperne blir invitert inn med sine egne roller og oppgaver.

Repoet inneholder gruppens applikasjon og dokumentasjon av utvikling, testing og kvalitetssikring med KI. Prosjektet følger BMad-metoden. Planleggingsdokumentene ligger i `_bmad-output/`, og en oversikt over teamet ligger i [docs/team.md](docs/team.md).

## Medlemmer

- Aumgaran Opedal Ratneswaran

## Kjøre appen lokalt

Forutsetninger: Node 24 eller nyere, pnpm 12 (`brew install pnpm`), Corepack (`brew install corepack && corepack enable npm yarn pnpm`, slik at npm og yarn avvises), Docker Desktop kjørende og Supabase CLI 2.x (`brew install supabase/tap/supabase`).

```bash
git clone https://github.com/IBE160-2026/G136-ratneswaran.git && cd G136-ratneswaran
pnpm install
cp .env.example .env.local
supabase start
supabase status -o env | grep '^SECRET_KEY='   # lim inn verdien etter SUPABASE_SECRET_KEY= i .env.local
pnpm dev
```

Siden ligger på http://localhost:3000. `.env.example` har lokale standardverdier og ingen hemmeligheter; hemmelig nøkkel hentes fra din egen lokale Supabase i steget over; KI kjører på fixtures og e-post fanges av Supabase sin lokale mailfanger, så ingen personlig nøkkel trengs.

Sjekker og tester (alle mot lokal Supabase, aldri skyprosjektet):

```bash
pnpm lint && pnpm format:check   # ESLint og Prettier
supabase test db                 # pgTAP
pnpm test                        # Vitest
pnpm exec playwright install chromium && pnpm test:e2e   # Playwright
.githooks/test.sh                # git-hookene
```
