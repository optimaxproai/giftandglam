import {NextResponse} from "next/server";
import {z} from "zod";
import {getCampaign} from "@/lib/campaign";
import {allow,clientIp} from "@/lib/rateLimit";

export const dynamic="force-dynamic";
const Body=z.object({purpose:z.enum(["store_gift_card","additional_angel_gifts","party_expenses","other"]),name:z.string().trim().min(1).max(120),email:z.string().trim().email().max(200),amount_cents:z.number().int().min(1).max(100000000).nullable(),method:z.enum(["PayPal","Zelle","Cash App","In person","Other"]).nullable(),details:z.string().trim().max(1000),website:z.string().max(500).optional()}).superRefine((v,ctx)=>{if(v.purpose==="other"&&(v.amount_cents!==null||v.method!==null||!v.details))ctx.addIssue({code:"custom",message:"Tell the organizers how you would like to help."});if(v.purpose!=="other"&&!v.method)ctx.addIssue({code:"custom",message:"Choose a donation method."});});
export async function POST(req:Request){if(!allow(`donation:${clientIp(req)}`,8,15*60_000))return NextResponse.json({error:"Too many requests. Please try again later."},{status:429});const p=Body.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:p.error.issues[0]?.message||"Please check the form."},{status:400});const {website,...input}=p.data;if(website)return NextResponse.json({ok:true});try{await (await getCampaign()).store.createDonationOffer(input);return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"Your offer could not be saved. Please contact the organizer directly."},{status:500});}}
