import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUser } from "@/lib/auth";
import { demoMode } from "@/lib/demo";
import { parseRequests } from "@/lib/parseEmail";
import type { DraftFamily } from "@/lib/parseSchema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  pages: z.array(z.string().max(3_000_000)).max(8),
  text: z.string().max(60_000).default(""),
});

/** Canned, fictional answer so the import screen can be tried without an API key. */
const DEMO: DraftFamily[] = [
  {
    parentName: "Dana Whitfield",
    phone: "404-555-0123",
    email: "dana.whitfield@example.com",
    story: "Sample request. This year has been hard and a little extra help would mean a lot to my kids.",
    children: [
      { fullName: "Nia Whitfield", age: 16, gender: "Girl", tops: "Adult XS", bottoms: "Adult XS", shoes: "7", wants: ["Red glitter makeup brush set", "Lash clusters kit", "Candles", "Waist beads", "Perfume"], needs: ["Edge control", "Bras 34 B or C", "Socks", "Underwear", "Pajamas"], faves: [], favColor: "Red and black", giftStore: "Ulta", giftAmount: 25, photo: { page: 1, box: { x: 0.08, y: 0.1, w: 0.25, h: 0.2 } } },
      { fullName: "Trey Whitfield", age: 14, gender: "Boy", tops: "Boys 16", bottoms: "34", shoes: "9 1/2", wants: ["LEGO set", "Rhinestone bedazzling kit", "Wearable heated blanket", "Squishies"], needs: ["Hoodie, size large, black", "Underwear size 16 boys", "Socks", "Body care"], faves: [], favColor: "", giftStore: "Hot Topic", giftAmount: 25, photo: { page: 1, box: { x: 0.36, y: 0.1, w: 0.25, h: 0.2 } } },
      { fullName: "Tori Whitfield", age: 13, gender: "Girl", tops: "Adult XS", bottoms: "Adult XS", shoes: "6", wants: ["Pomegranate raspberry body wash and lotion", "Aesthetic school supplies", "Wooden book lamp", "Soft bean bag chair (blue)", "Yellow sweatshirt"], needs: ["Crew socks", "Underwear", "Sports bra", "Edge control", "Pajamas"], faves: [], favColor: "Blue", giftStore: "Miss A", giftAmount: 25, photo: { page: 1, box: { x: 0.64, y: 0.1, w: 0.25, h: 0.2 } } },
    ],
  },
];

export async function POST(req: Request) {
  if (!(await adminUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That file is too large or unreadable. Try fewer pages." }, { status: 400 });
  if (demoMode()) return NextResponse.json({ families: DEMO, demo: true });
  if (!parsed.data.pages.length && !parsed.data.text.trim()) return NextResponse.json({ error: "Nothing to read." }, { status: 400 });
  try {
    const families = await parseRequests(parsed.data);
    return NextResponse.json({ families });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't read that email" }, { status: 502 });
  }
}
