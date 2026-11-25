import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/Festive";
import HouseholdPanel, { type PChild } from "@/components/admin/HouseholdPanel";
import { requireAdmin } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";
import { ageFlag, DECISION_LABEL, DECISION_PILL } from "@/lib/campaign/rules";

export const dynamic = "force-dynamic";

export default async function HouseholdPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const c = await getCampaign();
  const h = (await c.households()).find((x) => x.family.id === params.id);
  if (!h) notFound();
  const { maxAge } = await c.store.getSettings();
  const kids: PChild[] = h.children.map((k) => ({
    id: k.id, name: k.full_name, code: k.angel_code, age: k.age, ageUnsure: k.age_uncertain, ageFlag: ageFlag(k, maxAge), gender: k.gender,
    decision: k.decision, decisionLabel: DECISION_LABEL[k.decision], pill: DECISION_PILL[k.decision], reason: k.decision_reason, published: k.approved,
    wants: k.wants, needs: k.needs, sizes: [k.tops && `shirt ${k.tops}`, k.bottoms && `pants ${k.bottoms}`, k.shoes && `shoes ${k.shoes}`].filter(Boolean).join(", "), status: k.status,
  }));
  return (
    <SiteShell admin>
      <div className="page-h">
        <div>
          <Link href="/admin/households" className="btn ghost sm">← Families</Link>
          <h2 style={{ marginTop: 10 }}>{h.family.parent_name}</h2>
          <p className="muted">{h.children.length} child{h.children.length === 1 ? "" : "ren"} · {h.family.source_label || "Printed email"} · season age limit {maxAge}</p>
        </div>
      </div>
      <div style={{ maxWidth: 900 }}>
        <HouseholdPanel family={{ id: h.family.id, parentName: h.family.parent_name, phone: h.family.phone || "", email: h.family.email || "", story: h.family.story || "" }} kids={kids} maxAge={maxAge} />
      </div>
    </SiteShell>
  );
}
