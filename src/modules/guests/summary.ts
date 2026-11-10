/** One guest as the summary needs it: `attending` is null until the guest has answered. */
export type RsvpAnswer = { attending: boolean | null; plusOne: boolean };

/** The RSVP summary of the Guests tab's tiles and the Dashboard's On track (Story 7.7). */
export function summarizeRsvps(guests: RsvpAnswer[]) {
  const coming = guests.filter((guest) => guest.attending === true);
  const notComing = guests.filter((guest) => guest.attending === false).length;
  return {
    invited: guests.length,
    coming: coming.length,
    notComing,
    notAnswered: guests.length - coming.length - notComing,
    // Only a guest who comes brings a plus-one.
    headcount: coming.length + coming.filter((guest) => guest.plusOne).length,
  };
}
