import { browserReviewAdoptions, getSponsorStore } from "@/lib/review-sponsorship";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteShell } from "@/components/Festive";
import { Ornament } from "@/components/Ornament";
import MineActions from "@/components/MineActions";
import SponsorChecklist from "@/components/SponsorChecklist";
import { sponsorInstructions } from "@/lib/sponsorMail";
import { toPublic, pad } from "@/lib/child";
import { DRIVE, daysUntil, giftDropOff } from "@/lib/drive";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title:"My Angels | Gift & Glam",referrer:"no-referrer" as const };

export default async function Mine({ params, searchParams }: { params: { token: string }; searchParams?: { already?: string } }) {
  const store = await getSponsorStore();
  const sponsor = await store.sponsorByToken(params.token);
  if (!sponsor) {
    if (browserReviewAdoptions()) redirect("/mine?preview=expired");
    notFound();
  }
  const all = await store.list();
  const mine = all.filter((c) => c.sponsor_id === sponsor.id);
  const gifts=await store.listGiftItems(mine.map(c=>c.id));
  const dl = daysUntil(DRIVE.returnBy);

  return (
    <SiteShell>
      {searchParams?.already === "1" && <p className="ok" role="status" style={{ marginBottom: 14 }}>You already adopted this angel. Your checklist is below.</p>}
      <div className="page-h">
        <div>
          <h2>My Angels</h2>
          <p className="muted">{sponsor.name === "Anonymous sponsor" ? "Thank you for sponsoring." : `Hello ${sponsor.name.split(" ")[0]}.`} Return gifts unwrapped by <b>{DRIVE.returnByLabel}</b>{dl >= 0 ? ` (${dl} days left)` : ""}.</p>
        </div>
        <form action={`/mine/${params.token}/resume`} method="post">
          <button type="submit" className="btn ghost sm">Adopt Another Angel</button>
        </form>
      </div>
      {mine.length > 0 && (
        <section className="panel" aria-labelledby="gift-drop-off" style={{ marginBottom: 16 }}>
          <h3 id="gift-drop-off">Gift Drop-Off</h3>
          <p style={{ whiteSpace: "pre-line" }}>{giftDropOff()}</p><p style={{marginTop:8}}>Giveaway: {DRIVE.giveawayLabel}. Return all gifts unwrapped, labelled with the angel code. If your plans change, <a href="mailto:paradigmgiftdrive@gmail.com">contact the organizer</a>.</p>
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
                <Ornament id={c.id} name="★" photo={false} />
                <div className="no" style={{ textAlign: "center" }}>Angel · <span className={`pill ${row.status}`}>{STATUS_LABEL[row.status]}</span></div>
                <h3 className="numeric-text">{c.firstName}<span>{c.age != null ? `${c.age} · ` : ""}shirt {c.tops || "?"} · shoes {c.shoes || "?"}</span></h3>
                <div style={{ display: "flex", gap: 4 }} aria-hidden="true">
                  {STATUS_ORDER.slice(1).map((s, i) => <i key={s} style={{ flex: 1, height: 6, borderRadius: 99, background: i < idx ? "var(--pine)" : "var(--line)" }} />)}
                </div>
                <SponsorChecklist token={params.token} items={gifts.filter(g=>g.child_id===c.id&&g.active)} editable={row.status==="claimed"||row.status==="purchased"} code={c.code} instructions={sponsorInstructions(c)}/>
                <p className="muted">Sizes: Shirt {c.tops||"?"} · Pants {c.bottoms||"?"} · Coat {c.coat_size || "Not provided"} · Shoes {c.shoes||"?"}</p>
                {c.siblings.some(s=>s.available) && (
                  <div className="muted" style={{ fontSize: ".84rem", textAlign: "center" }}>
                    Available siblings: {c.siblings.filter(s=>s.available).map(s=><form key={s.id} action={`/mine/${params.token}/resume`} method="post" style={{display:"inline-block",margin:4}}><input type="hidden" name="angel" value={s.firstName}/><button className="btn ghost sm">{s.firstName}</button></form>)}
                  </div>
                )}
                <div className="no-print"><MineActions token={params.token} childId={c.id} status={row.status} /></div>
              </div>
            );
          })}
        </div>
      )}
    </SiteShell>
  );
}
