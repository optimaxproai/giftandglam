import { NextResponse } from "next/server";
import { z } from "zod";
import { getCampaign } from "@/lib/campaign";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const Body = z.object({ token: z.string().regex(/^[a-z0-9]{8,80}$/), childId: z.string().uuid(), action: z.enum(["bought", "release"]) });

/** A sponsor can only touch their own angels, and only forward ("bought") or back to the tree ("release"). */
export async function POST(req: Request) {
  if (!allow(`mine:${clientIp(req)}`, 30, 10 * 60_000)) return NextResponse.json({ error: "Too many tries." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const done = await (await getCampaign()).store.mineAction(parsed.data);
  if (!done) return NextResponse.json({ error: parsed.data.action === "bought" ? "This angel can't be updated." : "This angel can't be released." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
