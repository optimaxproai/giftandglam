import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/Festive";
import { Ornament } from "@/components/Ornament";
import ClaimForm from "@/components/ClaimForm";
import { allChildren } from "@/lib/data";
import { toPublic, pad } from "@/lib/child";
import { DRIVE } from "@/lib/drive";

export const dynamic = "force-dynamic";

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="lbl" style={{ marginBottom: 4 }}>{title}</div>
      {items.length ? <ul className="list">{items.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="muted">None listed</p>}
    </div>
  );
}

export default async function AngelPage({ params }: { params: { id: string } }) {
  const all = await allChildren();
  const row = all.find((c) => c.id === params.id && c.approved);
  if (!row) notFound();
  const c = toPublic(row, all);

  return (
    <SiteShell>
      <div className="page-h">
        <Link href="/" className="btn ghost sm">← Back to the tree</Link>
      </div>
      <div className="cols">
        <div className="panel" style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <Ornament id={c.id} name="★" photo={false} big />
            <div>
              <span className="no">Angel</span>
              <h2 style={{ fontSize: "2.6rem", color: "var(--pine)" }}>{c.firstName}</h2>
              <p className="muted">{[c.age != null ? `${c.age} years old` : "", c.gender || ""].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="facts">
            {c.tops && <div className="fact"><small>Shirt</small>{c.tops}</div>}
            {c.bottoms && <div className="fact"><small>Pants</small>{c.bottoms}</div>}
            {c.shoes && <div className="fact"><small>Shoes</small>{c.shoes}</div>}
            {c.favColor && <div className="fact"><small>Favorite color</small>{c.favColor}</div>}
            {c.gift && <div className="fact"><small>Gift card extra</small>${c.gift.amount} {c.gift.store}</div>}
          </div>
          <div className="two">
            <List title="Wants" items={c.wants} />
            <List title="Needs" items={c.needs} />
          </div>
          {c.faves.length > 0 && <div className="chips">{c.faves.map((f) => <span key={f} className="chip">{f}</span>)}</div>}
          {c.siblings.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 8 }}>{c.firstName} also has siblings on the tree</h3>
              <p className="muted" style={{ marginBottom: 10, fontSize: ".88rem" }}>Sponsoring brothers and sisters together means one family opens gifts side by side.</p>
              <div className="sibs">
                {c.siblings.map((s) => (
                  <Link key={s.id} href={`/angel/${s.id}`} className="sib">
                    <Ornament id={s.id} name="★" photo={false} />
                    <div style={{ flex: 1 }}><b>{s.firstName}</b> <span className="muted">{s.age != null ? `· ${s.age}` : ""}</span></div>
                    <span className={`pill ${s.available ? "available" : "claimed"}`}>{s.available ? "Available" : "Sponsored"}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="panel">
          {c.available ? (
            <>
              <div className="ribbon" />
              <h3 style={{ marginBottom: 6 }}>Adopt {c.firstName}</h3>
              <p className="muted" style={{ marginBottom: 14, fontSize: ".88rem" }}>Return the gifts unwrapped by {DRIVE.returnByLabel}. The giveaway is {DRIVE.giveawayLabel}.</p>
              <ClaimForm childId={c.id} name={c.firstName} gift={c.gift} />
            </>
          ) : (
            <>
              <h3>{c.firstName} has a sponsor</h3>
              <p className="muted" style={{ margin: "8px 0 14px" }}>Thank you for looking. Another angel is waiting for you on the tree.</p>
              <Link href="/" className="btn">See available angels</Link>
            </>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
