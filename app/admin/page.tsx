import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import { requireAdmin } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";
import { DRIVE, daysUntil } from "@/lib/drive";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/types";
import { giftCounts } from "@/lib/giftItems";
import CampaignImpact from "@/components/CampaignImpact";
import {campaignImpact} from "@/lib/campaignImpact";

export const dynamic = "force-dynamic";

const COLOR: Record<string, string> = { available: "#c9d8d1", claimed: "#b3123b", purchased: "#e6b440", returned: "#2f9a6c", given: "#14573a" };

export default async function AdminHome() {
  await requireAdmin();
  const c = await getCampaign();
  const [rows, s, offers, items] = await Promise.all([c.store.list(), c.summary(),c.store.listDonationOffers(),c.store.listGiftItems()]);
  const tree = rows.filter((x) => x.approved);
  const count = Object.fromEntries(STATUS_ORDER.map((st) => [st, tree.filter((x) => x.status === st).length])) as Record<string, number>;
  const out = count.claimed + count.purchased;
  const approvedIds=new Set(rows.filter(x=>x.decision==="approved").map(x=>x.id));
  const active=items.filter(g=>g.active&&approvedIds.has(g.child_id));
  const gifts=giftCounts(active);
  const cards=active.filter(g=>g.kind==="gift_card");
  const gcAsk=cards.reduce((n,g)=>n+(g.amount||0),0);
  const gcIn=cards.filter(g=>g.received).reduce((n,g)=>n+(g.amount||0),0);
  const giftGaps=active.filter(g=>!g.received&&!g.purchase_source).length;
  const pendingOffers=offers.filter(o=>o.status==="pending").length;
  const approvedNotPublished = s.approved - s.published;
  const dl = daysUntil(DRIVE.returnBy);

  return (
    <SiteShell admin>
      <div className="page-h">
        <h2>Drive overview</h2>
        <div className="acts"><Link href="/admin/households/new" className="btn">+ Enter a household</Link><Link href="/admin/households" className="btn ghost">Households</Link><Link href="/admin/gifts" className="btn ghost">Gifts Management</Link></div>
      </div>
      {!s.settings.maxAgeConfirmed && <div className="banner-warn">The season age limit starts at {s.settings.maxAge} and has not been confirmed. <Link href="/admin/households">Confirm it on the Households page</Link> before deciding anyone.</div>}
      <div className="kpis">
        <Link className="kpi" href="/admin/households?state=review"><small>Households to review</small><b>{s.households.review}</b><span>{s.households.waiting} waiting on a family</span></Link>
        <Link className="kpi" href="/admin/children?filter=set_aside"><small>Set aside</small><b>{s.setAside}</b><span>{s.households.set_aside} households out of the queue</span></Link>
        <Link className="kpi" href="/admin/children?filter=tree"><small>On the tree</small><b>{s.published}</b><span>goal {DRIVE.goal} · {approvedNotPublished} approved, not published</span></Link>
        <Link className="kpi" href="/admin/children?filter=sponsored"><small>Sponsored</small><b>{s.sponsored}</b><span>{tree.length ? Math.round((s.sponsored / tree.length) * 100) : 0}% of the tree</span></Link>
        <Link className="kpi" href="/admin/gifts?filter=received"><small>Individual gifts received</small><b>{gifts.received}</b><span>of {gifts.total} requests</span></Link>
        <Link className="kpi" href="/admin/gifts?filter=gift-cards-received"><small>Gift cards received</small><b>${gcIn}</b><span>of ${gcAsk} requested</span></Link>
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
            {approvedNotPublished > 0 && <li><b>{approvedNotPublished} approved</b> but not on the tree. <Link href="/admin/children?filter=approved">Publish</Link></li>}
            {count.available > 0 && <li><b>{count.available} angels</b> still need a sponsor.</li>}
            {out > 0 && <li><b>{out} angels</b> have gifts still with sponsors. <Link href="/admin/sponsors">Follow up</Link></li>}
            {giftGaps>0&&<li><b>{giftGaps} gift requests</b> have no recorded purchase or receipt. <Link href="/admin/gifts">Review gifts</Link></li>}
            {pendingOffers>0&&<li><b>{pendingOffers} donation or volunteer offers</b> need follow-up. <Link href="/admin/donations">Review offers</Link></li>}
            {!s.households.review && !approvedNotPublished && !count.available && !out && !giftGaps&&!pendingOffers && <li className="muted">Nothing is waiting on you.</li>}
          </ul>
          <div className="acts" style={{ marginTop: 14 }}><Link className="btn sm ghost" href="/admin/print">Print labels</Link></div>
        </div>
      </div>
      <CampaignImpact totals={campaignImpact(rows,items,offers)}/>
    </SiteShell>
  );
}
