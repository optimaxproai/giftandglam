import type { ChildRow, PublicChild } from "./types";

/**
 * The ONLY place a ChildRow becomes something a sponsor can see.
 * No full name, no family or parent details, no organizer notes, no sponsor identity.
 * Siblings are limited to first name + age of approved children in the same family.
 */
export function toPublic(c: ChildRow, all: ChildRow[]): PublicChild {
  const siblings = all
    .filter((s) => s.family_id === c.family_id && s.id !== c.id && s.approved)
    .map((s) => ({ id: s.id, firstName: s.first_name, age: s.age, available: s.status === "available" }));
  return {
    id: c.id,
    no: c.no,
    firstName: c.first_name,
    age: c.age,
    gender: c.gender,
    tops: c.tops,
    bottoms: c.bottoms,
    shoes: c.shoes,
    wants: c.wants,
    needs: c.needs,
    faves: c.faves,
    favColor: c.fav_color,
    gift: c.gift_store && c.gift_amount ? { store: c.gift_store, amount: c.gift_amount } : null,
    available: c.status === "available",
    status: c.status,
    hasPhoto: !!c.photo_path && c.photo_public,
    siblings,
  };
}

export function publicTree(all: ChildRow[]): PublicChild[] {
  return all.filter((c) => c.approved).map((c) => toPublic(c, all));
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
