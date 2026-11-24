import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import ResetCampaign from "@/components/admin/ResetCampaign";
import SettingsBar from "@/components/admin/SettingsBar";
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
        <h2>Households</h2>
        <div className="acts">{reviewMode() && <ResetCampaign />}<Link className="btn" href="/admin/households/new">+ Enter a household</Link></div>
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>Enter each printed email as one household, record a decision for every child, then publish approved angels.</p>
      <SettingsBar maxAge={maxAge} confirmed={s.settings.maxAgeConfirmed} />
      <nav className="tabs" aria-label="Filter">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/households?${new URLSearchParams({ ...(k ? { state: k } : {}), ...(query ? { q: query } : {}) })}`} style={state === k ? { color: "var(--ink)", borderBottomColor: "var(--cran)" } : undefined}>
            {label}{k ? ` (${s.households[k as HouseholdState]})` : ` (${all.length})`}
          </Link>
        ))}
      </nav>
      <form className="toolbar" action="/admin/households" method="get" style={{ margin: "12px 0" }}>
        {state && <input type="hidden" name="state" value={state} />}
        <input type="search" aria-label="Search households" name="q" placeholder="Search parent, child, angel code, phone or email" defaultValue={query} maxLength={200} />
        <button className="btn sm" type="submit">Search</button>
        {query && <Link className="btn sm ghost" href={state ? `/admin/households?state=${state}` : "/admin/households"}>Clear</Link>}
      </form>
      {list.length === 0 ? (
        <div className="empty"><h3>Nothing here</h3><p>{all.length ? "No households in this view." : "Enter the first household from a printed email."}</p></div>
      ) : (
        <div className="tw">
          <table>
            <thead><tr><th>Parent or guardian</th><th>Contact</th><th>Children</th><th>Status</th><th>On tree</th><th></th></tr></thead>
            <tbody>
              {list.map((h) => (
                <tr key={h.family.id}>
                  <td><b>{h.family.parent_name}</b></td>
                  <td>{h.family.phone || "—"}<br /><span className="muted">{h.family.email || ""}</span></td>
                  <td>{h.children.length}</td>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      {h.children.map((k) => {
                        const f = ageFlag(k, maxAge);
                        return (
                          <div key={k.id}>
                            {k.first_name} <span className="muted">({k.age ?? "no age"})</span> <span className={`pill ${DECISION_PILL[k.decision]}`}>{DECISION_LABEL[k.decision]}</span>
                            {k.approved && <> <span className="pill available">On the tree</span></>}
                            {f && k.decision !== "set_aside" && <> <span className="pill late">{FLAG[f]}</span></>}
                            {k.decision === "set_aside" && k.decision_reason && <div className="muted" style={{ fontSize: ".8rem" }}>{k.decision_reason}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td>{h.children.filter((k) => k.approved).length} / {h.children.length}</td>
                  <td><Link className="btn sm" href={`/admin/households/${h.family.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SiteShell>
  );
}
