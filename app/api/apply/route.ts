import { NextResponse } from "next/server";
import { z } from "zod";
import { INTAKE_SEASON } from "@/lib/drive";
import { getIntake } from "@/lib/intake";
import { IntakeError } from "@/lib/intake/types";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const val = z.union([z.string().max(5000), z.array(z.string().max(500)).max(60)]);
const Body = z.object({
  website: z.string().optional(), // honeypot
  household: z.record(val),
  children: z.array(z.record(val)).max(20),
});

/** Public: a family submits one application for the whole household. */
export async function POST(req: Request) {
  if (!allow(`apply:${clientIp(req)}`, 6, 60 * 60_000)) return NextResponse.json({ error: "Too many applications from this connection. Please try again later." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That application couldn't be read. Please check it and try again." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true, id: "app_received" }); // bots get a fake success
  try {
    const r = await (await getIntake()).submit(INTAKE_SEASON, { household: parsed.data.household, children: parsed.data.children });
    if (!r.ok) return NextResponse.json({ error: "Please fix the highlighted questions.", errors: r.errors }, { status: 422 });
    return NextResponse.json({ ok: true, id: r.id });
  } catch (e) {
    if (e instanceof IntakeError && e.code === "closed") return NextResponse.json({ error: e.message }, { status: 409 });
    return NextResponse.json({ error: "We couldn't save your application. Please try again." }, { status: 500 });
  }
}
