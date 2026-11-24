import { NextResponse } from "next/server";
import { z } from "zod";
import { getCampaign } from "@/lib/campaign";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
const Body = z.object({ token: z.string().regex(/^[a-z0-9]{8,80}$/), itemId: z.string().uuid(), purchased: z.boolean() });
export async function POST(req: Request) {
  if (!allow(`mine-gift:${clientIp(req)}`,100,10*60_000)) return NextResponse.json({error:"Please wait before trying again."},{status:429});
  const p=Body.safeParse(await req.json().catch(()=>null));
  if (!p.success) return NextResponse.json({error:"Check the gift selection."},{status:400});
  try {
    if (!await (await getCampaign()).store.setSponsorGift(p.data.token,p.data.itemId,p.data.purchased)) return NextResponse.json({error:"This gift cannot be changed. Refresh your list or contact the organizer."},{status:409});
    return NextResponse.json({ok:true});
  } catch { return NextResponse.json({error:"The gift didn't save. Please try again."},{status:500}); }
}
