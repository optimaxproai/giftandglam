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
    parentName: "Jordan Demo",
    phone: "404-555-0107",
    email: "jordan.demo@example.com",
    story: "This fictional household is testing the gift drive intake form.",
    children: [
      {
        fullName: "Rowan Demo",
        age: 8,
        gender: "Boy",
        tops: "Youth M",
        bottoms: "Youth 8",
        shoes: "Youth 2",
        wants: [
          "Space-themed jigsaw puzzle",
          "Watercolor pencils"
        ],
        needs: [
          "Insulated lunch bag"
        ],
        faves: [
          "Astronomy",
          "Painting"
        ],
        favColor: "Orange",
        giftStore: "",
        giftAmount: 25,
        photo: null
      },
      {
        fullName: "Piper Demo",
        age: 11,
        gender: "Girl",
        tops: "Youth L",
        bottoms: "Youth 12",
        shoes: "Youth 5",
        wants: [
          "Beginner origami kit",
          "Birdwatching guide"
        ],
        needs: [
          "Reusable water bottle"
        ],
        faves: [
          "Paper crafts",
          "Birdwatching"
        ],
        favColor: "Teal",
        giftStore: "",
        giftAmount: 25,
        photo: null
      }
    ]
  }
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
