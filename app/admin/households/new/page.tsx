import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import HouseholdForm from "@/components/admin/HouseholdForm";
import { requireAdmin } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";

export const dynamic = "force-dynamic";

export default async function NewHousehold() {
  await requireAdmin();
  const s = await (await getCampaign()).store.getSettings();
  return (
    <SiteShell admin>
      <div className="page-h">
        <div>
          <Link href="/admin/households" className="btn ghost sm">← Families</Link>
        </div>
      </div>
      <HouseholdForm maxAge={s.maxAge} confirmed={s.maxAgeConfirmed} />
    </SiteShell>
  );
}
