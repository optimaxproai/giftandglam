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
  name: z.string().trim().max(120).nullish(),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
})]);

export async function POST(req: Request) {
  if (!allow(`claim:${clientIp(req)}`, 8, 10 * 60_000)) return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please enter a valid email address and check any optional contact details." }, { status: 400 });
  const b = parsed.data;
  if (b.website) return NextResponse.json({ ok: true, token: "x" }); // bots get a fake success

  const store = (await getCampaign()).store;
  try {
    const session=sponsorSession();
    const saved = session ? await store.sponsorByToken(session) : null;
    if(b.reuseSponsor===true&&!saved)return NextResponse.json({error:"Your sponsor session expired. Uncheck the saved-contact option or recover your private My Angels link.",code:"session"},{status:403});
    const sameSponsor = b.reuseSponsor !== true && saved?.email.trim().toLowerCase() === b.email.toLowerCase()
      ? saved : null;
    const contact = b.reuseSponsor === true ? saved! : {
      name: b.name || sameSponsor?.name || "Anonymous sponsor",
      email: b.email,
      phone: b.phone || sameSponsor?.phone || null,
    };
    const token = await store.claim({ childId: b.childId, name: contact.name, email: contact.email, phone: contact.phone, gift: !!b.gift, sponsorToken: session });
    rememberSponsor(token);
    let emailStatus:"sent"|"unavailable"|"demo"=demoMode()?"demo":"unavailable";
    try {
      const all=await store.list(),row=all.find(c=>c.id===b.childId),link=sponsorLink(token);
      if(row&&link){const c=toPublic(row,all);emailStatus=await sendSponsorMail(contact.email,`Gift & Glam: thank you for adopting ${c.code}`,`${contact.name === "Anonymous sponsor" ? "Hello," : `Hi ${contact.name.split(" ")[0]},`}\n\nThank you for making Christmas magical!\n\n${sponsorInstructions(c)}\n\nOpen your private My Angels checklist to mark purchased items and select Done shopping:\n${link}\n\nKeep this private link to yourself. Share only the public campaign message below.\n\n${campaignShareText()}`);}
    } catch { /* claim already succeeded; never turn an email failure into a failed claim */ }
    return NextResponse.json({ ok: true, token, emailStatus });
  } catch (e) {
    if (e instanceof CampaignError && e.code === "unavailable") {
      // A retry after a lost confirmation: if THIS browser's verified sponsor session already owns the claim, say so.
      // The token returned is the caller's own session token, never one found by email.
      try {
        const session = sponsorSession();
        const sponsor = session ? await store.sponsorByToken(session) : null;
        const row = sponsor ? (await store.list()).find((c) => c.id === b.childId) : null;
        if (session && sponsor && row && row.sponsor_id === sponsor.id) return NextResponse.json({ ok: true, alreadyAdopted: true, token: session });
      } catch { /* fall through to the ordinary unavailable answer */ }
      return NextResponse.json({ error: "Someone just adopted this angel. Please pick another.", code: "unavailable" }, { status: 409 });
    }
    if (e instanceof CampaignError && e.code === "session") {
      return NextResponse.json({ error: "This email already has a sponsor account. Open your private My Angels link and choose Adopt Another Angel, or request a new link below.", code: "session" }, { status: 403 });
    }
    return NextResponse.json({ error: "We couldn't save that. Please try again." }, { status: 500 });
  }
}
