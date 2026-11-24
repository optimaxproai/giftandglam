import { SiteShell } from "@/components/Festive";
import TreeBrowser from "@/components/TreeBrowser";
import { getPublicTree } from "@/lib/tree";
import type { PublicChild } from "@/lib/types";
import { DRIVE, daysUntil } from "@/lib/drive";

export const dynamic = "force-dynamic";

export default async function Home() {
  let kids: PublicChild[] = [];
  let failed = false;
  try {
    kids = await getPublicTree();
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
        <h1>
          {DRIVE.tagline.replace("this Christmas", "")}
          <em>this Christmas.</em>
        </h1>
        <p className="lead">
          Pick an angel, shop their wish list, and bring the gifts back unwrapped. Every card shows an angel code, an age and sizes only. Names and private details stay with the organizers.
        </p>
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
          <li><div><b>Choose an angel</b><span>Open a card and tap Adopt.</span></div></li>
          <li><div><b>Shop their wish list</b><span>Wants, needs and sizes are on every card.</span></div></li>
          <li><div><b>Return gifts unwrapped</b><span>By {DRIVE.returnByLabel}{dl >= 0 ? ` (${dl} day${dl === 1 ? "" : "s"} left)` : " (deadline passed)"}.</span></div></li>
          <li><div><b>Gift drive giveaway</b><span>{DRIVE.giveawayLabel}.</span></div></li>
        </ol>
      </div>
    </div>
  );

  return (
    <SiteShell hero={hero}>
      {failed && <div className="err" style={{ marginTop: 16 }}>The tree can&apos;t load right now. Please try again in a moment.</div>}
      <TreeBrowser kids={kids} />
    </SiteShell>
  );
}
