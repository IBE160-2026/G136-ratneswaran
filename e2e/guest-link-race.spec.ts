import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { psql, seed, unique } from "./support";

const run = promisify(execFile);
const session = (sql: string) =>
  run("docker", ["exec", "supabase_db_Arrangly", "psql", "-U", "postgres", "-At", "-c", sql]).then(
    ({ stdout }) => stdout.trim(),
  );

// Two Copy link clicks at once: the guest row lock serialises them, so both get one user's one token.
test("two copies of one guest's link at once give one active token and the same link", async () => {
  const organizer = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}')`);
  const eventId = seed(organizer, "30 days");
  const uid = psql(`select id from auth.users where email = '${organizer}'`).trim();
  const guestEmail = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${guestEmail}')`);
  const guestId = psql(`with g as (insert into public.guests (event_id, name)
      values ('${eventId}', 'Race Guest') returning id)
    insert into public.guest_contacts (guest_id, event_id, email)
    select id, '${eventId}', '${guestEmail}' from g returning guest_id`).split("\n")[0];

  const copy = (pause: number) =>
    session(`begin; set local role authenticated;
      set local request.jwt.claims = '{"sub": "${uid}", "role": "authenticated"}';
      select public.guests_copy_link('${guestId}'); select pg_sleep(${pause}); commit;`);
  const [first, second] = await Promise.all([copy(1), copy(0)]);

  const token = (output: string) => output.split("\n").find((line) => /^[\w-]{43}$/.test(line));
  expect(token(first)).toBeTruthy();
  expect(token(second)).toBe(token(first));
  expect(
    psql(`select count(*) from public.invite_tokens
      where event_id = '${eventId}' and kind = 'guest' and revoked_at is null`).trim(),
  ).toBe("1");
});
