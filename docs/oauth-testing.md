# Testing OAuth sign-in

Automated tests never call a real provider (NFR9). Local Supabase Auth is pointed at a small mock GitHub server, and Epic 7's guest-upgrade test reuses the same method.

## How it works

- `supabase/config.toml` enables `[auth.external.github]` with mock `client_id` and `secret` and `url = "http://host.docker.internal:54399"`. Auth then uses GitHub Enterprise-style endpoints under that URL: `/login/oauth/authorize`, `/login/oauth/access_token`, `/api/v3/user` and `/api/v3/user/emails`.
- `e2e/mock-github.ts` (plain `node`, started by Playwright's second `webServer`) serves exactly those four. It keeps no state: the authorize step reads the `mock_identity` cookie and turns it into the `code`, which doubles as the access token.
- The cookie is JSON, `{ "email": "...", "verified": true }` or `{ "deny": true }`, URL-encoded and set on `host.docker.internal`. Each Playwright context has its own cookie jar, so tests run in parallel. See `asGithubUser` in `e2e/oauth.spec.ts`.
- Auth runs in Docker and reaches the mock as `host.docker.internal`; Chromium resolves that name to `127.0.0.1` through `--host-resolver-rules` in `playwright.config.ts`.
- The mock's `/api/v3/user` deliberately omits `email`; Auth would otherwise trust it as verified. Only `/user/emails` carries `verified`.
- After changing `config.toml`, run `supabase stop && supabase start`.

## Reuse in Epic 7

Set the cookie, click *Continue with GitHub*, and the same code path signs in or links by verified email. To test a guest upgrade, start from the guest session and use an identity with the guest's email.

## Google

Google validates an ID token against Google and cannot be faked this way. It shares `signInWithOAuth` and `/auth/callback`, so GitHub proves the code path. The local `[auth.external.google]` block holds placeholders with `skip_nonce_check = true`. Check Google manually with real credentials in the cloud project (owner task: enter the credentials and the production `/auth/callback` URL in the Supabase dashboard).
