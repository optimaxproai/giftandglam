import { SiteShell } from "@/components/Festive";
import AccountForm from "@/components/admin/AccountForm";
import { requireAdmin } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";
import SettingsBar from "@/components/admin/SettingsBar";

export const dynamic = "force-dynamic";

export default async function Account() {
  const u = await requireAdmin();
  const { settings } = await (await getCampaign()).summary();
  return (
    <SiteShell admin>
      <div className="page-h"><div><h2>Settings</h2><p className="muted">Signed in as {u.email}</p></div></div>
      <h3 style={{ marginBottom: 8 }}>Season settings</h3>
      <SettingsBar maxAge={settings.maxAge} confirmed={settings.maxAgeConfirmed} />
      <div className="cols" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <AccountForm />
        <div className="panel">
          <h3 style={{ marginBottom: 8 }}>Other ways in</h3>
          <ul className="list" style={{ paddingLeft: 18 }}>
            <li>Password (set it here).</li>
            <li>Email link, opened in the same browser.</li>
            <li>Email code, which works on any device.</li>
            <li>Forgot password on the sign-in page sends a reset link.</li>
          </ul>
          <form action="/auth/signout" method="post" style={{ marginTop: 16 }}><button className="btn ghost" type="submit">Sign out</button></form>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 6 }}>2027 season settings</h3>
        <p className="muted" style={{ marginBottom: 10 }}>Planned for next year. Nothing here is switched on yet, and none of it changes the 2026 drive.</p>
        <ul className="list" style={{ paddingLeft: 18 }}>
          <li><b>Family questionnaire:</b> editable questions with required flags, so families apply online instead of by email.</li>
          <li><b>Eligibility:</b> a maximum age (and other rules) set per season. The age limit above applies to the current drive.</li>
          <li><b>One application per household</b> with "Add another child", and a review queue to approve, request info or decline.</li>
          <li><b>Family communications</b> and coordinated volunteer sign-up.</li>
          <li><b>Year-over-year reporting</b> across seasons.</li>
        </ul>
      </div>
    </SiteShell>
  );
}
