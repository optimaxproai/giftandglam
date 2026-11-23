import { SiteShell } from "@/components/Festive";
import AccountForm from "@/components/admin/AccountForm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Account() {
  const u = await requireAdmin();
  return (
    <SiteShell admin>
      <div className="page-h"><div><h2>My account</h2><p className="muted">Signed in as {u.email}</p></div></div>
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
    </SiteShell>
  );
}
