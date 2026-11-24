import { randomBytes, randomUUID } from "crypto";
import { db } from "../supabase/admin";
import { normEmail, normPhone } from "../families";
import { DEFAULT_MAX_AGE } from "./rules";
import type { ChildRow, FamilyRow, SponsorRow } from "../types";

export type Settings = { maxAge: number; maxAgeConfirmed: boolean; labelStock: string | null };

export type NewFamily = { parent_name: string; phone: string | null; email: string | null; story: string | null; source_label: string | null };
export type NewKid = Pick<
  ChildRow,
  "full_name" | "first_name" | "age" | "age_uncertain" | "gender" | "tops" | "bottoms" | "shoes" | "wants" | "needs" | "faves" | "fav_color" | "gift_store" | "gift_amount" | "decision" | "decision_reason" | "set_aside_code" | "organizer_notes"
>;

export class CampaignError extends Error {
  constructor(message: string, public code: "invalid" | "not_found" | "conflict" | "unavailable" | "session" = "invalid") {
    super(message);
  }
}

/** Low-level persistence for the 2026 campaign. Memory (review build, tests) and Supabase (production). */
export interface CampaignStore {
  list(): Promise<ChildRow[]>;
  findFamily(phoneNorm: string, emailNorm: string): Promise<string | null>;
  createHousehold(f: NewFamily, kids: NewKid[], existingFamilyId?: string | null): Promise<{ familyId: string; childIds: string[] }>;
  patchChild(id: string, patch: Partial<ChildRow>): Promise<void>;
  patchFamily(id: string, patch: Partial<FamilyRow> & { phone_norm?: string | null; email_norm?: string | null }): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(p: Partial<Settings>): Promise<void>;
  claim(a: { childId: string; name: string; email: string; phone: string | null; gift: boolean; sponsorToken: string | null }): Promise<string>;
  sponsorByToken(token: string): Promise<SponsorRow | null>;
  mineAction(a: { token: string; childId: string; action: "bought" | "release" }): Promise<boolean>;
}

const nowIso = () => new Date().toISOString();

/* ------------------------------------------------------------------ memory */

type MemState = { children: ChildRow[]; families: Map<string, FamilyRow & { phone_norm?: string | null; email_norm?: string | null }>; sponsors: Map<string, SponsorRow & { email_norm: string }>; settings: Settings; no: number; code: number };

export function emptyState(): MemState {
  return { children: [], families: new Map(), sponsors: new Map(), settings: { maxAge: DEFAULT_MAX_AGE, maxAgeConfirmed: false, labelStock: null }, no: 0, code: 0 };
}

