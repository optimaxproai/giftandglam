import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import ResetCampaign from "@/components/admin/ResetCampaign";
import TreeToggle from "@/components/admin/TreeToggle";
import { requireAdmin } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";
import { ageFlag, DECISION_LABEL, DECISION_PILL, type HouseholdState } from "@/lib/campaign/rules";
import { reviewMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

const TABS: [string, string][] = [["review", "Needs review"], ["waiting", "Waiting on family"], ["decided", "Decided"], ["set_aside", "Set aside"], ["", "All"]];
const FLAG: Record<string, string> = { missing: "age missing", uncertain: "age unclear", over_age: "over age" };

export default async function Households({ searchParams }: { searchParams: { state?: string; q?: string } }) {
  await requireAdmin();
  const c = await getCampaign();
  const [all, s] = await Promise.all([c.households(), c.summary()]);
  const state = (["review", "waiting", "decided", "set_aside"].includes(searchParams.state || "") ? searchParams.state : "") as HouseholdState | "";
  const query = typeof searchParams.q === "string" ? searchParams.q.trim().slice(0, 200) : "";
  const list = all.filter((h) => (!state || h.state === state) && (!query || [h.family.parent_name, h.family.phone, h.family.email, ...h.children.flatMap((k) => [k.full_name, k.angel_code])].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase())));
  const maxAge = s.settings.maxAge;

  return (
    <SiteShell admin>
      <div className="page-h">
        <h2>Families</h2>
        <div className="acts">{reviewMode() && <ResetCampaign />}<Link className="btn" href="/admin/households/new">+ Add a family</Link></div>
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>Enter each printed email as one family, record a decision for every child, then publish approved angels.</p>
      <nav className="tabs" aria-label="Filter">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/households?${new URLSearchParams({ ...(k ? { state: k } : {}), ...(query ? { q: query } : {}) })}`} style={state === k ? { color: "var(--ink)", borderBottomColor: "var(--cran)" } : undefined}>
            {label}{k ? ` (${s.households[k as HouseholdState]})` : ` (${all.length})`}
          </Link>
        ))}
      </nav>
      <form className="toolbar" action="/admin/households" method="get" style={{ margin: "12px 0" }}>
        {state && <input type="hidden" name="state" value={state} />}
        <input type="search" aria-label="Search families" name="q" placeholder="Search parent, child, angel code, phone or email" defaultValue={query} maxLength={200} />
        <button className="btn sm" type="submit">Search</button>
        {query && <Link className="btn sm ghost" href={state ? `/admin/households?state=${state}` : "/admin/households"}>Clear</Link>}
      </form>
      {list.length === 0 ? (
        <div className="empty"><h3>Nothing here</h3><p>{all.length ? "No families in this view." : "Enter the first family from a printed email."}</p></div>
      ) : (
        <div className="tw">
          <table>
            <thead><tr><th>Parent or guardian</th><th>Contact</th><th>Child</th><th>Decision</th><th>Flags</th><th>On the tree</th></tr></thead>
            <tbody>
              {list.map((h) => h.children.map((k, i) => {
                const f = ageFlag(k, maxAge);
                return (
                  <tr key={k.id} className={i === 0 ? "fam-first" : undefined}>
                    {i === 0 && (
                      <>
                        <td rowSpan={h.children.length}><Link href={`/admin/households/${h.family.id}`}><b>{h.family.parent_name}</b></Link></td>
                        <td rowSpan={h.children.length}>{h.family.phone || "—"}<br /><span className="muted">{h.family.email || ""}</span></td>
                      </>
                    )}
                    <td>{k.first_name} <span className="muted">({k.age ?? "no age"})</span></td>
                    <td><span className={`pill ${DECISION_PILL[k.decision]}`}>{DECISION_LABEL[k.decision]}</span></td>
                    <td>
                      {f && k.decision !== "set_aside" ? <span className="pill late">{FLAG[f]}</span> : <span className="muted">—</span>}
                      {k.decision === "set_aside" && k.decision_reason && <div className="muted" style={{ fontSize: ".8rem" }}>{k.decision_reason}</div>}
                    </td>
                    <td><TreeToggle childId={k.id} on={k.approved} canPublish={k.decision === "approved" && !!k.angel_code} /></td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      )}
    </SiteShell>
  );
}
