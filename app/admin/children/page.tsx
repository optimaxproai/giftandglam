import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import ChildrenTable from "@/components/admin/ChildrenTable";
import { requireAdmin } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";
import GiftManagement from "@/components/admin/GiftManagement";

export const dynamic = "force-dynamic";

export default async function Children({ searchParams }: { searchParams: { filter?: string; view?: string } }) {
  await requireAdmin();
  const { store } = await getCampaign();
  const [children, gifts] = await Promise.all([store.list(), store.listGiftItems()]);
  const byGift = searchParams.view === "gift";
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
        <h2>Children &amp; Gifts</h2>
        <div className="acts">
          <Link href="/admin/households/new" className="btn">+ Add a family</Link>
          <Link href="/admin/import" className="btn ghost">Import an email</Link>
        </div>
      </div>
      <nav className="tabs" aria-label="Children and gifts views">
        <Link href="/admin/children" aria-current={byGift ? undefined : "page"} className={!byGift ? "active" : ""}>By Child</Link>
        <Link href="/admin/children?view=gift" aria-current={byGift ? "page" : undefined} className={byGift ? "active" : ""}>By Gift</Link>
      </nav>
      {byGift ? <GiftManagement key={searchParams.filter} gifts={gifts} initialFilter={searchParams.filter}
        angels={rows.map((row, index) => ({
          ...row, code: row.code || `Applicant ${children[index].no}`, published: row.onTree, sponsored: !!children[index].sponsor_id,
        }))} /> : <ChildrenTable key={searchParams.filter ?? ""} rows={rows} gifts={gifts} initialFilter={searchParams.filter} />}
    </SiteShell>
  );
}
