/** The drive's real dates (from the event flyers). Edit here once per year. */
export const INTAKE_SEASON = "2027";

export const DRIVE = {
  name: "Christmas Gift Drive 2026",
  tagline: "Help us bless a child this Christmas",
  returnBy: new Date(2026, 11, 10, 23, 59),
  returnByLabel: "Dec 10",
  giveawayLabel: "Dec 12",
  dropOffPending: "The organizers will email the drop-off location and hours.",
  giftSuggestion: "If you’re able, please choose three gifts. Aim for one need, one wish, and one more item from the list.",
  goal: 60,
};

export function giftDropOff() {
  const location = process.env.ANGEL_DROP_OFF_LOCATION?.trim();
  const address = process.env.ANGEL_DROP_OFF_ADDRESS?.trim();
  const hours = process.env.ANGEL_DROP_OFF_HOURS?.trim();
  const instructions = process.env.ANGEL_DROP_OFF_INSTRUCTIONS?.trim();

  return address && hours
    ? [location, address, hours, instructions].filter(Boolean).join("\n")
    : DRIVE.dropOffPending;
}

export function daysUntil(d: Date, now = new Date()): number {
  return Math.ceil((d.getTime() - now.getTime()) / 864e5);
}
