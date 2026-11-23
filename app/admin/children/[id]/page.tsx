import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/Festive";
import { Ornament } from "@/components/Ornament";
import ChildEditor from "@/components/admin/ChildEditor";
import StatusButtons from "@/components/admin/StatusButtons";
import { requireAdmin } from "@/lib/auth";
import { allChildren } from "@/lib/data";
import { pad } from "@/lib/child";
import { STATUS_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminChild({ params }: { params: { id: string } }) {
  await requireAdmin();
  const all = await allChildren();
  const c = all.find((x) => x.id === params.id);
  if (!c) notFound();
  const fam = c.family;
  const sibs = all.filter((x) => x.family_id === c.family_id && x.id !== c.id);

  return (
    <SiteShell admin>
      <div className="page-h">
        <div>
          <Link href="/admin/children" className="btn ghost sm">← All children</Link>
          <h2 style={{ marginTop: 10 }}>{c.full_name} <span className="muted" style={{ fontFamily: "var(--font-body)", fontSize: "1rem" }}>No. {pad(c.no)}</span></h2>
          <div className="chips" style={{ marginTop: 6 }}>
            <span className={`pill ${c.status}`}>{STATUS_LABEL[c.status]}</span>
            {!c.approved && <span className="pill late">Draft, not on the tree</span>}
            {c.approved && <Link href={`/angel/${c.id}`} className="chip">See the public page</Link>}
          </div>
        </div>
      </div>
      <div className="cols">
        <ChildEditor
          child={{ id: c.id, fullName: c.full_name, age: c.age, gender: c.gender, tops: c.tops || "", bottoms: c.bottoms || "", shoes: c.shoes || "", wants: c.wants, needs: c.needs, faves: c.faves, favColor: c.fav_color || "", giftStore: c.gift_store || "", giftAmount: c.gift_amount, photo: !!c.photo_path, photoPublic: c.photo_public, approved: c.approved, notes: c.organizer_notes || "" }}
          family={{ parentName: fam?.parent_name || "", phone: fam?.phone || "", email: fam?.email || "", story: fam?.story || "" }}
        />
        <div style={{ display: "grid", gap: 16 }}>
          <div className="panel private">
            <h3 style={{ marginBottom: 10 }}>{sibs.length ? `Other children in this family (${sibs.length})` : "Other children in this family"}</h3>
            {sibs.length === 0 ? (
              <p className="muted">{c.first_name} is the only child on this request. A second email from the same parent joins this family automatically when the phone or email matches.</p>
            ) : (
              <div className="sibs">
                {sibs.map((s) => (
                  <Link key={s.id} href={`/admin/children/${s.id}`} className="sib">
                    <Ornament id={s.id} name={s.first_name} photo={!!s.photo_path} />
                    <div style={{ flex: 1 }}><b>{s.full_name}</b> <span className="muted">{s.age != null ? `· ${s.age}` : ""}</span></div>
                    <span className={`pill ${s.status}`}>{STATUS_LABEL[s.status]}</span>
                  </Link>
                ))}
              </div>
            )}
            {fam && <p className="muted" style={{ marginTop: 10, fontSize: ".8rem" }}>Received {new Date(fam.created_at).toLocaleDateString()}{fam.source_label ? ` from ${fam.source_label}` : ""}</p>}
          </div>
          <div className="panel">
            <h3 style={{ marginBottom: 10 }}>Sponsor and gifts</h3>
            {c.sponsor ? (
              <>
                <p><b>{c.sponsor.name}</b></p>
                <p>{c.sponsor.email}</p>
                <p>{c.sponsor.phone || "No phone"}</p>
                <p className="muted" style={{ marginTop: 6, fontSize: ".85rem" }}>Adopted {c.claimed_at ? new Date(c.claimed_at).toLocaleDateString() : ""}</p>
              </>
            ) : (
              <p className="muted">No sponsor yet.</p>
            )}
            {c.gift_store && <p style={{ margin: "10px 0" }}>Gift card: ${c.gift_amount} {c.gift_store} ({c.gift_card_status === "none" ? "not pledged" : c.gift_card_status})</p>}
            <div style={{ marginTop: 12 }}><StatusButtons id={c.id} status={c.status} gift={c.gift_card_status} /></div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
