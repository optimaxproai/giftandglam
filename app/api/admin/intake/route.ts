import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUser } from "@/lib/auth";
import { INTAKE_SEASON } from "@/lib/drive";
import { getIntake, resetReview } from "@/lib/intake";
import { resetCampaignReview } from "@/lib/campaign";
import { IntakeError } from "@/lib/intake/types";
import { reviewMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

const Question = z.object({
  id: z.string().min(1).max(60),
  scope: z.enum(["household", "child"]),
  key: z.enum(["parent_name", "phone", "email", "hardship", "child_name", "age", "wishes", "needs", "sizes", "interests"]).optional(),
  prompt: z.string().max(400),
  help: z.string().max(400).optional(),
  type: z.enum(["text", "longtext", "number", "choice", "list"]),
  options: z.array(z.string().max(120)).max(20).optional(),
  required: z.boolean(),
});
const Card = z.object({ ageRange: z.string(), wishes: z.array(z.string()), needs: z.array(z.string()), sizes: z.string(), interests: z.array(z.string()) }).partial();
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save_draft"), questions: z.array(Question).max(60) }),
  z.object({ action: z.literal("publish") }),
  z.object({ action: z.literal("discard_draft") }),
  z.object({ action: z.literal("reset_review") }),
  z.object({
    action: z.literal("review"),
    id: z.string().max(60),
    step: z.enum(["approve", "needs_info", "decline", "update_card", "publish", "unpublish", "publish_all"]),
    childId: z.string().max(60).optional(),
    note: z.string().max(2000).optional(),
    card: Card.optional(),
  }),
]);

/** Organizer-only: questionnaire editing and application review. */
export async function POST(req: Request) {
  const admin = await adminUser();
  if (!admin) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const b = parsed.data;
  try {
    if (b.action === "reset_review") {
      if (!reviewMode()) return NextResponse.json({ error: "Only available in the review build." }, { status: 403 });
      await resetReview();
      await resetCampaignReview();
      return NextResponse.json({ ok: true });
    }
    const intake = await getIntake();
    if (b.action === "save_draft") await intake.saveDraft(INTAKE_SEASON, b.questions);
    else if (b.action === "publish") await intake.publish(INTAKE_SEASON);
    else if (b.action === "discard_draft") await intake.discardDraft(INTAKE_SEASON);
    else await intake.review(b.id, b.step, { note: b.note, childId: b.childId, card: b.card, reviewer: admin.email });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof IntakeError) return NextResponse.json({ error: e.message }, { status: e.code === "not_found" ? 404 : 422 });
    return NextResponse.json({ error: "Something went wrong saving that." }, { status: 500 });
  }
}
