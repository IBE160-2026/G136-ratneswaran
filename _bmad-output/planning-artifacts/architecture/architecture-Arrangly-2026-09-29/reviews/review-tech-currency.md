# Review — Tech Currency Lens

- **Spine:** `ARCHITECTURE-SPINE.md` (updated 2026-10-02)
- **Lens:** Is every committed decision web-researched or reality-checked (versions, existence/fit, starter defaults), not asserted from training data?
- **Reviewed:** 2026-10-02
- **Method:** `npm view` on every Stack row; unpacked `create-next-app@16.3.8` to read its scaffold defaults; Supabase, Vercel, Next.js docs fetched live; web search for Gmail, web-push, nodemailer, and Supabase key deprecation.

## Verdict

The Stack versions are current and match npm exactly. But several platform facts the ADs rely on were not checked, and two of them will break or quietly weaken the design: the service-role key being retired at the end of 2026, and how the database webhook is set up per environment. Neither is fatal, and both can be fixed by small rule edits.

## What checks out (no action)

| Item | Spine says | Verified |
| --- | --- | --- |
| Next.js | 16.3.x | `next@16.3.8` is `latest` (npm, published 2026-10-02) |
| React | 19.x | `react@19.3.0`. create-next-app 16.3.8 scaffolds `react`/`react-dom` `^19`. The Next peer range also allows ^18.2, so 19 is a choice, not a requirement. The wording "as Next.js 16.3 requires" is slightly off but harmless. |
| Tailwind | 4.3.x | `4.3.3`. create-next-app scaffolds `tailwindcss ^4` |
| @supabase/supabase-js / ssr / CLI | 2.117 / 0.12 / 2.119 | 2.117.2 / 0.12.7 (peer `supabase-js ^2.114`) / 2.119.0 |
| next-intl | 4.14.x | 4.14.9. Peer accepts `next ^16` |
| zod, @anthropic-ai/sdk, vitest, playwright | as listed | 4.6.5, 0.131.0, 5.0.3, 1.63.0 |
| nodemailer | 10.0.x | 10.0.13 (2026-09-30). The only declared breaking change is Node ≥ 20. It ships its own types, so do **not** add `@types/nodemailer`. |
| Gmail app passwords | AD-10 | Still supported in 2026 with 2-Step Verification on. "Less secure apps" are gone, but that does not affect this setup. |
| Supabase Auth custom SMTP | AD-10 | Works with any SMTP server. Note: enabling it sets a **30 msgs/hour** Auth rate limit by default (adjustable). |
| Supabase EU regions | AD-11 | eu-central-1 (Frankfurt), eu-north-1 (Stockholm), and others are listed. The docs say nothing about a Free-plan region restriction. |
| Vercel Hobby EU region | AD-11 | Hobby = **one** selectable region (changelog 2022, docs 2026-08). Default is `iad1`, so it must be set explicitly (see F-6). |
| pg_cron on Free | AD-8, AD-11 | Available on all plans (already verified in memlog). |
| pg_net semantics | AD-8 | Requests fire **only after commit**, which suits the outbox. No retries, so the spine's pg_cron retry is the right design. |
| Realtime + RLS | AD-8 | postgres_changes authorises every event per subscriber against RLS. Exception: DELETE events are not RLS-filtered, which does not matter because the spine streams inserts. |
| Free-plan pause | Environments | "Paused after 1 week of inactivity" (pricing page). Matches the spine. |
| Claude model IDs | AD-9 | `claude-sonnet-5` ($2/$10) and `claude-haiku-4-5` ($1/$5) are current (Anthropic skill model table, cached 2026-06-24). |

## Findings

### F-1 — HIGH — AD-5, Conventions "Config and secrets": `service_role` key is being retired by end of 2026

- **What's wrong:** The spine names the "Supabase service-role key" throughout. Supabase is deprecating the legacy `anon` and `service_role` JWT keys **by the end of 2026**. They are being replaced by `sb_publishable_…` and `sb_secret_…`. The course is due 2026-12-20, and the demo has to keep working through grading, which falls right at the cutoff. Supabase's current Next.js SSR guide already uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `ANON_KEY`). An agent working from training data will scaffold the legacy names.
- **Evidence:** https://supabase.com/docs/guides/getting-started/api-keys · https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys · https://supabase.com/docs/guides/auth/server-side/nextjs
- **Fix:** In AD-5 and the Conventions table, say "Supabase **secret key** (`sb_secret_…`, formerly service_role)". Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the client. Secret keys are not JWTs, so pg_net and pg_cron calls to `/api/notifications/deliver` should authenticate with a separate shared-secret header (store it in Supabase Vault), not with the Supabase key.

