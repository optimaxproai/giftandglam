import { NextResponse } from "next/server";
import { getCampaign } from "@/lib/campaign";
import { onTree } from "@/lib/child";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Counts only: no names, codes or contact details. Shows which database this deployment reads and how many angels pass the tree rule. */
export async function GET() {
  try {
    const rows = await (await getCampaign()).store.list();
    const host = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/^https?:\/\//, "").split(".")[0];
    return NextResponse.json(
      {
        env: process.env.VERCEL_ENV || "local",
        commit: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7),
        database: host ? `${host.slice(0, 6)}...` : "none",
        children: rows.length,
        published: rows.filter((c) => c.approved).length,
        onTree: rows.filter(onTree).length,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message.slice(0, 120) : "failed" }, { status: 500 });
  }
}
