import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { demoMode } from "@/lib/demo";
import { allow, clientIp } from "@/lib/rateLimit";
import { DRIVE, giftDropOff } from "@/lib/drive";
import { rememberSponsor, sponsorSession } from "@/lib/sponsor-session";

export const dynamic = "force-dynamic";

const Body = z.object({
  childId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  gift: z.boolean().optional(),
  website: z.string().optional(), // honeypot
});

async function sendConfirmation(to: string, name: string, token: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.ANGEL_FROM_EMAIL || "Angel Tree <angeltree@optimaxproai.com>",
        to,
        subject: "Thank you for sponsoring an angel",
        text: `Hi ${name.split(" ")[0]},\n\nThank you for sponsoring an angel. Open your wish lists and sizes here:\n${site}/mine/${token}\n\n${DRIVE.giftSuggestion}\n\nPlease return the gifts unwrapped by ${DRIVE.returnByLabel}.\n\nGift Drop-Off\n${giftDropOff()}\n\nThe gift drive giveaway is ${DRIVE.giveawayLabel}.`,
      }),
    });
  } catch {
    /* the claim already succeeded; the on-screen link is the source of truth */
  }
}

export async function POST(req: Request) {
  if (demoMode()) return NextResponse.json({ error: "Demo mode is read-only." }, { status: 403 });
  if (!allow(`claim:${clientIp(req)}`, 8, 10 * 60_000)) return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your name and email." }, { status: 400 });
  const b = parsed.data;
  if (b.website) return NextResponse.json({ ok: true, token: "x" }); // bots get a fake success

  const { data, error } = await db().rpc("claim_child", {
    p_child: b.childId,
    p_name: b.name,
    p_email: b.email,
    p_phone: b.phone || null,
    p_gift: !!b.gift,
    p_sponsor_token: sponsorSession(),
  });
  if (error) {
    if (error.message.includes("child_unavailable")) return NextResponse.json({ error: "Someone just adopted this angel. Please pick another." }, { status: 409 });
    if (error.message.includes("sponsor_session_required")) {
      return NextResponse.json({ error: "Open your private My Angels link and choose Browse the tree to adopt another angel on this device. If you lost the link, contact an organizer." }, { status: 403 });
    }
    return NextResponse.json({ error: "We couldn't save that. Please try again." }, { status: 500 });
  }
  const token = String(data);
  rememberSponsor(token);
  await sendConfirmation(b.email, b.name, token);
  return NextResponse.json({ ok: true, token });
}
