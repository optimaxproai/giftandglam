import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import { requireAdmin } from "@/lib/auth";
import { allChildren } from "@/lib/data";
import { DRIVE, daysUntil } from "@/lib/drive";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/types";

export const dynamic = "force-dynamic";

const COLOR: Record<string, string> = { available: "#c9d8d1", claimed: "#b3123b", purchased: "#e6b440", returned: "#2f9a6c", given: "#14573a" };

export default async function AdminHome() {
  await requireAdmin();
  const all = await allChildren();
  const tree = all.filter((c) => c.approved);
  const drafts = all.length - tree.length;
  const count = Object.fromEntries(STATUS_ORDER.map((s) => [s, tree.filter((c) => c.status === s).length])) as Record<string, number>;
  const families = new Set(all.map((c) => c.family_id)).size;
  const out = count.claimed + count.purchased;
  const gcAsk = tree.filter((c) => c.gift_store).reduce((n, c) => n + (c.gift_amount || 0), 0);
  const gcIn = tree.filter((c) => c.gift_store && c.gift_card_status !== "none").reduce((n, c) => n + (c.gift_amount || 0), 0);
  const gcPending = tree.filter((c) => c.gift_card_status === "pledged").length;
  const dl = daysUntil(DRIVE.returnBy);

  return (
    <SiteShell admin>
      <div className="page-h">
        <h2>Drive overview</h2>
        <Link href="/admin/import" className="btn">Import family emails</Link>
      </div>
      <div className="kpis">
        <div className="kpi"><small>Angels on the tree</small><b>{tree.length}</b><span>goal {DRIVE.goal} · {families} families</span></div>
        <div className="kpi"><small>Sponsored</small><b>{tree.length - count.available}</b><span>{tree.length ? Math.round(((tree.length - count.available) / tree.length) * 100) : 0}% of the tree</span></div>
        <div className="kpi"><small>Gifts returned</small><b>{count.returned + count.given}</b><span>{out} still with sponsors</span></div>
        <div className="kpi"><small>Gift cards</small><b>${gcIn}</b><span>of ${gcAsk} requested</span></div>
        <div className="kpi"><small>Return deadline</small><b>{dl >= 0 ? dl : "Past"}</b><span>{dl >= 0 ? `days to ${DRIVE.returnByLabel}` : `${DRIVE.returnByLabel} has passed`}</span></div>
      </div>
      <div className="cols">
        <div className="panel">
          <h3>Where every angel stands</h3>
          <div className="bar" style={{ display: "flex", height: 14, marginTop: 14 }} role="img" aria-label="Pipeline">
            {STATUS_ORDER.map((s) => (count[s] && tree.length ? <i key={s} style={{ width: `${(count[s] / tree.length) * 100}%`, background: COLOR[s], borderRadius: 0 }} /> : null))}
          </div>
          <div style={{ display: "grid", gap: 6, marginTop: 14, fontSize: ".9rem" }}>
            {STATUS_ORDER.map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i style={{ width: 11, height: 11, borderRadius: 3, background: COLOR[s], display: "inline-block" }} />
                {STATUS_LABEL[s]}
                <b style={{ marginLeft: "auto" }}>{count[s]}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>Needs you</h3>
          <ul className="list" style={{ marginTop: 12, paddingLeft: 18 }}>
            {drafts > 0 && <li><b>{drafts} hidden draft{drafts === 1 ? "" : "s"}</b> waiting for review. <Link href="/admin/children?filter=draft">Review</Link></li>}
            {count.available > 0 && <li><b>{count.available} angels</b> still need a sponsor. <Link href="/admin/children?filter=available">See them</Link></li>}
            {out > 0 && <li><b>{out} sponsors</b> have not returned gifts. <Link href="/admin/sponsors">Send reminders</Link></li>}
            {gcPending > 0 && <li><b>{gcPending} gift cards</b> pledged but not received. <Link href="/admin/children?filter=giftcard">Check in</Link></li>}
            {!drafts && !count.available && !out && !gcPending && <li className="muted">Nothing is waiting on you.</li>}
          </ul>
        </div>
      </div>
    </SiteShell>
  );
}
