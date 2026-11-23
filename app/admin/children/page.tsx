import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import { Ornament } from "@/components/Ornament";
import StatusButtons from "@/components/admin/StatusButtons";
import { requireAdmin } from "@/lib/auth";
import { allChildren } from "@/lib/data";
import { pad } from "@/lib/child";
import { STATUS_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS: [string, string][] = [["", "All"], ["available", "Available"], ["claimed", "Sponsored"], ["purchased", "Gifts bought"], ["returned", "Returned"], ["given", "Given out"], ["giftcard", "Gift card pending"], ["draft", "Drafts"]];

export default async function Children({ searchParams }: { searchParams: { filter?: string } }) {
  await requireAdmin();
  const f = searchParams.filter || "";
  const all = await allChildren();
  const list = all.filter((c) => {
    if (f === "draft") return !c.approved;
    if (f === "giftcard") return c.gift_card_status === "pledged";
    if (f) return c.approved && c.status === f;
    return true;
  });
  const sibCount = (id: string) => all.filter((x) => x.family_id === id).length - 1;

  return (
    <SiteShell admin>
      <div className="page-h"><h2>Children</h2><Link href="/admin/import" className="btn">Import family emails</Link></div>
      <nav className="tabs" aria-label="Filter">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={k ? `/admin/children?filter=${k}` : "/admin/children"} style={f === k ? { color: "var(--ink)", borderBottomColor: "var(--cran)" } : undefined}>{label}</Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <div className="empty"><h3>Nothing here yet</h3><p>Import a family email to add the first children.</p></div>
      ) : (
        <div className="tw">
          <table>
            <thead><tr><th>Child</th><th>Family (private)</th><th>Status</th><th>Sponsor</th><th>Gift card</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/children/${c.id}`} style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none", color: "inherit" }}>
                      <span style={{ transform: "scale(.6)", transformOrigin: "left center", width: 44, flex: "none" }}><Ornament id={c.id} name={c.first_name} photo={!!c.photo_path} /></span>
                      <span><b>{c.full_name}</b><br /><span className="muted">No. {pad(c.no)} · {c.age ?? "?"} · {c.gender || ""}</span></span>
                    </Link>
                  </td>
                  <td>{c.family?.parent_name}<br /><span className="muted">{c.family?.phone}{sibCount(c.family_id) > 0 ? ` · ${sibCount(c.family_id)} sibling${sibCount(c.family_id) > 1 ? "s" : ""}` : ""}</span></td>
                  <td><span className={`pill ${c.status}`}>{STATUS_LABEL[c.status]}</span>{!c.approved && <><br /><span className="pill late">Draft</span></>}</td>
                  <td>{c.sponsor ? c.sponsor.name : <span className="muted">None</span>}</td>
                  <td>{c.gift_store ? <>{c.gift_store} ${c.gift_amount}<br /><span className="muted">{c.gift_card_status === "none" ? "Not pledged" : c.gift_card_status}</span></> : <span className="muted">None asked</span>}</td>
                  <td><StatusButtons id={c.id} status={c.status} gift={c.gift_card_status} compact /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SiteShell>
  );
}
