-- Story 7.7: a joined holder of the Event's active Guests Role reads guests and RSVPs (PRD §4.9, AD-3).
-- guest_contacts stays Organizer-only, and so does every write. Authorisation is holds_role; roles_select
-- is built on functions only, so reading public.roles here does not recurse into these policies.
create policy guests_select_guests_role on public.guests
  for select to authenticated
  using (
    exists (
      select 1 from public.roles r
      where r.event_id = guests.event_id and r.key = 'guests' and r.active and public.holds_role(r.id)
    )
  );

create policy rsvps_select_guests_role on public.rsvps
  for select to authenticated
  using (
    exists (
      select 1 from public.roles r
      where r.event_id = rsvps.event_id and r.key = 'guests' and r.active and public.holds_role(r.id)
    )
  );
