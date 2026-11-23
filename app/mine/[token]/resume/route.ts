import { NextResponse } from "next/server";
import { sponsorByToken } from "@/lib/data";
import { demoMode } from "@/lib/demo";
import { rememberSponsor } from "@/lib/sponsor-session";

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const sponsor = await sponsorByToken(params.token);
  if (!sponsor) return new NextResponse("Not found", { status: 404 });

  if (!demoMode()) rememberSponsor(sponsor.token);
  return NextResponse.redirect(new URL("/", request.url), 303);
}