### F-2 — MEDIUM — AD-8, AD-15, Environments: database webhook URL differs per environment, and the spine doesn't say how to set it

- **What's wrong:** Database Webhooks are usually created in the dashboard. AD-15 forbids dashboard changes, so the webhook has to be a migration (a trigger calling `net.http_post` or `supabase_functions.http_request`). The target URL differs by environment:
  - Locally, the Postgres container must call `http://host.docker.internal:3000/...`, because `localhost` points at the container itself.
  - In the cloud, it must call the Vercel production URL.
  
  A hard-coded URL in a migration breaks one of the two. Because previews share the cloud DB, every preview's notifications are delivered by **production** code. This may be acceptable, but the spine should state it.
- **Evidence:** https://supabase.com/docs/guides/database/webhooks (local dev: "use `host.docker.internal`")
- **Fix:** Add one line to AD-8: "The outbox trigger reads the deliver URL and shared secret from Supabase Vault (`vault.decrypted_secrets`), seeded per environment (local seed vs. cloud). It is never hard-coded in a migration. Previews share production delivery."

### F-3 — MEDIUM — AD-8: pg_net default timeout vs. the deliver route's work

- **What's wrong:** pg_net's default request timeout is **2000 ms** (the webhook UI default is lower). The deliver route sends Gmail SMTP and web push, often after a Vercel cold start, and can take longer than that. pg_net then records a timeout. The route may or may not have finished. The 3-minute retry then resends. If the route marked the row sent late, or crashed after sending, recipients get duplicates, which breaks AD-7's "at most one".
- **Evidence:** https://supabase.com/docs/guides/database/extensions/pg_net (timeout_milliseconds default 2000; no retries; 200 req/s)
- **Fix:** Set `timeout_milliseconds` explicitly (e.g. 5000). Make the deliver route claim the row before sending (`update … set status='sending', claimed_at=now() where id=$1 and status='pending' returning *`). The retry job then picks up only `pending`, or `sending` older than N minutes.

### F-4 — MEDIUM — AD-6: "A verified email is one account across providers" is only partly automatic

- **What's wrong:** Supabase links automatically **only when signing in with OAuth** to an existing user with the same email, **and** only if the provider reports the email as verified. The reverse direction does not link:
  - Email/password **sign-up** with an email that already exists returns an obfuscated user, and no email is sent.
  - Adding a password must be done with `updateUser({ password })` while signed in. Open bug supabase/auth#2472 (Apr 2026): doing this on an OAuth user does not add an `email` identity row or update `providers`.
  - GitHub accounts can have an unverified or private primary email, in which case nothing links.
  - Explicit "Connect Google/GitHub" from settings (`linkIdentity`) needs **manual linking enabled** in project auth config, which is a beta feature.
  
  AD-4's guest "Create account" flow depends on all of this.
