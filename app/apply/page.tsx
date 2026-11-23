import { SiteShell } from "@/components/Festive";
import ApplyForm from "@/components/ApplyForm";
import { INTAKE_SEASON } from "@/lib/drive";
import { getIntake } from "@/lib/intake";
import type { Questionnaire } from "@/lib/intake/types";

export const dynamic = "force-dynamic";

export default async function Apply() {
  let form: Questionnaire | null = null;
  let failed = false;
  try {
    form = await (await getIntake()).published(INTAKE_SEASON);
  } catch {
    failed = true;
  }
  return (
    <SiteShell>
      <div className="page-h">
        <div>
          <h2>Family application {INTAKE_SEASON}</h2>
          <p className="muted" style={{ maxWidth: "62ch" }}>Tell us about your household and each child. One application covers everyone in your home. The organizers read every one.</p>
        </div>
      </div>
      {form ? (
        <div style={{ maxWidth: 760 }}><ApplyForm questions={form.questions} /></div>
      ) : (
        <div className="empty">
          <h3>{failed ? "We can't load the application right now" : "Applications are not open yet"}</h3>
          <p>{failed ? "Please try again in a few minutes." : "Check back soon. The organizers will announce when they open."}</p>
        </div>
      )}
    </SiteShell>
  );
}
