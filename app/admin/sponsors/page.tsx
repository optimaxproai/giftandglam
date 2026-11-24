import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import { requireAdmin } from "@/lib/auth";
import { allChildren } from "@/lib/data";
import { DRIVE, daysUntil } from "@/lib/drive";
import { pad } from "@/lib/child";
import { STATUS_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Sponsors() {
  await requireAdmin();
  const rows = (await allChildren()).filter((c) => c.sponsor).sort((a, b) => a.no - b.no);
  const dl = daysUntil(DRIVE.returnBy);

  return (
    <SiteShell admin>
      <div className="page-h">
        <div><h2>Sponsors</h2><p className="muted">Contact details are visible to organizers only. {dl >= 0 ? `${dl} days to the ${DRIVE.returnByLabel} return deadline.` : `The ${DRIVE.returnByLabel} deadline has passed.`}</p></div>
      </div>
      {rows.length === 0 ? (
        <div className="empty"><h3>No sponsors yet</h3><p>Sponsors appear here as soon as they adopt an angel.</p></div>
      ) : (
        <div className="tw">
          <table>
            <thead><tr><th>Sponsor</th><th>Contact</th><th>Angel</th><th>Status</th><th>Reminder text</th></tr></thead>
            <tbody>
              {rows.map((c) => {
                const open = c.status === "claimed" || c.status === "purchased";
                const first = c.sponsor!.name.split(" ")[0];
                return (
                  <tr key={c.id}>
                    <td><b>{c.sponsor!.name}</b></td>
                    <td>{c.sponsor!.phone || ""}<br />{c.sponsor!.email}</td>
                    <td><Link href={`/admin/children/${c.id}`}>{c.angel_code} {c.first_name}</Link></td>
                    <td><span className="pill claimed">{STATUS_LABEL[c.status]}</span></td>
                    <td style={{ maxWidth: 360, fontSize: ".82rem" }}>
                      {open ? <span className="muted">{`Hi ${first}, thank you for sponsoring Angel ${c.angel_code}. Gifts are due back unwrapped by ${DRIVE.returnByLabel}. Reply here if you need anything.`}</span> : <span className="muted">Done</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SiteShell>
  );
}
