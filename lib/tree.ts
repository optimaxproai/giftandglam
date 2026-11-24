import { allChildren } from "./data";
import { onTree, publicTree, toPublic } from "./child";
import { INTAKE_SEASON } from "./drive";
import { ageLowOf } from "./intake/card";
import { getIntake } from "./intake";
import { show2027OnTree } from "./mode";
import type { PublishedCard } from "./intake/types";
import type { PublicChild } from "./types";

/** A 2027 card as sponsors see it: angel code, age range, shopping details. Nothing else exists to leak. */
export function cardToPublic(p: PublishedCard): PublicChild {
  // `gifts` (multi-card gift requests) is read by the tree and angel pages once that change is merged.
  // 2027 cards never carry gift cards, so they always have an empty list. The cast keeps this compiling either way.
  return {
    gifts: [],
    id: p.childId,
    no: Number(p.code.replace(/\D/g, "").slice(2)) || 0,
    firstName: p.code,
    code: p.code,
    ageRange: p.card.ageRange,
    ageLow: ageLowOf(p.card.ageRange),
    age: null,
    gender: null,
    tops: null,
    bottoms: null,
    shoes: null,
    sizes: p.card.sizes || null,
    wants: p.card.wishes,
    needs: p.card.needs,
    faves: p.card.interests,
    favColor: null,
    gift: null,
    available: true,
    status: "available",
    hasPhoto: false,
    siblings: [],
  } as PublicChild;
}

async function cards2027(): Promise<PublicChild[]> {
  if (!show2027OnTree()) return [];
  try {
    return (await (await getIntake()).treeCards(INTAKE_SEASON)).map(cardToPublic);
  } catch {
    return []; // intake tables not migrated yet: the 2026 tree keeps working
  }
}

/** The whole public tree: 2026 email-intake angels, plus 2027 cards once they are switched on. */
export async function getPublicTree(): Promise<PublicChild[]> {
  return [...publicTree(await allChildren()), ...(await cards2027())];
}

export async function getPublicChild(id: string): Promise<PublicChild | null> {
  if (id.startsWith("ch_")) return (await cards2027()).find((c) => c.id === id) ?? null;
  const all = await allChildren();
  const row = all.find((c) => c.id === id && onTree(c));
  return row ? toPublic(row, all) : null;
}
