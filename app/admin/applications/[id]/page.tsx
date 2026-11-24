import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/Festive";
import ReviewActions from "@/components/admin/ReviewActions";
import { requireAdmin } from "@/lib/auth";
import { getIntake } from "@/lib/intake";
import { answerOf, asText } from "@/lib/intake/card";
import type { AnswerSnap } from "@/lib/intake/types";

export const dynamic = "force-dynamic";

function Answers({ items }: { items: AnswerSnap[] }) {
  return (
    <dl className="qa">
      {items.map((a) => {
        const v = Array.isArray(a.value) ? a.value.join("\n") : a.value;
        return (
          <div key={a.questionId}>
            <dt>{a.prompt}{a.required ? "" : " (optional)"}</dt>
            <dd>{v.trim() ? v : <span className="muted">No answer</span>}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export default async function ApplicationPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const app = await (await getIntake()).getApplication(params.id);
  if (!app) notFound();
  const parentName = asText(answerOf(app.household, "parent_name")) || "(no name given)";
  const kids = app.children.map((c) => ({ id: c.id, label: asText(answerOf(c.answers, "child_name")) || "(no name given)", code: c.code, published: c.published, card: c.card }));

  return (
    <SiteShell admin>
      <div className="page-h">
        <div>
          <Link href="/admin/applications" className="btn ghost sm">← All applications</Link>
          <h2 style={{ marginTop: 10 }}>{parentName}</h2>
          <p className="muted">Submitted {new Date(app.submittedAt).toLocaleString()} · questionnaire v{app.questionnaireVersion} · {app.children.length} child{app.children.length === 1 ? "" : "ren"}{app.reviewer ? ` · reviewed by ${app.reviewer}` : ""}</p>
        </div>
      </div>
      <div className="cols">
        <div style={{ display: "grid", gap: 16 }}>
          <div className="panel private">
            <h3 style={{ marginBottom: 10 }}>Household answers, as submitted</h3>
            <Answers items={app.household} />
          </div>
          {app.children.map((c, i) => (
            <div className="panel private" key={c.id}>
              <h3 style={{ marginBottom: 10 }}>Child {i + 1}{c.code ? ` · ${c.code}` : ""}</h3>
              <Answers items={c.answers} />
            </div>
          ))}
        </div>
        <ReviewActions id={app.id} status={app.status} note={app.reviewNote || ""} kids={kids} />
      </div>
    </SiteShell>
  );
}
