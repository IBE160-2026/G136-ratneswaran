# Story 4.7: Role lead og revoke-hooks

## 2026-11-05 kl. 20:41 — aumgaran-student

### Oppgave

`/bmad-build på story 4.7`: la `events_set_role_lead` flytte Rolle-eide Tasks til ny lead, og la `events_revoke_role` frigjøre Tasks en revokert holder eier, slik at ingen beholder tilgang via `owner_user_id` (S2).

### Plan

- Spec: [spec-4-7-role-lead-and-revoke-hooks.md](../../_bmad-output/implementation-artifacts/spec-4-7-role-lead-and-revoke-hooks.md), godkjent uten åpne spørsmål (tre egne valg: pending lead får Tasks, Organizer hoppes over i Event-bred frigjøring, `subject_ref` er Rolle-id).
- Subagent implementerte, tre uavhengige reviewere, fire patcher sendt tilbake til samme subagent.

### Resultat

- Migrasjon `20261105130000_tasks_role_hooks.sql`: `tasks_assign_role_owned_to_lead` og `tasks_release_owner` (systemfunksjoner, stengt for `authenticated`), og erstattede `events_set_role_lead` og `events_revoke_role`. Kroppene er diffet mot 3.8 og 3.9: bare notatlinjene er byttet mot hook-kall.
- pgTAP `tasks_role_hooks.test.sql` (50 assertions), `database.ts` regenerert, ki-logg-oppføring.
- Verifisert etter `supabase db reset`: `supabase test db` (25 filer, 944 tester), lint, format, Vitest. Playwright ikke kjørt (ingen UI-endring).
- Tre commits `861a45b`, `b0082f4`, `86dab70` på `feat/4.7-role-lead-and-revoke-hooks`, ikke pushet. Sprint-status er `review`.
- Lukker punktet fra 4.6 om at en tilbakekalt eier kunne godta.

### Åpne punkter

- Push feat/4.7, åpne PR med `Closes #94` og post review-triage som PR-kommentar.
- `notifications_emit` er fortsatt en stub; testen beviser én `task_assigned` ved å bytte inn en opptaker i transaksjonen. Story 3.1 må beholde kallformen `(event_id, 'task_assigned', role_id, [lead])`.
