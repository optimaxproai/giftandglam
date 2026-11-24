import { SiteShell } from "@/components/Festive";
import InteractiveTree from "@/components/InteractiveTree";
import Link from "next/link";
import { allChildren } from "@/lib/data";
import { publicTree } from "@/lib/child";
import { DRIVE, daysUntil } from "@/lib/drive";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paradigm & Oh MyMy’s Gift & Glam — 10th Annual Holiday Giving Celebration" };

export default async function Home() {
  let kids: ReturnType<typeof publicTree> = [];
  let failed = false;
  try {
    kids = publicTree(await allChildren());
  } catch {
    failed = true;
  }
  const total = kids.length;
  const left = kids.filter((c) => c.available).length;
  const pct = total ? Math.round(((total - left) / total) * 100) : 0;
  const dl = daysUntil(DRIVE.returnBy);

  const hero = (
    <div className="hero">
      <div>
        <p style={{ color: "var(--gold)", fontWeight: 700, fontSize: "1.1rem", marginBottom: 10 }}>Paradigm &amp; Oh MyMy’s Gift &amp; Glam<br />10th Annual Holiday Giving Celebration</p>
        <h1>
          {DRIVE.tagline.replace("this Christmas", "")}
          <em>this Christmas.</em>
        </h1>
        <p className="lead">
          Pick an angel, shop their wish list, and bring the gifts back unwrapped. Each ornament shows a unique angel code. Names and private details stay with the organizers.
        </p>
        <Link href="/donate" className="btn gold" style={{ marginTop: 18 }}>♥ Donate to Gift &amp; Glam</Link>
      </div>
      <div className="tag">
        <div className="ribbon" />
        <div>
          <span className="bignum">{left}</span> <span className="muted">of {total} angels still need a sponsor</span>
        </div>
        <div className="bar" role="img" aria-label={`${pct} percent sponsored`}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <ol className="steps">
          <li><div><b>Choose an angel</b><span>Select an ornament and tap Adopt.</span></div></li>
          <li><div><b>Shop their wish list</b><span>Wants, needs and sizes are on every angel’s list.</span></div></li>
          <li><div><b>Return gifts unwrapped</b><span>By {DRIVE.returnByLabel}{dl >= 0 ? ` (${dl} day${dl === 1 ? "" : "s"} left)` : " (deadline passed)"}.</span></div></li>
          <li><div><b>Gift drive giveaway</b><span>{DRIVE.giveawayLabel}.</span></div></li>
        </ol>
      </div>
    </div>
  );

  return (
    <SiteShell hero={hero}>
      {failed && <div className="err" style={{ marginTop: 16 }}>The tree can&apos;t load right now. Please try again in a moment.</div>}
      <InteractiveTree kids={kids} />
    </SiteShell>
  );
}
