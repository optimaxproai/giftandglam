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

export default async function Households({ searchParams }: { searchParams: { state?: string } }) {
  await requireAdmin();
  const c = await getCampaign();
  const [all, s] = await Promise.all([c.households(), c.summary()]);
  const state = (["review", "waiting", "decided", "set_aside"].includes(searchParams.state || "") ? searchParams.state : "") as HouseholdState | "";
  const list = all.filter((h) => !state || h.state === state);
  const maxAge = s.settings.maxAge;

  return (
    <SiteShell admin>
      <div className="page-h">
        <div><h2>Households</h2><p className="muted">Enter each printed email as one household, record a decision for every child, then publish approved angels.</p></div>
        <div className="acts">{reviewMode() && <ResetCampaign />}<Link className="btn" href="/admin/households/new">+ Enter a household</Link></div>
      </div>
      <SettingsBar maxAge={maxAge} confirmed={s.settings.maxAgeConfirmed} />
      <nav className="tabs" aria-label="Filter">
        {TABS.map(([k, label]) => (
          <Link key={k} href={k ? `/admin/households?state=${k}` : "/admin/households"} style={state === k ? { color: "var(--ink)", borderBottomColor: "var(--cran)" } : undefined}>
            {label}{k ? ` (${s.households[k as HouseholdState]})` : ` (${all.length})`}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <div className="empty"><h3>Nothing here</h3><p>{all.length ? "No households in this view." : "Enter the first household from a printed email."}</p></div>
      ) : (
        <div className="tw">
          <table>
            <thead><tr><th>Household (private)</th><th>Children</th><th></th></tr></thead>
            <tbody>
              {list.map((h) => (
                <tr key={h.family.id}>
                  <td><b>{h.family.parent_name}</b><br /><span className="muted">{h.family.phone || h.family.email}</span></td>
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