/** In-memory store. Mirrors the database rules (angel codes, published-needs-approved, atomic claim). */
export function createMemoryStore(state: MemState = emptyState()): CampaignStore & { state: MemState } {
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
  const join = (c: ChildRow): ChildRow => ({ ...clone(c), family: clone(state.families.get(c.family_id) ?? null), sponsor: c.sponsor_id ? clone(state.sponsors.get(c.sponsor_id) ?? null) : null });
  const assignCode = (c: ChildRow) => {
    if (c.decision === "approved" && !c.angel_code) c.angel_code = `G26-${String(++state.code).padStart(3, "0")}`;
  };
  return {
    state,
    async list() {
      return state.children.map(join).sort((a, b) => a.no - b.no);
    },
    async findFamily(phoneNorm, emailNorm) {
      for (const f of state.families.values()) if ((phoneNorm && f.phone_norm === phoneNorm) || (emailNorm && f.email_norm === emailNorm)) return f.id;
      return null;
    },
    async createHousehold(f, kids, existingFamilyId) {
      let familyId = existingFamilyId || "";
      if (!familyId) {
        familyId = randomUUID();
        state.families.set(familyId, { id: familyId, ...f, created_at: nowIso(), phone_norm: normPhone(f.phone) || null, email_norm: normEmail(f.email) || null });
      }
      const childIds: string[] = [];
      for (const k of kids) {
        const c: ChildRow = {
          id: randomUUID(), no: ++state.no, family_id: familyId, ...k,
          gift_card_status: "none", photo_path: null, photo_public: false, approved: false, status: "available",
          sponsor_id: null, claimed_at: null, returned_at: null, angel_code: null, decided_at: null, decided_by: null,
        };
        assignCode(c);
        state.children.push(c);
        childIds.push(c.id);
      }
      return { familyId, childIds };
    },
    async patchChild(id, patch) {
      const c = state.children.find((x) => x.id === id);
      if (!c) throw new CampaignError("Child not found.", "not_found");
      const next = { ...c, ...patch };
      if (next.approved && next.decision !== "approved") throw new CampaignError("Only approved children can be published.", "conflict");
      Object.assign(c, patch);
      assignCode(c);
    },
    async patchFamily(id, patch) {
      const f = state.families.get(id);
      if (!f) throw new CampaignError("Household not found.", "not_found");
      Object.assign(f, patch);
    },
    async getSettings() {
      return { ...state.settings };
    },
    async saveSettings(p) {
      Object.assign(state.settings, p);
    },
    async claim({ childId, name, email, phone, gift, sponsorToken }) {
      const norm = email.trim().toLowerCase();
      let sp = [...state.sponsors.values()].find((s) => s.email_norm === norm);
      if (sp && sp.token !== sponsorToken) throw new CampaignError("sponsor_session_required", "session");
      const c = state.children.find((x) => x.id === childId);
      if (!c || c.status !== "available" || !c.approved) throw new CampaignError("child_unavailable", "unavailable");
      if (!sp) {
        sp = { id: randomUUID(), name: name.trim(), email: email.trim(), email_norm: norm, phone: phone?.trim() || null, token: randomBytes(32).toString("hex") };
        state.sponsors.set(sp.id, sp);
      } else {
        sp.name = name.trim();
        sp.phone = phone?.trim() || sp.phone;
      }
      c.status = "claimed";
      c.sponsor_id = sp.id;
      c.claimed_at = nowIso();
      if (gift && c.gift_store) c.gift_card_status = "pledged";
      return sp.token;
    },
    async sponsorByToken(token) {
      const sp = [...state.sponsors.values()].find((s) => s.token === token);
      return sp ? clone(sp) : null;
    },
    async mineAction({ token, childId, action }) {
      const sp = [...state.sponsors.values()].find((s) => s.token === token);
      const c = state.children.find((x) => x.id === childId);
      if (!sp || !c || c.sponsor_id !== sp.id) return false;
      if (action === "bought") {
        if (c.status !== "claimed") return false;
        c.status = "purchased";
        return true;
      }
      if (c.status !== "claimed" && c.status !== "purchased") return false;
      c.status = "available";
      c.sponsor_id = null;
      c.claimed_at = null;
      if (c.gift_card_status === "pledged") c.gift_card_status = "none";
      return true;
    },
  };
}

/* ---------------------------------------------------------------- supabase */

function ok<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const SETTINGS_KEYS = { maxAge: "max_age", labelStock: "label_stock" } as const;

