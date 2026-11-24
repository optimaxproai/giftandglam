import { getCampaign } from "./campaign";
import type { ChildRow, SponsorRow } from "./types";

/**
 * Every child with family and sponsor joined. SERVER ONLY and private: public pages must pass rows
 * through toPublic() before anything reaches the browser. A drive is tens to low hundreds of children,
 * so one query per request is simpler and safer than many narrow ones.
 */
export async function allChildren(): Promise<ChildRow[]> {
  return (await getCampaign()).store.list();
}

export async function sponsorByToken(token: string): Promise<SponsorRow | null> {
  if (!/^[a-z0-9]{8,80}$/.test(token)) return null;
  return (await getCampaign()).store.sponsorByToken(token);
}
