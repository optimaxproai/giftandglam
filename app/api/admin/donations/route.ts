import {NextResponse} from "next/server";
import {z} from "zod";
import {adminUser} from "@/lib/auth";
import {getCampaign} from "@/lib/campaign";

export const dynamic="force-dynamic";
const Body=z.object({id:z.string().uuid(),status:z.enum(["pending","received","contacted","closed"]),received_cents:z.number().int().min(1).max(100000000).nullable(),organizer_notes:z.string().max(1000)}).refine(v=>v.status==="received"||v.received_cents===null,{message:"Record a received amount only after verification."});
export async function POST(req:Request){if(!await adminUser())return NextResponse.json({error:"Not signed in"},{status:401});const p=Body.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:p.error.issues[0]?.message||"Check the donation."},{status:400});const {id,...patch}=p.data;try{if(!await (await getCampaign()).store.updateDonationOffer(id,patch))return NextResponse.json({error:"Offer not found or invalid amount."},{status:409});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"The donation update could not be saved."},{status:400});}}
