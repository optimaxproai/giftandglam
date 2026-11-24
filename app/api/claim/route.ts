import { NextResponse } from "next/server";
import { z } from "zod";
import { getCampaign } from "@/lib/campaign";
import { CampaignError } from "@/lib/campaign/store";
import { allow, clientIp } from "@/lib/rateLimit";
import { rememberSponsor, sponsorSession } from "@/lib/sponsor-session";
import { sendSponsorMail, sponsorInstructions, sponsorLink } from "@/lib/sponsorMail";
import { toPublic } from "@/lib/child";
import {demoMode} from "@/lib/demo";

export const dynamic = "force-dynamic";

const Body = z.object({
  childId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  gift: z.boolean().optional(),
  website: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  if (!allow(`claim:${clientIp(req)}`, 8, 10 * 60_000)) return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your name and email." }, { status: 400 });
  const b = parsed.data;
  if (b.website) return NextResponse.json({ ok: true, token: "x" }); // bots get a fake success

  const store = (await getCampaign()).store;
  try {
    const token = await store.claim({ childId: b.childId, name: b.name, email: b.email, phone: b.phone || null, gift: !!b.gift, sponsorToken: sponsorSession() });
    rememberSponsor(token);
    let emailStatus:"sent"|"unavailable"|"demo"=demoMode()?"demo":"unavailable";
    try {
      const all=await store.list(),row=all.find(c=>c.id===b.childId),link=sponsorLink(token);
      if(row&&link){const c=toPublic(row,all);emailStatus=await sendSponsorMail(b.email,`Gift & Glam: thank you for adopting ${c.code}`,`Hi ${b.name.split(" ")[0]},\n\nThank you for making Christmas brighter!\n\n${sponsorInstructions(c)}\n\nOpen your private My Angels checklist to mark purchased items and select Done shopping:\n${link}\n\nKeep this link private.`);}
    } catch { /* claim already succeeded; never turn an email failure into a failed claim */ }
    return NextResponse.json({ ok: true, token, emailStatus });
  } catch (e) {
    if (e instanceof CampaignError && e.code === "unavailable") return NextResponse.json({ error: "Someone just adopted this angel. Please pick another." }, { status: 409 });
    if (e instanceof CampaignError && e.code === "session") {
      return NextResponse.json({ error: "Open your private My Angels link and choose Browse the tree to adopt another angel on this device. If you lost the link, request a new one from My Angels." }, { status: 403 });
    }
    return NextResponse.json({ error: "We couldn't save that. Please try again." }, { status: 500 });
  }
}
