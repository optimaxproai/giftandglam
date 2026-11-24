import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUser } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";
import { CampaignError } from "@/lib/campaign/store";
import { FLYER_MAX_BYTES, SponsorContactSchema, type SponsorFlyer } from "@/lib/sponsorContacts";

export const dynamic = "force-dynamic";
const supportedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export async function GET(req: Request) {
  if (!(await adminUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const id = z.string().uuid().safeParse(new URL(req.url).searchParams.get("id"));
  if (!id.success) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  const flyer = await (await getCampaign()).store.sponsorFlyer(id.data);
  if (!flyer || !supportedTypes.has(flyer.flyer_type)) return NextResponse.json({ error: "No flyer found" }, { status: 404 });
  const extension = flyer.flyer_type === "application/pdf" ? "pdf" : flyer.flyer_type === "image/png" ? "png" : "jpg";
  return new Response(new Uint8Array(Buffer.from(flyer.flyer_data, "base64")), { headers: {
    "Content-Type": flyer.flyer_type,
    "Content-Disposition": `attachment; filename="sponsor-flyer.${extension}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}

export async function POST(req: Request) {
  if (!(await adminUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Couldn't read the form." }, { status: 400 });
  const field = (key: string) => String(form.get(key) || "");
  const id = z.string().uuid().nullable().safeParse(field("id") || null);
  const parsed = SponsorContactSchema.safeParse({
    name: field("name"), organization: field("organization"), email: field("email").trim(),
    phone: field("phone"), notes: field("notes"), links: form.getAll("links").filter((value) => typeof value === "string" && value.trim()),
  });
  if (!id.success || !parsed.success) return NextResponse.json({ error: parsed.success ? "Invalid sponsor." : parsed.error.issues[0].message }, { status: 400 });
  let flyer: SponsorFlyer | null | undefined = field("removeFlyer") === "true" ? null : undefined;
  const file = form.get("flyer");
  if (file && typeof file !== "string" && file.size > 0) {
    if (!supportedTypes.has(file.type) || file.size > FLYER_MAX_BYTES) return NextResponse.json({ error: "Choose a PDF, JPG or PNG flyer up to 2 MB." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const expected = file.type === "application/pdf" ? Buffer.from("%PDF-") : file.type === "image/png" ? Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) : Buffer.from([255, 216, 255]);
    if (!bytes.subarray(0, expected.length).equals(expected)) return NextResponse.json({ error: "The flyer isn't a valid file of that type." }, { status: 400 });
    flyer = { flyer_name: file.name.slice(0, 180), flyer_type: file.type, flyer_data: bytes.toString("base64") };
  }
  try {
    await (await getCampaign()).store.saveSponsorContact(id.data, parsed.data, flyer);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof CampaignError ? error.message : "Could not save sponsor. Please try again." }, { status: 422 });
  }
}
