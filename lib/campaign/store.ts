import { randomBytes, randomUUID } from "crypto";
import { db } from "../supabase/admin";
import { normEmail, normPhone } from "../families";
import type { LabelStockSetting } from "../print";
import { DEFAULT_MAX_AGE } from "./rules";
import type { ChildRow, FamilyRow, SponsorRow } from "../types";
import { CONTACT_COLUMNS, type SponsorContact, type SponsorContactInput, type SponsorFlyer } from "../sponsorContacts";
import { requestItems, maySponsorEdit, type GiftItem, type AdminGiftEdit } from "../giftItems";
import type { DonationOffer,DonationOfferInput,DonationOfferUpdate } from "../donations";

export type Settings = { maxAge: number; maxAgeConfirmed: boolean; labelStock: LabelStockSetting };

export type NewFamily = { parent_name: string; phone: string | null; email: string | null; story: string | null; source_label: string | null };
export type NewKid = Pick<
  ChildRow,
  "full_name" | "first_name" | "age" | "age_uncertain" | "gender" | "tops" | "bottoms" | "shoes" | "wants" | "needs" | "faves" | "fav_color" | "gift_store" | "gift_amount" | "gift_cards" | "decision" | "decision_reason" | "set_aside_code" | "organizer_notes"
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
  listSponsorContacts(): Promise<SponsorContact[]>;
  saveSponsorContact(id: string | null, input: SponsorContactInput, flyer?: SponsorFlyer | null): Promise<void>;
  sponsorFlyer(id: string): Promise<SponsorFlyer | null>;
  claim(a: { childId: string; name: string; email: string; phone: string | null; gift: boolean; sponsorToken: string | null }): Promise<string>;
  sponsorByToken(token: string): Promise<SponsorRow | null>;
  sponsorByEmail(email:string):Promise<SponsorRow|null>;
  listGiftItems(childIds?: string[]): Promise<GiftItem[]>;
  setSponsorGift(token: string, itemId: string, purchased: boolean): Promise<boolean>;
  setAdminGift(edit: AdminGiftEdit): Promise<boolean>;
  createDonationOffer(input:DonationOfferInput): Promise<void>;
  listDonationOffers():Promise<DonationOffer[]>;
  updateDonationOffer(id:string,patch:DonationOfferUpdate):Promise<boolean>;
  mineAction(a: { token: string; childId: string; action: "bought" | "release" }): Promise<boolean>;
}

const nowIso = () => new Date().toISOString();

/* ------------------------------------------------------------------ memory */

type MemState = { children: ChildRow[]; families: Map<string, FamilyRow & { phone_norm?: string | null; email_norm?: string | null }>; sponsors: Map<string, SponsorRow & { email_norm: string }>; sponsorContacts: Map<string, SponsorContact>; sponsorFlyers: Map<string, SponsorFlyer>; giftItems: GiftItem[]; donationOffers:DonationOffer[]; settings: Settings; no: number; code: number };

export function emptyState(): MemState {
  return { children: [], families: new Map(), sponsors: new Map(), sponsorContacts: new Map(), sponsorFlyers: new Map(), giftItems: [], donationOffers:[], settings: { maxAge: DEFAULT_MAX_AGE, maxAgeConfirmed: false, labelStock: null }, no: 0, code: 0 };
}

