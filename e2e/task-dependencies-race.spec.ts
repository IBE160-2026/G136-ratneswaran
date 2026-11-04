import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { psql, seed, unique } from "./support";

const run = promisify(execFile);
const container = execFileSync(
  "docker",
  ["ps", "--filter", "name=supabase_db_", "--format", "{{.Names}}"],
  {
    encoding: "utf8",
  },
)
  .trim()
  .split("\n")[0];
const args = (sql: string) => ["exec", container, "psql", "-U", "postgres", "-At", "-c", sql];
const session = (sql: string) =>
  run("docker", args(sql)).then(
    () => "ok",
    (error: { stderr: string }) => error.stderr,
  );
const advisoryLocks = () =>
  execFileSync("docker", args("select count(*) from pg_locks where locktype = 'advisory'"), {
    encoding: "utf8",
  }).trim();

// Two connections add opposite edges at once; the Event's advisory lock lets exactly one commit (AD-19).
test("two opposite dependencies added at once: exactly one succeeds", async () => {
  expect(container).toBeTruthy();
  const email = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${email}')`);
  const eventId = seed(email, "30 days");
  const uid = psql(`select id from auth.users where email = '${email}'`).trim();
  psql(`update public.roles set active = true where event_id = '${eventId}' and key = 'venue'`);
  const [a, b] = psql(`insert into public.tasks (event_id, role_id, title, deadline)
    select '${eventId}', r.id, t, current_date + 10 from public.roles r, unnest(array['A', 'B']) t
    where r.event_id = '${eventId}' and r.key = 'venue' order by t returning id`)
    .trim()
    .split("\n");
  const as = `begin; set local role authenticated; set local request.jwt.claims = '{"sub": "${uid}", "role": "authenticated"}';`;

  // The first inserts, then stays open holding the Event's lock.
  const first = session(
    `${as} select public.tasks_add_dependency('${a}', '${b}'); select pg_sleep(3); commit;`,
  );
  // Start the second only once the first holds the lock, so it must wait and then see the first edge.
  await expect.poll(advisoryLocks, { timeout: 10_000 }).not.toBe("0");
  const second = session(`${as} select public.tasks_add_dependency('${b}', '${a}'); commit;`);

  const results = await Promise.all([first, second]);
  expect(results[0]).toBe("ok");
  expect(results[1]).toContain("dependency_cycle");
  expect(
    psql(`select count(*) from public.task_dependencies where task_id in ('${a}', '${b}')`).trim(),
  ).toBe("1");
});
