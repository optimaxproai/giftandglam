import { NextResponse } from "next/server";
import { z } from "zod";
import { getCampaign } from "@/lib/campaign";
import { CampaignError } from "@/lib/campaign/store";
import { allow, clientIp } from "@/lib/rateLimit";
import { rememberSponsor, sponsorSession } from "@/lib/sponsor-session";
import { sendSponsorMail, sponsorInstructions, sponsorLink } from "@/lib/sponsorMail";
import { toPublic } from "@/lib/child";
import {demoMode} from "@/lib/demo";
import {campaignShareText} from "@/lib/campaignShare";

export const dynamic = "force-dynamic";

const Common = z.object({
  childId: z.string().uuid(),
  gift: z.boolean().optional(),
  website: z.string().optional(),
});
const Body = z.union([Common.extend({reuseSponsor:z.literal(true)}),Common.extend({
  reuseSponsor:z.literal(false).optional(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
})]);

export async function POST(req: Request) {
  if (!allow(`claim:${clientIp(req)}`, 8, 10 * 60_000)) return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your name and email." }, { status: 400 });
  const b = parsed.data;
  if (b.website) return NextResponse.json({ ok: true, token: "x" }); // bots get a fake success

  const store = (await getCampaign()).store;
  try {
    const session=sponsorSession();
    const saved=b.reuseSponsor===true&&session?await store.sponsorByToken(session):null;
    if(b.reuseSponsor===true&&!saved)return NextResponse.json({error:"Your sponsor session expired. Uncheck the saved-contact option or recover your private My Angels link."},{status:403});
    const contact=b.reuseSponsor===true?saved!:{name:b.name,email:b.email,phone:b.phone||null};
    const token = await store.claim({ childId: b.childId, name: contact.name, email: contact.email, phone: contact.phone, gift: !!b.gift, sponsorToken: session });
    rememberSponsor(token);
    let emailStatus:"sent"|"unavailable"|"demo"=demoMode()?"demo":"unavailable";
    try {
      const all=await store.list(),row=all.find(c=>c.id===b.childId),link=sponsorLink(token);
      if(row&&link){const c=toPublic(row,all);emailStatus=await sendSponsorMail(contact.email,`Gift & Glam: thank you for adopting ${c.code}`,`Hi ${contact.name.split(" ")[0]},\n\nThank you for making Christmas magical!\n\n${sponsorInstructions(c)}\n\nOpen your private My Angels checklist to mark purchased items and select Done shopping:\n${link}\n\nKeep this private link to yourself. Share only the public campaign message below.\n\n${campaignShareText()}`);}
    } catch { /* claim already succeeded; never turn an email failure into a failed claim */ }
    return NextResponse.json({ ok: true, token, emailStatus });
  } catch (e) {
    if (e instanceof CampaignError && e.code === "unavailable") return NextResponse.json({ error: "Someone just adopted this angel. Please pick another." }, { status: 409 });
    if (e instanceof CampaignError && e.code === "session") {
      return NextResponse.json({ error: "Open your private My Angels link and choose Adopt Another Angel to continue on this device. If you lost the link, request a new one from My Angels." }, { status: 403 });
    }
    return NextResponse.json({ error: "We couldn't save that. Please try again." }, { status: 500 });
  }
}
