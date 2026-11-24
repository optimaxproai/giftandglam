import { SiteShell } from "@/components/Festive";
import PrintClient, { type PrintItem } from "@/components/admin/PrintClient";
import { requireAdmin } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";
import { labelData } from "@/lib/print";

export const dynamic = "force-dynamic";

export default async function PrintPage() {
  await requireAdmin();
  const c = await getCampaign();
  const rows = await c.store.list();
  const items: PrintItem[] = rows.map((x) => {
    const l = labelData(x);
    return { id: x.id, code: l.code, family: l.family, gender: l.gender, age: l.age, published: x.approved, status: x.status, name: x.full_name, familyId: x.family_id, decision: x.decision };
  });
  const { labelStock } = await c.store.getSettings();
  return (
    <SiteShell admin>
      <div className="page-h">
        <div>
          <h2>Print angel labels</h2>
          <p className="muted">Organizer only. All requests are listed. Approve a child to assign their angel code and enable printing. Labels show the code, parent&apos;s last name, gender and age.</p>
        </div>
      </div>
      <PrintClient items={items} savedStock={labelStock} />
    </SiteShell>
  );
}
