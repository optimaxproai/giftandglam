import { firstName, normEmail, normPhone, sameChild } from "../families";
import { CampaignError, type CampaignStore, type NewKid } from "./store";
import { canApprove, ageFlag, entryDecision, householdState, reevaluate, type HouseholdState } from "./rules";
import { customStock, stockById, type LabelStockSetting } from "../print";
import type { ChildRow, Decision, FamilyRow } from "../types";
import { giftCardFields, type GiftCard } from "../giftCards";

export type KidInput = {
  fullName: string;
  age: number | null;
  ageUnsure?: boolean;
  gender: "Girl" | "Boy" | "Other" | null;
  tops?: string;
  bottoms?: string;
  shoes?: string;
  wants: string[];
  needs: string[];
  faves: string[];
  favColor?: string;
  giftStore?: string;
  giftAmount?: number;
  giftCards?: GiftCard[];
  notes?: string;
};
export type HouseholdInput = { parentName: string; phone?: string; email?: string; story?: string; source?: string; kids: KidInput[] };

export type Household = { family: FamilyRow; children: ChildRow[]; state: HouseholdState };

const clean = (s?: string | null) => (s || "").trim();
const nowIso = () => new Date().toISOString();

/** Business rules for running the 2026 campaign. Storage is injected so tests and the review build use memory. */
export function createCampaign(store: CampaignStore) {
  async function find(id: string) {
    const c = (await store.list()).find((x) => x.id === id);
    if (!c) throw new CampaignError("Child not found.", "not_found");
    return c;
  }

  /** Quick entry from a printed email: one household, one or more children. The age rule is applied on the way in. */
  async function enterHousehold(input: HouseholdInput, by?: string) {
    const parentName = clean(input.parentName);
    if (!parentName) throw new CampaignError("Add the parent or guardian's name.");
    if (!input.kids?.length) throw new CampaignError("Add at least one child.");
    if (input.kids.length > 12) throw new CampaignError("A household can have up to 12 children on one entry.");
    const settings = await store.getSettings();

    const phone = clean(input.phone);
    const email = clean(input.email);
    const existingFamilyId = await store.findFamily(normPhone(phone), normEmail(email));
    const existing = existingFamilyId ? (await store.list()).filter((c) => c.family_id === existingFamilyId) : [];

    const kids: NewKid[] = [];
    const skipped: string[] = [];
    for (const k of input.kids) {
      const fullName = clean(k.fullName);
      if (!fullName) throw new CampaignError("Every child needs a name.");
      if (k.age != null && (!Number.isInteger(k.age) || k.age < 0 || k.age > 120)) throw new CampaignError(`${fullName}: enter an age from 0 to 120, or leave it blank if the email does not say.`);
      if (existing.some((e) => sameChild(e, { full_name: fullName, age: k.age })) || kids.some((e) => sameChild(e, { full_name: fullName, age: k.age }))) {
        skipped.push(fullName);
        continue;
      }
      const e = entryDecision(k.age, settings.maxAge);
      kids.push({
        full_name: fullName,
        first_name: firstName(fullName),
        age: k.age,
        age_uncertain: k.age != null && !!k.ageUnsure,
        gender: k.gender,
        tops: clean(k.tops) || null,
        bottoms: clean(k.bottoms) || null,
        shoes: clean(k.shoes) || null,
        wants: k.wants.map(clean).filter(Boolean),
        needs: k.needs.map(clean).filter(Boolean),
        faves: k.faves.map(clean).filter(Boolean).slice(0, 3),
        fav_color: clean(k.favColor) || null,
        ...giftCardFields(k.giftCards ?? (clean(k.giftStore) ? [{ store: clean(k.giftStore), amount: k.giftAmount ?? 25 }] : [])),
        decision: e.decision,
        decision_reason: e.reason,
        set_aside_code: e.code,
        organizer_notes: clean(k.notes) || null,
      });
    }
    const made = await store.createHousehold(
      { parent_name: parentName, phone: phone || null, email: email || null, story: clean(input.story) || null, source_label: clean(input.source) || "Printed email" },
      kids,
      existingFamilyId,
    );
    if (by) {
      for (let i = 0; i < kids.length; i++) if (kids[i].decision === "set_aside") await store.patchChild(made.childIds[i], { decided_at: nowIso(), decided_by: by });
    }
    return {
      familyId: made.familyId,
      parentName: existing[0]?.family?.parent_name ?? parentName,
      childCount: existing.length + kids.length,
      merged: !!existingFamilyId,
      skipped,
      children: kids.map((k, i) => ({ id: made.childIds[i], name: k.full_name, decision: k.decision, reason: k.decision_reason })),
      maxAge: settings.maxAge,
    };
  }

  async function decide(childId: string, decision: Decision, opts: { reason?: string; by?: string; pendingOnly?: boolean } = {}) {
    const c = await find(childId);
    if (opts.pendingOnly) {
      if (c.decision === "approved") return;
      if (c.decision !== "pending" && c.decision !== "needs_info") {
        throw new CampaignError("Review this decision in the household before approving.", "conflict");
      }
    }
    const settings = await store.getSettings();
    if (c.approved && decision !== "approved") throw new CampaignError("Unpublish this angel from the tree first.", "conflict");
    const reason = clean(opts.reason);
    const stamp = { decided_at: nowIso(), decided_by: opts.by ?? null };
    if (decision === "approved") {
      const ok = canApprove(c, settings.maxAge);
      if (!ok.ok) throw new CampaignError(ok.error, "conflict");
      if (!c.wants.length && !c.needs.length) throw new CampaignError("Add at least one want or need before approving.", "conflict");
      await store.patchChild(childId, { decision, decision_reason: null, set_aside_code: null, ...stamp }, opts.pendingOnly ? c.decision : undefined);
    } else if (decision === "needs_info" || decision === "declined" || decision === "set_aside") {
      if (!reason) throw new CampaignError(decision === "needs_info" ? "Write what you need to know so it is on record." : "Give a short reason so it is on record.");
      await store.patchChild(childId, { decision, decision_reason: reason, set_aside_code: decision === "set_aside" ? "other" : null, ...stamp });
    } else {
      if (c.age != null && c.age > settings.maxAge) throw new CampaignError("Still over the age limit. Correct the age or change the season limit first.", "conflict");
      await store.patchChild(childId, { decision: "pending", decision_reason: null, set_aside_code: null, decided_at: null, decided_by: null });
    }
  }

  async function setAge(childId: string, age: number | null, unsure: boolean, by?: string) {
    if (age != null && (!Number.isInteger(age) || age < 0 || age > 120)) throw new CampaignError("Enter an age from 0 to 120.");
    const c = await find(childId);
    const { maxAge } = await store.getSettings();
    if (c.approved && age != null && age > maxAge) throw new CampaignError("Unpublish this angel before changing the age to one over the limit.", "conflict");
    await store.patchChild(childId, { age, age_uncertain: age != null && unsure });
    if (!c.approved) {
      const e = entryDecision(age, maxAge);
      if (e.decision === "set_aside" && ["pending", "approved", "needs_info"].includes(c.decision)) await store.patchChild(childId, { decision: "set_aside", decision_reason: e.reason, set_aside_code: "over_age", decided_at: nowIso(), decided_by: by ?? null });
      else if (e.decision === "pending" && c.decision === "set_aside" && c.set_aside_code === "over_age") await store.patchChild(childId, { decision: "pending", decision_reason: null, set_aside_code: null, decided_at: null, decided_by: null });
    }
  }

  async function confirmAge(childId: string) {
    const c = await find(childId);
    if (c.age == null) throw new CampaignError("Enter the age first.", "conflict");
    await store.patchChild(childId, { age_uncertain: false });
  }

  async function publish(childId: string) {
    const c = await find(childId);
    if (c.decision !== "approved" || !c.angel_code) throw new CampaignError("Approve this child first. Approval and publishing are separate steps.", "conflict");
    if (!c.approved) await store.patchChild(childId, { approved: true }, "approved");
  }
  async function unpublish(childId: string) {
    await find(childId);
    await store.patchChild(childId, { approved: false });
  }
  async function publishAll(familyId?: string) {
    const rows = (await store.list()).filter((c) => c.decision === "approved" && !!c.angel_code && !c.approved && (!familyId || c.family_id === familyId));
    for (const c of rows) await store.patchChild(c.id, { approved: true });
    return rows.length;
  }

  async function updateHousehold(familyId: string, p: { parentName?: string; phone?: string; email?: string; story?: string }) {
    const patch: Partial<FamilyRow> & { phone_norm?: string | null; email_norm?: string | null } = {};
    if (p.parentName !== undefined) {
      if (!clean(p.parentName)) throw new CampaignError("The parent or guardian name can't be empty.");
      patch.parent_name = clean(p.parentName);
    }
    if (p.phone !== undefined) { patch.phone = clean(p.phone) || null; patch.phone_norm = normPhone(p.phone) || null; }
    if (p.email !== undefined) { patch.email = clean(p.email) || null; patch.email_norm = normEmail(p.email) || null; }
    if (p.story !== undefined) patch.story = clean(p.story) || null;
    await store.patchFamily(familyId, patch);
  }

  /** The one maximum-age rule for the season. Open children and age-based set-asides move to match. */
  async function saveMaxAge(n: number, by?: string) {
    if (!Number.isInteger(n) || n < 0 || n > 120) throw new CampaignError("Enter a whole number from 0 to 120.");
    await store.saveSettings({ maxAge: n, maxAgeConfirmed: true });
    const moves = reevaluate(await store.list(), n);
    for (const m of moves) await store.patchChild(m.id, { decision: m.decision, decision_reason: m.reason, set_aside_code: m.code, decided_at: m.decision === "set_aside" ? nowIso() : null, decided_by: m.decision === "set_aside" ? by ?? null : null });
    return { moved: moves.length };
  }

  async function saveLabelStock(setting: LabelStockSetting) {
    if (setting && typeof setting === "object") {
      const { error } = customStock(setting);
      if (error) throw new CampaignError(error);
    } else if (setting !== null && (!stockById(setting) || setting === "cardstock")) {
      throw new CampaignError("Choose one of the listed label sheets.");
    }
    await store.saveSettings({ labelStock: setting });
  }

  async function households(): Promise<Household[]> {
    const rows = await store.list();
    const by = new Map<string, ChildRow[]>();
    for (const c of rows) by.set(c.family_id, [...(by.get(c.family_id) ?? []), c]);
    return [...by.values()]
      .map((children) => ({ family: children[0].family as FamilyRow, children, state: householdState(children) }))
      .sort((a, b) => (b.family.created_at || "").localeCompare(a.family.created_at || ""));
  }

  async function summary() {
    const rows = await store.list();
    const settings = await store.getSettings();
    const hs = await households();
    const n = (f: (c: ChildRow) => boolean) => rows.filter(f).length;
    return {
      settings,
      households: { review: hs.filter((h) => h.state === "review").length, waiting: hs.filter((h) => h.state === "waiting").length, decided: hs.filter((h) => h.state === "decided").length, set_aside: hs.filter((h) => h.state === "set_aside").length },
      children: rows.length,
      pending: n((c) => c.decision === "pending"),
      setAside: n((c) => c.decision === "set_aside"),
      approved: n((c) => c.decision === "approved"),
      published: n((c) => c.approved),
      ageFlags: n((c) => c.decision === "pending" && ageFlag(c, settings.maxAge) !== null && ageFlag(c, settings.maxAge) !== "over_age"),
      sponsored: n((c) => c.approved && c.status !== "available"),
      giftsReceived: n((c) => c.approved && (c.status === "returned" || c.status === "given")),
    };
  }

  return { enterHousehold, decide, setAge, confirmAge, publish, unpublish, publishAll, updateHousehold, saveMaxAge, saveLabelStock, households, summary, store };
}

export type Campaign = ReturnType<typeof createCampaign>;
