import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import { requireAdmin } from "@/lib/auth";
import { INTAKE_SEASON } from "@/lib/drive";
import { getIntake } from "@/lib/intake";
import { asText, answerOf } from "@/lib/intake/card";
import type { AppStatus } from "@/lib/intake/types";

export const dynamic = "force-dynamic";

const TABS: [string, string][] = [["submitted", "Needs review"], ["needs_info", "Waiting on family"], ["approved", "Approved"], ["declined", "Declined"], ["", "All"]];
const LABEL: Record<AppStatus, string> = { submitted: "Needs review", needs_info: "More info requested", approved: "Approved", declined: "Declined" };
const PILL: Record<AppStatus, string> = { submitted: "purchased", needs_info: "late", approved: "available", declined: "neutral" };

export default async function Applications({ searchParams }: { searchParams: { status?: string } }) {
  await requireAdmin();
  const intake = await getIntake();
  const status = (["submitted", "needs_info", "approved", "declined"].includes(searchParams.status || "") ? searchParams.status : "") as AppStatus | "";
  const [list, counts] = await Promise.all([intake.queue(INTAKE_SEASON, status || undefined), intake.counts(INTAKE_SEASON)]);

  return (
    <SiteShell admin>
      <div className="page-h"><div><h2>{INTAKE_SEASON} applications</h2><p className="muted">One row per household. Open one to review, approve and publish.</p></div></div>
      <nav className="tabs" aria-label="Filter">
        {TABS.map(([k, label]) => (
          <Link key={k} href={k ? `/admin/applications?status=${k}` : "/admin/applications"} style={status === k ? { color: "var(--ink)", borderBottomColor: "var(--cran)" } : undefined}>
            {label}{k ? ` (${counts[k as AppStatus]})` : ""}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <div className="empty"><h3>Nothing here</h3><p>Applications appear here as soon as a family submits one.</p></div>
      ) : (
        <div className="tw">
          <table>
            <thead><tr><th>Household (private)</th><th>Children</th><th>Submitted</th><th>Form</th><th>Status</th><th>On the tree</th><th></th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td><b>{asText(answerOf(a.household, "parent_name")) || "(no name given)"}</b><br /><span className="muted">{asText(answerOf(a.household, "phone")) || asText(answerOf(a.household, "email"))}</span></td>
                  <td>{a.children.length}: {a.children.map((c) => asText(answerOf(c.answers, "child_name")).split(" ")[0] || "?").join(", ")}</td>
                  <td>{new Date(a.submittedAt).toLocaleDateString()}</td>
                  <td>v{a.questionnaireVersion}</td>
                  <td><span className={`pill ${PILL[a.status]}`}>{LABEL[a.status]}</span></td>
                  <td>{a.children.filter((c) => c.published).length} of {a.children.length}</td>
                  <td><Link className="btn sm" href={`/admin/applications/${a.id}`}>Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SiteShell>
  );
}
