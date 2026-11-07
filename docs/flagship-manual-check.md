# Flagship manual check (SM-3, NFR12)

Timed script for a first-time Role-holder on the flagship Event of `supabase/seed.sql`. Run it against local Supabase (`supabase db reset`, `pnpm dev`) with a person who has never seen Arrangly. Fill in the result fields.

## Setup

1. `supabase db reset` loads the seed. Sign in as the Organizer `demo.organizer@example.com` (password `abcdefg1`).
2. Open Team & Roles and invite the tester's own address to Venue. Use an address that was not used in an earlier run: re-seeding removes only the seeded users. The invite link arrives in Mailpit (http://127.0.0.1:54324).
3. Create a Venue Task and delegate it to the tester, so that they have a Task to find. Open the invite link in a private window only after this.

## Steps (start the timer at step 1)

1. Open the invite link and join with the tester's account.
2. Land on the Dashboard of "Demo 40th Birthday".
3. Find their own Task and say what it asks of them.
4. Accept the Task.

Stop the timer when the Task is accepted.

## Targets and results

| Measure                                 | Target                     | Result | Pass |
| --------------------------------------- | -------------------------- | ------ | ---- |
| SM-3: invite link to own Task found     | about 1 minute (SM-3)      |        |      |
| NFR12: first-time holder without help   | about 1 minute (NFR12)     |        |      |
| Questions the tester had to ask         | 0                          |        |      |
| Other Role's Task title seen anywhere   | none                       |        |      |

Notes (where the tester hesitated, what they misread):
