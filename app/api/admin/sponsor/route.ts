import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUser } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";
import { CampaignError } from "@/lib/campaign/store";

export const dynamic = "force-dynamic";

const Body = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Enter a name.").max(120),
  email: z.string().trim().email("Enter a valid email.").max(200),
  phone: z.string().trim().max(40).nullable().optional(),
});

/** Organizer-only: correct a sponsor's name, email or phone. */
export async function POST(req: Request) {
  if (!(await adminUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Please check the form." }, { status: 400 });
  try {
    await (await getCampaign()).store.updateSponsor(parsed.data.id, { name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone || null });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CampaignError) return NextResponse.json({ error: e.message }, { status: e.code === "not_found" ? 404 : 409 });
    return NextResponse.json({ error: "Couldn't save." }, { status: 500 });
  }
}
