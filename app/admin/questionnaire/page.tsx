import { SiteShell } from "@/components/Festive";
import QuestionnaireEditor from "@/components/admin/QuestionnaireEditor";
import ResetReview from "@/components/admin/ResetReview";
import { requireAdmin } from "@/lib/auth";
import { INTAKE_SEASON } from "@/lib/drive";
import { getIntake } from "@/lib/intake";
import { reviewMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

export default async function QuestionnairePage() {
  await requireAdmin();
  const s = await (await getIntake()).editorState(INTAKE_SEASON);
  return (
    <SiteShell admin>
      <div className="page-h">
        <div>
          <h2>{INTAKE_SEASON} questionnaire</h2>
          <p className="muted" style={{ maxWidth: "64ch" }}>Edit the questions families answer. Changes stay in a draft until you publish. Published changes apply to new applications only; submitted applications keep the wording they were answered with.</p>
        </div>
        {reviewMode() && <ResetReview />}
      </div>
      <QuestionnaireEditor key={s.draft.updatedAt} initial={s.draft.questions} savedChanged={s.changed} publishedVersion={s.published?.version ?? null} draftVersion={s.draft.version} />
    </SiteShell>
  );
}
