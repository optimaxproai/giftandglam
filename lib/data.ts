import { db } from "./supabase/admin";
import { demoChildren, demoMode } from "./demo";
import type { ChildRow, SponsorRow } from "./types";

/**
 * Every child with family and sponsor joined. SERVER ONLY and private: public pages must pass rows
 * through toPublic() before anything reaches the browser. A drive is tens to low hundreds of children,
 * so one query per request is simpler and safer than many narrow ones.
 */
export async function allChildren(): Promise<ChildRow[]> {
  if (demoMode()) return demoChildren();
  const { data, error } = await db().from("children").select("*, family:families(*), sponsor:sponsors(*)").order("no");
  if (error) throw new Error(error.message);
  return (data as unknown as ChildRow[]) || [];
}

export async function sponsorByToken(token: string): Promise<SponsorRow | null> {
  if (!/^[a-z0-9]{8,80}$/.test(token)) return null;
  if (demoMode()) return demoChildren().find((c) => c.sponsor?.token === token)?.sponsor ?? null;
  const { data } = await db().from("sponsors").select("*").eq("token", token).maybeSingle();
  return (data as SponsorRow | null) ?? null;
}
