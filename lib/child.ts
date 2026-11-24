import type { ChildRow, PublicChild } from "./types";
import { readGiftCards } from "./giftCards";

/** Children on the public tree: published (`approved`) AND decided "approved" AND holding an angel code. */
export const onTree = (c: ChildRow) => c.approved && c.decision === "approved" && !!c.angel_code;

/**
 * The ONLY place a ChildRow becomes something a sponsor can see.
 * The angel code stands in for every name. No photo, no parent or contact details, no hardship story,
 * no organizer notes, no sponsor identity. Siblings appear only as codes.
 */
export function toPublic(c: ChildRow, all: ChildRow[]): PublicChild {
  const code = c.angel_code || "";
  const gifts = readGiftCards(c);
  const siblings = all
    .filter((s) => s.family_id === c.family_id && s.id !== c.id && onTree(s))
    .map((s) => ({ id: s.id, firstName: s.angel_code || "", age: s.age, available: s.status === "available" }));
  return {
    id: c.id,
    no: c.no,
    code,
    firstName: code, // components that print firstName show the code: names never reach the public
    age: c.age,
    gender: c.gender,
    tops: c.tops,
    bottoms: c.bottoms,
    shoes: c.shoes,
    wants: c.wants,
    needs: c.needs,
    faves: c.faves,
    favColor: c.fav_color,
    gift: gifts[0] ?? null,
    gifts,
    available: c.status === "available",
    status: c.status,
    hasPhoto: false, // photos stay with organizers
    siblings,
  };
}

export function publicTree(all: ChildRow[]): PublicChild[] {
  return all.filter(onTree).map((c) => toPublic(c, all));
}

export function pad(no: number): string {
  return String(no).padStart(2, "0");
}

export function lines(t: string): string[] {
  return t
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function money(n: number): string {
  return "$" + n.toLocaleString();
}
