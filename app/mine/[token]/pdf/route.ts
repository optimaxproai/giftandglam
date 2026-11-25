import { NextResponse } from "next/server";
import { getSponsorStore } from "@/lib/review-sponsorship";
import { toPublic } from "@/lib/child";
import { buildGiftPdf } from "@/lib/giftPdf";

export const dynamic = "force-dynamic";

/** A sponsor's printable gift list. Verifies the private token AND that this sponsor owns the angel. */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const url = new URL(req.url);
  const code = url.searchParams.get("angel") || "";
  if (!/^[a-z0-9]{8,80}$/i.test(params.token)) return new NextResponse("Not found", { status: 404 });
  const store = await getSponsorStore();
  const sponsor = await store.sponsorByToken(params.token);
  if (!sponsor) return new NextResponse("Not found", { status: 404 });
  const all = await store.list();
  const row = all.find((c) => c.sponsor_id === sponsor.id && c.angel_code === code);
  if (!row) return new NextResponse("Not found", { status: 404 });
  const bytes = await buildGiftPdf(toPublic(row, all));
  const name = `Gift-and-Glam-${row.angel_code}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${url.searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="${name}"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
