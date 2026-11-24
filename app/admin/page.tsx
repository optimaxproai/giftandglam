import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import { requireAdmin } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";
import { DRIVE, daysUntil } from "@/lib/drive";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/types";
import { readGiftCards } from "@/lib/giftCards";

export const dynamic = "force-dynamic";

const COLOR: Record<string, string> = { available: "#c9d8d1", claimed: "#b3123b", purchased: "#e6b440", returned: "#2f9a6c", given: "#14573a" };

export default async function AdminHome() {
  await requireAdmin();
  const c = await getCampaign();
  const [rows, s] = await Promise.all([c.store.list(), c.summary()]);
  const tree = rows.filter((x) => x.approved);
  const count = Object.fromEntries(STATUS_ORDER.map((st) => [st, tree.filter((x) => x.status === st).length])) as Record<string, number>;
  const out = count.claimed + count.purchased;
  const gcAsk = tree.flatMap(readGiftCards).reduce((n, gift) => n + gift.amount, 0);
  const gcIn = tree.filter((x) => x.gift_card_status !== "none").flatMap(readGiftCards).reduce((n, gift) => n + gift.amount, 0);
  const gcPending = tree.filter((x) => x.gift_card_status === "pledged").flatMap(readGiftCards).length;
  const approvedNotPublished = s.approved - s.published;
  const dl = daysUntil(DRIVE.returnBy);

  return (
    <SiteShell admin>
      <div className="page-h">
        <h2>Drive overview</h2>
        <div className="acts"><Link href="/admin/households/new" className="btn">+ Enter a household</Link><Link href="/admin/households" className="btn ghost">Households</Link></div>
      </div>
      {!s.settings.maxAgeConfirmed && <div className="banner-warn">The season age limit starts at {s.settings.maxAge} and has not been confirmed. <Link href="/admin/households">Confirm it on the Households page</Link> before deciding anyone.</div>}
      <div className="kpis">
        <div className="kpi"><small>Households to review</small><b>{s.households.review}</b><span>{s.households.waiting} waiting on a family</span></div>
        <div className="kpi"><small>Set aside</small><b>{s.setAside}</b><span>{s.households.set_aside} households out of the queue</span></div>
        <div className="kpi"><small>On the tree</small><b>{s.published}</b><span>goal {DRIVE.goal} · {approvedNotPublished} approved, not published</span></div>
        <div className="kpi"><small>Sponsored</small><b>{s.sponsored}</b><span>{tree.length ? Math.round((s.sponsored / tree.length) * 100) : 0}% of the tree</span></div>
        <div className="kpi"><small>Gifts received</small><b>{s.giftsReceived}</b><span>{out} still with sponsors</span></div>
        <div className="kpi"><small>Gift cards</small><b>${gcIn}</b><span>of ${gcAsk} requested</span></div>
        <div className="kpi"><small>Return deadline</small><b>{dl >= 0 ? dl : "Past"}</b><span>{dl >= 0 ? `days to ${DRIVE.returnByLabel}` : `${DRIVE.returnByLabel} has passed`}</span></div>
      </div>
      <div className="cols">
        <div className="panel">
          <h3>Sponsorship and gift receipt</h3>
          <div className="bar" style={{ display: "flex", height: 14, marginTop: 14 }} role="img" aria-label="Pipeline">
            {STATUS_ORDER.map((st) => (count[st] && tree.length ? <i key={st} style={{ width: `${(count[st] / tree.length) * 100}%`, background: COLOR[st], borderRadius: 0 }} /> : null))}
          </div>
          <div style={{ display: "grid", gap: 6, marginTop: 14, fontSize: ".9rem" }}>
            {STATUS_ORDER.map((st) => (
              <div key={st} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i style={{ width: 11, height: 11, borderRadius: 3, background: COLOR[st], display: "inline-block" }} />
                {st === "returned" ? "Gifts received (checked in)" : STATUS_LABEL[st]}
                <b style={{ marginLeft: "auto" }}>{count[st]}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>Needs you</h3>
          <ul className="list" style={{ marginTop: 12, paddingLeft: 18 }}>
            {s.households.review > 0 && <li><b>{s.households.review} household{s.households.review === 1 ? "" : "s"}</b> need a decision. <Link href="/admin/households?state=review">Review</Link></li>}
            {s.ageFlags > 0 && <li><b>{s.ageFlags} child{s.ageFlags === 1 ? "" : "ren"}</b> with a missing or unclear age. <Link href="/admin/households?state=review">Fix</Link></li>}
            {approvedNotPublished > 0 && <li><b>{approvedNotPublished} approved</b> but not on the tree. <Link href="/admin/households?state=decided">Publish</Link></li>}
            {count.available > 0 && <li><b>{count.available} angels</b> still need a sponsor.</li>}
            {out > 0 && <li><b>{out} sponsors</b> have not returned gifts. <Link href="/admin/sponsors">Send reminders</Link></li>}
            {gcPending > 0 && <li><b>{gcPending} gift cards</b> pledged but not received. <Link href="/admin/children?filter=giftcard">Check in</Link></li>}
            {!s.households.review && !approvedNotPublished && !count.available && !out && !gcPending && <li className="muted">Nothing is waiting on you.</li>}
          </ul>
          <div className="acts" style={{ marginTop: 14 }}><Link className="btn sm ghost" href="/admin/print">Print labels</Link></div>
        </div>
      </div>
    </SiteShell>
  );
}
