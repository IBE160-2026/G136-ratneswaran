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
# Skriver den lokale hemmelige nøkkelen inn i .env.local
key=$(supabase status -o env | grep '^SECRET_KEY=' | cut -d= -f2 | tr -d '"') && sed -i '' "s|^SUPABASE_SECRET_KEY=.*|SUPABASE_SECRET_KEY=$key|" .env.local
pnpm dev
```

Siden ligger på http://localhost:3000. `.env.example` har lokale standardverdier og ingen hemmeligheter; hemmelig nøkkel hentes fra din egen lokale Supabase i steget over; KI kjører på fixtures og e-post fanges av Supabase sin lokale mailfanger, så ingen personlig nøkkel trengs. `sed -i ''` er macOS-formen; på Linux bruker du `sed -i`.

Registrer deg med e-post og passord. Bekreftelses-e-posten ligger i Mailpit på http://127.0.0.1:54324.

Kjente begrensninger lokalt:

- **Google og GitHub-innlogging virker ikke lokalt.** Google-oppsettet har plassholdere, og GitHub peker på en falsk server som bare kjører under `pnpm test:e2e` (se [docs/oauth-testing.md](docs/oauth-testing.md)). Bruk e-post og passord.
- **Portene 54321–54327 må være ledige.** Hvis `supabase start` melder `port is already allocated`, kjører en annen lokal Supabase. Stopp alle med `supabase stop --all`.
- **Alle utsjekker av repoet deler én lokal database**, fordi `project_id` i `supabase/config.toml` er den samme. `supabase db reset` tømmer den for alle.

Sjekker og tester (alle mot lokal Supabase, aldri skyprosjektet):

```bash
pnpm lint && pnpm format:check   # ESLint og Prettier
supabase test db                 # pgTAP
pnpm test                        # Vitest
pnpm exec playwright install chromium && pnpm test:e2e   # Playwright
.githooks/test.sh                # git-hookene
```