export function createSupabaseStore(): CampaignStore {
  return {
    async list() {
      return (ok(await db().from("children").select("*, family:families(*), sponsor:sponsors(*)").order("no")) as unknown as ChildRow[]) || [];
    },
    async findFamily(phoneNorm, emailNorm) {
      if (phoneNorm) {
        const r = ok(await db().from("families").select("id").eq("phone_norm", phoneNorm).limit(1)) as { id: string }[];
        if (r[0]) return r[0].id;
      }
      if (emailNorm) {
        const r = ok(await db().from("families").select("id").eq("email_norm", emailNorm).limit(1)) as { id: string }[];
        if (r[0]) return r[0].id;
      }
      return null;
    },
    async createHousehold(f, kids, existingFamilyId) {
      let familyId = existingFamilyId || "";
      if (!familyId) {
        const { phone_norm, email_norm } = normsOf(f);
        familyId = (ok(await db().from("families").insert({ ...f, phone_norm, email_norm }).select("id").single()) as { id: string }).id;
      }
      if (!kids.length) return { familyId, childIds: [] };
      const rows = ok(await db().from("children").insert(kids.map((k) => ({ ...k, family_id: familyId }))).select("id")) as { id: string }[];
      return { familyId, childIds: rows.map((r) => r.id) };
    },
    async patchChild(id, patch) {
      const { family, sponsor, ...cols } = patch as ChildRow;
      void family; void sponsor;
      ok(await db().from("children").update(cols).eq("id", id));
    },
    async patchFamily(id, patch) {
      ok(await db().from("families").update(patch).eq("id", id));
    },
    async getSettings() {
      const rows = ok(await db().from("drive_settings").select("key,value")) as { key: string; value: Record<string, unknown> }[];
      const get = (k: string) => rows.find((r) => r.key === k)?.value;
      const ma = get(SETTINGS_KEYS.maxAge) as { value?: number; confirmed?: boolean } | undefined;
      const ls = get(SETTINGS_KEYS.labelStock) as { value?: string } | undefined;
      return { maxAge: ma?.value ?? DEFAULT_MAX_AGE, maxAgeConfirmed: !!ma?.confirmed, labelStock: ls?.value ?? null };
    },
    async saveSettings(p) {
      const rows: { key: string; value: unknown; updated_at: string }[] = [];
      if (p.maxAge !== undefined) rows.push({ key: SETTINGS_KEYS.maxAge, value: { value: p.maxAge, confirmed: p.maxAgeConfirmed ?? true }, updated_at: nowIso() });
      if (p.labelStock !== undefined) rows.push({ key: SETTINGS_KEYS.labelStock, value: { value: p.labelStock }, updated_at: nowIso() });
      if (rows.length) ok(await db().from("drive_settings").upsert(rows));
    },
    async claim({ childId, name, email, phone, gift, sponsorToken }) {
      const { data, error } = await db().rpc("claim_child", { p_child: childId, p_name: name, p_email: email, p_phone: phone, p_gift: gift, p_sponsor_token: sponsorToken });
      if (error) {
        if (error.message.includes("child_unavailable")) throw new CampaignError("child_unavailable", "unavailable");
        if (error.message.includes("sponsor_session_required")) throw new CampaignError("sponsor_session_required", "session");
        throw new Error(error.message);
      }
      return String(data);
    },
    async sponsorByToken(token) {
      return (ok(await db().from("sponsors").select("*").eq("token", token).maybeSingle()) as SponsorRow | null) ?? null;
    },
    async mineAction({ token, childId, action }) {
      const sp = ok(await db().from("sponsors").select("id").eq("token", token).maybeSingle()) as { id: string } | null;
      if (!sp) return false;
      if (action === "bought") {
        const r = ok(await db().from("children").update({ status: "purchased" }).eq("id", childId).eq("sponsor_id", sp.id).eq("status", "claimed").select("id")) as { id: string }[];
        return r.length > 0;
      }
      const r = ok(await db().from("children").update({ status: "available", sponsor_id: null, claimed_at: null }).eq("id", childId).eq("sponsor_id", sp.id).in("status", ["claimed", "purchased"]).select("id,gift_card_status")) as { id: string; gift_card_status: string }[];
      if (!r.length) return false;
      if (r[0].gift_card_status === "pledged") ok(await db().from("children").update({ gift_card_status: "none" }).eq("id", childId));
      return true;
    },
  };
}

function normsOf(f: NewFamily) {
  return { phone_norm: normPhone(f.phone) || null, email_norm: normEmail(f.email) || null };
}
