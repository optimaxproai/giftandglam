import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/Festive";
import { Ornament } from "@/components/Ornament";
import MineActions from "@/components/MineActions";
import { allChildren, sponsorByToken } from "@/lib/data";
import { toPublic, pad } from "@/lib/child";
import { DRIVE, daysUntil, giftDropOff } from "@/lib/drive";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Mine({ params }: { params: { token: string } }) {
  const sponsor = await sponsorByToken(params.token);
  if (!sponsor) notFound();
  const all = await allChildren();
  const mine = all.filter((c) => c.sponsor_id === sponsor.id);
  const dl = daysUntil(DRIVE.returnBy);

  return (
    <SiteShell>
      <div className="page-h">
        <div>
          <h2>My angels</h2>
          <p className="muted">Hello {sponsor.name.split(" ")[0]}. Return gifts unwrapped by <b>{DRIVE.returnByLabel}</b>{dl >= 0 ? ` (${dl} days left)` : ""}.</p>
        </div>
        <form action={`/mine/${params.token}/resume`} method="post">
          <button type="submit" className="btn ghost sm">Browse the tree</button>
        </form>
      </div>
      {mine.length > 0 && (
        <section className="panel" aria-labelledby="gift-drop-off" style={{ marginBottom: 16 }}>
          <h3 id="gift-drop-off">Gift Drop-Off</h3>
          <p style={{ whiteSpace: "pre-line" }}>{giftDropOff()}</p>
        </section>
      )}
      {mine.length === 0 ? (
        <div className="empty"><h3>No angels yet</h3><p>When you adopt an angel it shows up here.</p></div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
          {mine.map((row) => {
            const c = toPublic(row, all);
            const idx = STATUS_ORDER.indexOf(row.status);
            return (
              <div key={c.id} className="orn">
                <Ornament id={c.id} name={c.firstName} photo={c.hasPhoto} />
                <div className="no" style={{ textAlign: "center" }}>No. {pad(c.no)} · <span className={`pill ${row.status}`}>{STATUS_LABEL[row.status]}</span></div>
                <h3>{c.firstName}<span>{c.age != null ? `${c.age} · ` : ""}shirt {c.tops || "?"} · shoes {c.shoes || "?"}</span></h3>
                <div style={{ display: "flex", gap: 4 }} aria-hidden="true">
                  {STATUS_ORDER.slice(1).map((s, i) => <i key={s} style={{ flex: 1, height: 6, borderRadius: 99, background: i < idx ? "var(--pine)" : "var(--line)" }} />)}
                </div>
                <div className="two" style={{ fontSize: ".86rem" }}>
                  <div><b>Wants</b><ul className="list">{c.wants.map((w) => <li key={w}>{w}</li>)}</ul></div>
                  <div><b>Needs</b><ul className="list">{c.needs.map((w) => <li key={w}>{w}</li>)}</ul></div>
                </div>
                {c.gift && <div className="chips"><span className="chip gc">${c.gift.amount} {c.gift.store} gift card ({row.gift_card_status === "received" ? "received" : row.gift_card_status === "pledged" ? "pledged" : "optional"})</span></div>}
                {c.siblings.length > 0 && (
                  <p className="muted" style={{ fontSize: ".84rem", textAlign: "center" }}>
                    Siblings on the tree: {c.siblings.map((s) => <Link key={s.id} href={`/angel/${s.id}`}>{s.firstName}</Link>).reduce<React.ReactNode[]>((a, x, i) => (i ? [...a, ", ", x] : [x]), [])}
                  </p>
                )}
                <MineActions token={params.token} childId={c.id} status={row.status} />
              </div>
            );
          })}
        </div>
      )}
    </SiteShell>
  );
}