- **Evidence:** https://supabase.com/docs/guides/auth/auth-identity-linking · https://github.com/supabase/auth/issues/2472
- **Fix:** Reword AD-6 to: "OAuth sign-in auto-links to an existing user with the same verified email. Adding a password uses `updateUser` while signed in. Adding Google/GitHub from settings uses `linkIdentity` (manual linking enabled in `supabase/config.toml` and the cloud project)." Add a Playwright or pgTAP check for guest → Google upgrade. Do not show providers from `raw_app_meta_data` in the UI (bug #2472).

### F-5 — MEDIUM — Stack / AD-3: Next 16 `proxy.ts` (formerly middleware) is not mentioned

- **What's wrong:** `@supabase/ssr` needs a request-level session refresh. In Next 16 this lives in **`proxy.ts`**, with an exported `proxy` function. `middleware.ts` is deprecated. Supabase's guide warns that the wrong file name means "sessions never refresh and users get signed out". Supabase also now recommends `auth.getClaims()` (not `getSession()`) on the server. Agents trained on older material will write `middleware.ts` and `getSession`. Separately, on Vercel the proxy runs as Routing Middleware **in all regions regardless of the function region**. It reads the auth cookie outside the EU, which slightly weakens AD-11's "Vercel functions run in an EU region".
- **Evidence:** https://supabase.com/docs/guides/auth/server-side/nextjs · https://vercel.com/docs/functions/configuring-functions/region ("Vercel deploys Routing Middleware to all regions by default, regardless of your region settings")
- **Fix:** Add to the source tree: `proxy.ts  # @supabase/ssr session refresh only; no data reads`. Add to Conventions: "Server auth checks use `getClaims()`. Never trust `getSession()` on the server." Add to AD-11: "proxy only refreshes the auth cookie; personal data is read only in EU functions."

### F-6 — LOW — Stack "Hosting" / AD-11: EU region on Vercel Hobby is not the default

- **What's wrong:** Hobby can pick one region, but new projects default to `iad1` (US). The spine asserts "EU function region" without saying how it gets set.
- **Evidence:** https://vercel.com/docs/functions/configuring-functions/region · https://vercel.com/changelog/hobby-customers-can-now-select-their-preferred-region-for-serverless
- **Fix:** Commit `vercel.json` with `"regions": ["arn1"]` (Stockholm) or `["fra1"]`, matching the Supabase region (eu-north-1 ↔ arn1, eu-central-1 ↔ fra1). Pick the pair in the spine.

### F-7 — LOW — Stack "TypeScript": "as scaffolded" is fine, but pin it given TS 7

- **What's wrong:** npm `latest` is `typescript@7.0.2`, the native Go compiler, which has no JS compiler API. create-next-app 16.3.8 scaffolds **`typescript ^5`**, which resolves to 5.9.3, so the spine's rule lands on 5.x by accident, not by decision. Next 16.3 *does* support TS 7 for `next build` through the project-local `tsc` CLI. But tools that use the JS API (typescript-eslint in `eslint-config-next`, editor plugins) do not. An agent that runs `npm i -D typescript@latest` gets 7 and a broken lint step.
- **Evidence:** https://nextjs.org/docs/app/api-reference/config/typescript · `create-next-app@16.3.8` dist (`typescript:"^5"`) · `npm view typescript dist-tags` (latest 7.0.2)
- **Fix:** Change the Stack row to `TypeScript | 5.9.x (create-next-app 16.3 default; TS 7 deferred until lint tooling supports it)`.

### F-8 — LOW — Stack "web-push 3.6.x": stale but acceptable

- **What's wrong:** `web-push@3.6.7` was last published **2024-01-16**, with no release in more than 2.5 years. The repo still sees commits and about 5M weekly downloads. The VAPID/RFC 8291 protocol is stable, so this works. Note it in the spine so it reads as a choice, not an oversight. It has no bundled types; use `@types/web-push`.
- **Evidence:** `npm view web-push time.modified` → 2024-01-16 · https://www.npmjs.com/package/web-push
- **Fix:** Annotate the row: "3.6.7 (last release 2024, protocol-stable; swap candidate if it breaks on Node 24)".

### F-9 — LOW — AD-10: Gmail and Supabase Auth sending caps are not quantified

- **What's wrong:** "Stay under the provider's daily cap" gives no number. A personal Gmail account caps at about 500 recipients per day. Supabase Auth with custom SMTP starts at **30 emails per hour**, which will throttle confirmation and reset mails during a demo or Playwright run against the cloud.
- **Evidence:** https://supabase.com/docs/guides/auth/auth-smtp
- **Fix:** Put the numbers in AD-10, e.g. "batch ≤ 400/day". Raise the Auth rate limit in the cloud project as an env-setup step, and record it in `supabase/config.toml` for local.

### F-10 — LOW — AD-8: Realtime postgres_changes is fine at demo scale; note the alternative

- **What's wrong:** Verified that this works with RLS. At this scale it is fine (Free plan: 200 concurrent connections, 2M messages per month). Supabase now steers new apps toward Broadcast from the database with private channels. The spine is not wrong here. It should just note this as a recorded choice.
- **Evidence:** https://supabase.com/docs/guides/realtime/postgres-changes
- **Fix:** Optional one-liner: "postgres_changes under RLS; switch to private Broadcast if it exceeds the Free-plan limits."

## Sources

- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://supabase.com/docs/guides/database/webhooks
- https://supabase.com/docs/guides/database/extensions/pg_net
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://github.com/supabase/auth/issues/2472
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/platform/regions
- https://supabase.com/pricing
- https://supabase.com/features/supabase-cron
- https://vercel.com/docs/functions/configuring-functions/region
- https://vercel.com/changelog/hobby-customers-can-now-select-their-preferred-region-for-serverless
- https://nextjs.org/docs/app/api-reference/config/typescript
- https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md
- https://www.npmjs.com/package/web-push
- https://smtpedia.com/gmail-email-settings-pop3-imap-smtp/
