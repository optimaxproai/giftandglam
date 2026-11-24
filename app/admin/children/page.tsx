import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import { Ornament } from "@/components/Ornament";
import StatusButtons from "@/components/admin/StatusButtons";
import { requireAdmin } from "@/lib/auth";
import { allChildren } from "@/lib/data";
import { DECISION_LABEL, DECISION_PILL } from "@/lib/campaign/rules";
import { STATUS_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS: [string, string][] = [["", "All"], ["review", "Needs review"], ["approved", "Approved, not published"], ["tree", "On the tree"], ["available", "Needs a sponsor"], ["claimed", "Sponsored"], ["purchased", "Gifts bought"], ["received", "Gifts received"], ["giftcard", "Gift card pending"], ["set_aside", "Set aside"]];

export default async function Children({ searchParams }: { searchParams: { filter?: string } }) {
  await requireAdmin();
  const f = searchParams.filter || "";
  const all = await allChildren();
  const list = all.filter((c) => {
    if (f === "review") return c.decision === "pending";
    if (f === "approved") return c.decision === "approved" && !c.approved;
    if (f === "tree") return c.approved;
    if (f === "set_aside") return c.decision === "set_aside";
    if (f === "giftcard") return c.gift_card_status === "pledged";
    if (f === "received") return c.approved && (c.status === "returned" || c.status === "given");
    if (f) return c.approved && c.status === f;
    return true;
  });
  const sibCount = (id: string) => all.filter((x) => x.family_id === id).length - 1;

  return (
    <SiteShell admin>
      <div className="page-h"><h2>Children</h2><div className="acts"><Link href="/admin/households/new" className="btn">+ Enter a household</Link><Link href="/admin/import" className="btn ghost">Import an email</Link></div></div>
      <nav className="tabs" aria-label="Filter">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={k ? `/admin/children?filter=${k}` : "/admin/children"} style={f === k ? { color: "var(--ink)", borderBottomColor: "var(--cran)" } : undefined}>{label}</Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <div className="empty"><h3>Nothing here yet</h3><p>Enter a household from a printed email to add the first children.</p></div>
      ) : (
        <div className="tw">
          <table>
            <thead><tr><th>Child (private)</th><th>Family</th><th>Decision</th><th>Sponsorship</th><th>Gift receipt</th><th>Gift card</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/children/${c.id}`} style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none", color: "inherit" }}>
                      <span style={{ transform: "scale(.6)", transformOrigin: "left center", width: 44, flex: "none" }}><Ornament id={c.id} name={c.first_name} photo={!!c.photo_path} /></span>
                      <span><b>{c.full_name}</b><br /><span className="muted">{c.angel_code || "No code yet"} · {c.age ?? "no age"} · {c.gender || ""}</span></span>
                    </Link>
                  </td>
                  <td><Link href={`/admin/households/${c.family_id}`}>{c.family?.parent_name}</Link><br /><span className="muted">{c.family?.phone}{sibCount(c.family_id) > 0 ? ` · ${sibCount(c.family_id)} sibling${sibCount(c.family_id) > 1 ? "s" : ""}` : ""}</span></td>
                  <td><span className={`pill ${DECISION_PILL[c.decision]}`}>{DECISION_LABEL[c.decision]}</span>{c.approved && <><br /><span className="pill available">On the tree</span></>}{c.decision_reason && <div className="muted" style={{ fontSize: ".78rem", maxWidth: 220 }}>{c.decision_reason}</div>}</td>
                  <td>{c.approved ? <><span className={`pill ${c.status}`}>{STATUS_LABEL[c.status]}</span><br /><span className="muted">{c.sponsor ? c.sponsor.name : "No sponsor yet"}</span></> : <span className="muted">Not on the tree</span>}</td>
                  <td>{c.status === "returned" || c.status === "given" ? <><span className="pill returned">Received</span><br /><span className="muted">{c.returned_at ? new Date(c.returned_at).toLocaleDateString() : ""}</span></> : c.approved && c.sponsor ? <span className="muted">Not yet</span> : <span className="muted">—</span>}</td>
                  <td>{c.gift_store ? <>{c.gift_store} ${c.gift_amount}<br /><span className="muted">{c.gift_card_status === "none" ? "Not pledged" : c.gift_card_status}</span></> : <span className="muted">None asked</span>}</td>
                  <td>{c.approved ? <StatusButtons id={c.id} status={c.status} gift={c.gift_card_status} compact /> : <Link className="btn sm ghost" href={`/admin/households/${c.family_id}`}>Decide</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SiteShell>
  );
}
