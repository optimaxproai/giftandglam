import { getSponsorStore, saveReviewChecklist } from "@/lib/review-sponsorship";
import { NextResponse } from "next/server";
import { z } from "zod";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const Body = z.object({ token: z.string().regex(/^[a-z0-9]{8,80}$/), childId: z.string().uuid(), action: z.literal("bought") });

/** For 2026 a sponsor may mark their own angel shopping complete; only organizers handle cancellations. */
export async function POST(req: Request) {
  if (!allow(`mine:${clientIp(req)}`, 30, 10 * 60_000)) return NextResponse.json({ error: "Too many tries." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const store = await getSponsorStore();
  const done = await store.mineAction(parsed.data);
  if (!done) return NextResponse.json({ error: "This angel can't be updated." }, { status: 409 });
  await saveReviewChecklist(store, parsed.data.token);
  return NextResponse.json({ ok: true });
}