/** In-memory store. Mirrors the database rules (angel codes, published-needs-approved, atomic claim). */
export function createMemoryStore(state: MemState = emptyState()): CampaignStore & { state: MemState } {
  state.giftItems ??= [];
  state.donationOffers ??= [];
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
  function sync(c: ChildRow) {
    state.giftItems.filter(g => g.child_id === c.id).forEach(g => { g.active = false; });
    for (const request of requestItems(c)) {
      const previous = state.giftItems.find(g => g.child_id === c.id && g.item_key === request.item_key);
      if (previous) Object.assign(previous, request);
      else state.giftItems.push({ ...request, id: randomUUID(), purchase_source: null, received: false, donation_assigned: false });
    }
  }
  const clearSponsorPurchases = (id: string) => state.giftItems.filter(g => g.child_id === id && g.purchase_source === "sponsor" && !g.received).forEach(g => { g.purchase_source = null; });
  state.children.forEach(sync);
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
        sync(c);
        childIds.push(c.id);
      }
      return { familyId, childIds };
    },
    async patchChild(id, patch) {
      const c = state.children.find((x) => x.id === id);
      if (!c) throw new CampaignError("Child not found.", "not_found");
      const next = { ...c, ...patch };
      if (next.approved && next.decision !== "approved") throw new CampaignError("Only approved children can be published.", "conflict");
      if (patch.sponsor_id !== undefined && c.sponsor_id && c.sponsor_id !== patch.sponsor_id) clearSponsorPurchases(c.id);
      Object.assign(c, patch);
      sync(c);
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
    async listSponsorContacts() {
      return [...state.sponsorContacts.values()].map(clone).sort((a, b) => a.name.localeCompare(b.name));
    },
    async saveSponsorContact(id, input, flyer) {
      if (id && !state.sponsorContacts.has(id)) throw new CampaignError("Sponsor not found.", "not_found");
      const key = id ?? randomUUID();
      const name = flyer === undefined ? state.sponsorContacts.get(key)?.flyer_name ?? null : flyer?.flyer_name ?? null;
      state.sponsorContacts.set(key, clone({ id: key, ...input, flyer_name: name }));
      if (flyer) state.sponsorFlyers.set(key, clone(flyer));
      else if (flyer === null) state.sponsorFlyers.delete(key);
    },
    async sponsorFlyer(id) {
      return clone(state.sponsorFlyers.get(id) ?? null);
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
    async sponsorByEmail(email){const sp=[...state.sponsors.values()].find(x=>x.email_norm===normEmail(email));return sp?clone(sp):null;},
    async listGiftItems(childIds) {
      state.children.forEach(sync);
      return clone(state.giftItems.filter(g => !childIds || childIds.includes(g.child_id)).sort((a,b) => a.position-b.position));
    },
    async setSponsorGift(token, itemId, purchased) {
      const sp = [...state.sponsors.values()].find(s => s.token === token);
      const g = state.giftItems.find(g => g.id === itemId);
      const c = state.children.find(c => c.id === g?.child_id);
      if (!sp || !g || !c || !maySponsorEdit(g,c,sp.id)) return false;
      g.purchase_source = purchased ? "sponsor" : null;
      return true;
    },
    async setAdminGift(edit) {
      const g = state.giftItems.find(g => g.id === edit.itemId && g.active);
      if (!g) return false;
      if (edit.action === "purchase") g.purchase_source = edit.source;
      else if (edit.action === "received") g.received = edit.value;
      else g.donation_assigned = edit.value;
      return true;
    },
    async createDonationOffer(input){state.donationOffers.push({...input,id:randomUUID(),status:"pending",created_at:nowIso(),received_cents:null,organizer_notes:""});},
    async listDonationOffers(){return clone(state.donationOffers).reverse();},
    async updateDonationOffer(id,patch){const d=state.donationOffers.find(d=>d.id===id);if(!d||d.purpose==="other"&&patch.received_cents!==null)return false;Object.assign(d,patch);return true;},
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
      if (state.giftItems.some(g => g.child_id === c.id && g.received)) return false;
      c.status = "available";
      clearSponsorPurchases(c.id);
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
      const ls = get(SETTINGS_KEYS.labelStock) as { value?: LabelStockSetting } | undefined;
      return { maxAge: ma?.value ?? DEFAULT_MAX_AGE, maxAgeConfirmed: !!ma?.confirmed, labelStock: ls?.value ?? null };
    },
    async saveSettings(p) {
      const rows: { key: string; value: unknown; updated_at: string }[] = [];
      if (p.maxAge !== undefined) rows.push({ key: SETTINGS_KEYS.maxAge, value: { value: p.maxAge, confirmed: p.maxAgeConfirmed ?? true }, updated_at: nowIso() });
      if (p.labelStock !== undefined) rows.push({ key: SETTINGS_KEYS.labelStock, value: { value: p.labelStock }, updated_at: nowIso() });
      if (rows.length) ok(await db().from("drive_settings").upsert(rows));
    },
    async listSponsorContacts() {
      return (ok(await db().from("sponsor_contacts").select(CONTACT_COLUMNS).order("name")) as unknown as SponsorContact[]) ?? [];
    },
    async saveSponsorContact(id, input, flyer) {
      const patch = { ...input, ...(flyer === undefined ? {} : flyer ?? { flyer_name: null, flyer_type: null, flyer_data: null }) };
      if (id) {
        const rows = ok(await db().from("sponsor_contacts").update(patch).eq("id", id).select("id"));
        if (!rows?.length) throw new CampaignError("Sponsor not found.", "not_found");
      } else ok(await db().from("sponsor_contacts").insert(patch));
    },
    async sponsorFlyer(id) {
      const row = ok(await db().from("sponsor_contacts").select("flyer_name,flyer_type,flyer_data").eq("id", id).maybeSingle()) as SponsorFlyer | null;
      return row?.flyer_data ? row : null;
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
    async sponsorByEmail(email){return (ok(await db().from("sponsors").select("*").eq("email_norm",normEmail(email)).maybeSingle()) as SponsorRow|null)??null;},
    async listGiftItems(childIds) {
      if (childIds?.length === 0) return [];
      const result: GiftItem[] = [];
      for (let offset=0;;offset+=500) {
        let q = db().from("gift_items").select("*").order("id").range(offset,offset+499);
        if (childIds) q=q.in("child_id",childIds);
        const page = (ok(await q) || []) as GiftItem[];
        result.push(...page);
        if (page.length < 500) break;
      }
      return result.sort((a,b) => a.position-b.position);
    },
    async setSponsorGift(token,itemId,purchased) {
      return !!ok(await db().rpc("set_sponsor_gift", { p_token: token, p_item: itemId, p_purchased: purchased }));
    },
    async setAdminGift(edit) {
      return !!ok(await db().rpc("edit_admin_gift",{p_item:edit.itemId,p_action:edit.action,p_source:edit.action==="purchase"?edit.source:null,p_value:edit.action==="purchase"?null:edit.value}));
    },
    async createDonationOffer(input){ok(await db().from("donation_offers").insert(input));},
    async listDonationOffers(){const result:DonationOffer[]=[];for(let offset=0;;offset+=500){const rows=(ok(await db().from("donation_offers").select("*").order("created_at",{ascending:false}).order("id").range(offset,offset+499))||[]) as DonationOffer[];result.push(...rows);if(rows.length<500)break;}return result;},
    async updateDonationOffer(id,patch){const rows=ok(await db().from("donation_offers").update(patch).eq("id",id).select("id"));return !!rows?.length;},
    async mineAction({ token, childId, action }) {
      const sp = ok(await db().from("sponsors").select("id").eq("token", token).maybeSingle()) as { id: string } | null;
      if (!sp) return false;
      if (action === "bought") {
        const r = ok(await db().from("children").update({ status: "purchased" }).eq("id", childId).eq("sponsor_id", sp.id).eq("status", "claimed").select("id")) as { id: string }[];
        return r.length > 0;
      }
      return !!ok(await db().rpc("release_sponsor_angel", { p_token: token, p_child: childId }));
    },
  };
}

function normsOf(f: NewFamily) {
  return { phone_norm: normPhone(f.phone) || null, email_norm: normEmail(f.email) || null };
}
