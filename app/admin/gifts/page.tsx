import { SiteShell } from "@/components/Festive";
import { requireAdmin } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";
import GiftManagement from "@/components/admin/GiftManagement";

export const dynamic = "force-dynamic";
export default async function GiftsPage({ searchParams }: { searchParams: { filter?: string } }) {
  await requireAdmin();
  const {store}=await getCampaign();
  const [children,gifts]=await Promise.all([store.list(),store.listGiftItems()]);
  const angels=children.map(c=>({id:c.id,code:c.angel_code||`Applicant ${c.no}`,parent:c.family?.parent_name||"Not entered",familyId:c.family_id,age:c.age,gender:c.gender,decision:c.decision,published:c.approved,status:c.status,sponsored:!!c.sponsor_id,sponsor:c.sponsor?.name||""}));
  return <SiteShell admin><div className="page-h"><div><h2>Gifts Management</h2><p className="muted">One record per requested gift. Purchased, physically received, and covered by donations are separate.</p></div></div><GiftManagement key={searchParams.filter} angels={angels} gifts={gifts} initialFilter={searchParams.filter}/></SiteShell>;
}
