import type { Decision } from "../types";

/** Starting limit for the season. The organizer confirms or changes it before deciding anyone. */
export const DEFAULT_MAX_AGE = 17;

export type AgeFlag = "missing" | "uncertain" | "over_age" | null;

export function ageFlag(c: { age: number | null; age_uncertain: boolean }, maxAge: number): AgeFlag {
  if (c.age == null) return "missing";
  if (c.age > maxAge) return "over_age";
  if (c.age_uncertain) return "uncertain";
  return null;
}

export const overAgeReason = (age: number, maxAge: number) => `Over the age limit: age ${age}, season limit ${maxAge}.`;

/** What a child's first decision is when entered, or when the season limit changes. */
export function entryDecision(age: number | null, maxAge: number): { decision: "pending" | "set_aside"; reason: string | null; code: "over_age" | null } {
  if (age != null && age > maxAge) return { decision: "set_aside", reason: overAgeReason(age, maxAge), code: "over_age" };
  return { decision: "pending", reason: null, code: null };
}

/** Approval needs a known, confirmed age that is inside the limit. */
export function canApprove(c: { age: number | null; age_uncertain: boolean }, maxAge: number): { ok: true } | { ok: false; error: string } {
  if (c.age == null) return { ok: false, error: "Enter the age before approving." };
  if (c.age > maxAge) return { ok: false, error: `${overAgeReason(c.age, maxAge)} Set this child aside, or change the season limit.` };
  if (c.age_uncertain) return { ok: false, error: "Confirm the age before approving." };
  return { ok: true };
}

export type HouseholdState = "review" | "waiting" | "decided" | "set_aside";

/**
 * Where a household sits in the queue.
 * review: at least one child still needs a decision (eligible siblings stay here).
 * waiting: only "more information" children remain.
 * set_aside: nobody is eligible (for example a single over-age applicant): out of the active queue.
 */
export function householdState(kids: { decision: Decision }[]): HouseholdState {
  if (kids.some((k) => k.decision === "pending")) return "review";
  if (kids.some((k) => k.decision === "needs_info")) return "waiting";
  if (kids.length && kids.every((k) => k.decision === "set_aside" || k.decision === "declined") && kids.some((k) => k.decision === "set_aside")) return "set_aside";
  return "decided";
}

type Reevaluable = { id: string; age: number | null; decision: Decision; set_aside_code: "over_age" | "other" | null; approved: boolean };

/** When the season limit changes: move open children and age-based set-asides to where the new limit puts them. */
export function reevaluate(children: Reevaluable[], maxAge: number) {
  const out: { id: string; decision: "pending" | "set_aside"; reason: string | null; code: "over_age" | null }[] = [];
  for (const c of children) {
    if (c.approved) continue;
    const open = c.decision === "pending" || (c.decision === "set_aside" && c.set_aside_code === "over_age");
    if (!open) continue;
    const next = entryDecision(c.age, maxAge);
    if (next.decision !== c.decision) out.push({ id: c.id, ...next });
    else if (next.decision === "set_aside") out.push({ id: c.id, ...next }); // refresh the reason text with the new limit
  }
  return out;
}

export const DECISION_LABEL: Record<Decision, string> = { pending: "Needs review", approved: "Approved", needs_info: "More info requested", declined: "Declined", set_aside: "Set aside" };
export const DECISION_PILL: Record<Decision, string> = { pending: "purchased", approved: "available", needs_info: "late", declined: "neutral", set_aside: "neutral" };
