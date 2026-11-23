import { demoChildren, demoMode } from "../demo";
import { reviewMode } from "../mode";
import type { ChildRow } from "../types";
import { createCampaign, type Campaign } from "./service";
import { seedCampaignReview } from "./seed";
import { createMemoryStore, createSupabaseStore, emptyState } from "./store";
import { DEFAULT_MAX_AGE } from "./rules";

type Holder = { campaign: Campaign; ready: Promise<void> };
const g = globalThis as unknown as { __angelCampaign?: Holder };

function demoRows() {
  const state = emptyState();
  const rows: ChildRow[] = demoChildren();
  for (const r of rows) {
    if (r.family) state.families.set(r.family.id, { ...r.family, phone_norm: null, email_norm: null });
    if (r.sponsor) state.sponsors.set(r.sponsor.id, { ...r.sponsor, email_norm: r.sponsor.email.toLowerCase() });
    state.children.push({ ...r, family: undefined, sponsor: undefined });
    state.no = Math.max(state.no, r.no);
    state.code = Math.max(state.code, r.no);
  }
  state.settings = { maxAge: DEFAULT_MAX_AGE, maxAgeConfirmed: true, labelStock: null };
  return state;
}

function fresh(): Holder {
  if (reviewMode()) {
    const campaign = createCampaign(createMemoryStore());
    return { campaign, ready: seedCampaignReview(campaign) };
  }
  return { campaign: createCampaign(createMemoryStore(demoRows())), ready: Promise.resolve() };
}

/** Review build and local demo use fictional in-memory data. Everything else uses Supabase. */
export async function getCampaign(): Promise<Campaign> {
  if (demoMode()) {
    g.__angelCampaign ??= fresh();
    await g.__angelCampaign.ready;
    return g.__angelCampaign.campaign;
  }
  return createCampaign(createSupabaseStore());
}

export async function resetCampaignReview(): Promise<void> {
  g.__angelCampaign = fresh();
  await g.__angelCampaign.ready;
}
