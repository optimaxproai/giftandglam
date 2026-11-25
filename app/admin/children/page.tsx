import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import ChildrenTable from "@/components/admin/ChildrenTable";
import { requireAdmin } from "@/lib/auth";
import { allChildren } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Children({ searchParams }: { searchParams: { filter?: string } }) {
  await requireAdmin();
  const children = await allChildren();
  const familySizes = new Map<string, number>();
  for (const c of children) familySizes.set(c.family_id, (familySizes.get(c.family_id) ?? 0) + 1);

  const rows = children.map((c) => ({
    id: c.id,
    name: c.full_name,
    firstName: c.first_name,
    photo: !!c.photo_path,
    code: c.angel_code,
    age: c.age,
    gender: c.gender,
    familyId: c.family_id,
    parent: c.family?.parent_name ?? "",
    phone: c.family?.phone ?? "",
    siblings: (familySizes.get(c.family_id) ?? 1) - 1,
    decision: c.decision,
    reason: c.decision_reason,
    onTree: c.approved,
    status: c.status,
    sponsor: c.sponsor?.name ?? "",
    giftCardStatus: c.gift_card_status,
  }));

  return (
    <SiteShell admin>
      <div className="page-h">
        <h2>Children</h2>
        <div className="acts">
          <Link href="/admin/households/new" className="btn">+ Enter a household</Link>
          <Link href="/admin/import" className="btn ghost">Import an email</Link>
        </div>
      </div>
      <ChildrenTable key={searchParams.filter ?? ""} rows={rows} initialFilter={searchParams.filter} />
    </SiteShell>
  );
}
