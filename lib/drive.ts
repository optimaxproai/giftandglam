/** The drive's real dates (from the event flyers). Edit here once per year. */
export const DRIVE = {
  name: "Christmas Gift Drive 2026",
  tagline: "Help us bless a child this Christmas",
  returnBy: new Date(2026, 11, 10, 23, 59),
  returnByLabel: "Dec 10",
  giveawayLabel: "Dec 12",
  goal: 60,
};

export function daysUntil(d: Date, now = new Date()): number {
  return Math.ceil((d.getTime() - now.getTime()) / 864e5);
}
