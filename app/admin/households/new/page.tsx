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
          <Link href="/admin/households" className="btn ghost sm">← Households</Link>
          <h2 style={{ marginTop: 10 }}>Enter a household</h2>
          <p className="muted" style={{ maxWidth: "62ch" }}>Type in one printed email: the parent first, then each child. Leave the age blank if the email does not give one; it will be flagged.</p>
        </div>
      </div>
      <div style={{ maxWidth: 900 }}><HouseholdForm maxAge={s.maxAge} confirmed={s.maxAgeConfirmed} /></div>
    </SiteShell>
  );
}
