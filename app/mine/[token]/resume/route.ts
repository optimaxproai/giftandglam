import { NextResponse } from "next/server";
import { sponsorByToken } from "@/lib/data";
import { rememberSponsor } from "@/lib/sponsor-session";

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const sponsor = await sponsorByToken(params.token);
  if (!sponsor) return new NextResponse("Not found", { status: 404 });

  rememberSponsor(sponsor.token);
  const url=new URL("/",request.url);
  const form=await request.formData().catch(()=>null);const angel=form?.get("angel");
  if(typeof angel==="string"&&/^G26-\d{3,8}$/.test(angel)){url.searchParams.set("angel",angel);url.hash="selected-angel";}
  else url.hash="find-your-angel";
  return NextResponse.redirect(url,303);
}
