import { NextResponse } from "next/server";
import { z } from "zod";
import { getCampaign } from "@/lib/campaign";
import { allow, clientIp } from "@/lib/rateLimit";
import { normEmail } from "@/lib/families";
import { sendSponsorMail,sponsorLink } from "@/lib/sponsorMail";
import {createHash} from "crypto";

export const dynamic="force-dynamic";
const Body=z.object({email:z.string().trim().email().max(200),code:z.string().trim().max(32).optional().default("")});
const generic={ok:true,message:"If your details match a sponsorship account, a private access link will be emailed to the address on record. Check your spam folder or contact the organizer if it doesn't arrive."};
export async function POST(req:Request){
  if(!allow(`recover:${clientIp(req)}`,5,15*60_000)) return NextResponse.json({error:"Too many requests. Please try again later."},{status:429});
  const p=Body.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Enter your angel code and email address."},{status:400});
  try{
    const {email,code}=p.data;
    if(!allow(`recover-email:${createHash("sha256").update(normEmail(email)).digest("hex")}`,3,15*60_000))return NextResponse.json(generic);
    const store=(await getCampaign()).store;
    const sponsor=code?(await store.list()).find(c=>c.angel_code?.toUpperCase()===code.toUpperCase()&&c.sponsor&&normEmail(c.sponsor.email)===normEmail(email))?.sponsor:await store.sponsorByEmail(email);
    if(sponsor){const link=sponsorLink(sponsor.token);if(link)await sendSponsorMail(sponsor.email,"Gift & Glam: your private My Angels link",`Open your private shopping checklist and gift instructions:\n${link}\n\nKeep this link private. If you didn't request it, ignore this message.`);}
  }catch{/* Always generic so a public code cannot reveal a donor account. */}
  return NextResponse.json(generic);
}
