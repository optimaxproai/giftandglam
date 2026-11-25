import { normEmail } from "./families";
import type { DonationOffer } from "./donations";

/** An email-only adoption saves this placeholder name. */
export const isAnonymousName = (name: string | null | undefined) => !name?.trim() || /^anonymous( sponsor)?$/i.test(name.trim());

/** email (normalised) -> the name the person gave on a donation or volunteer form. Newest offer wins. */
export function donorNames(offers: Pick<DonationOffer, "name" | "email" | "created_at">[]): Map<string, string> {
  const out = new Map<string, string>();
  const sorted = [...offers].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  for (const o of sorted) {
    const name = o.name?.trim();
    const email = normEmail(o.email || "");
    if (name && email && !isAnonymousName(name)) out.set(email, name);
  }
  return out;
}

/** The sponsor's saved name, unless it is the anonymous placeholder and they gave a name on a donation. */
export function displaySponsorName(sponsor: { name: string; email: string }, donors: Map<string, string>): { name: string; fromDonation: boolean } {
  if (!isAnonymousName(sponsor.name)) return { name: sponsor.name, fromDonation: false };
  const donor = donors.get(normEmail(sponsor.email));
  return donor ? { name: donor, fromDonation: true } : { name: sponsor.name || "Anonymous sponsor", fromDonation: false };
}
