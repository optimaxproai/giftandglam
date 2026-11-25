import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUser } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";

export const dynamic = "force-dynamic";
const Body = z.discriminatedUnion("action",[
  z.object({itemId:z.string().uuid(),action:z.literal("purchase"),source:z.enum(["sponsor","organizer","donation"]).nullable()}),
  z.object({itemId:z.string().uuid(),action:z.literal("received"),value:z.boolean()}),
  z.object({itemId:z.string().uuid(),action:z.literal("donation"),value:z.boolean()}),
]);
export async function POST(req: Request) {
  if (!await adminUser()) return NextResponse.json({error:"Not signed in"},{status:401});
  const p=Body.safeParse(await req.json().catch(()=>null));
  if (!p.success) return NextResponse.json({error:"Check the gift selection."},{status:400});
  try {
    if (!await (await getCampaign()).store.setAdminGift(p.data)) return NextResponse.json({error:"This gift is no longer active."},{status:409});
    return NextResponse.json({ok:true});
  } catch { return NextResponse.json({error:"The update did not save. Please try again."},{status:500}); }
}
