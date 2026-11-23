import { randomUUID } from "crypto";
import { buildCard, cleanCard } from "./card";
import { defaultQuestions } from "./defaults";
import { IntakeError, type AppStatus, type Application, type IntakeStore, type PublicCard, type PublishedCard, type Question, type Questionnaire } from "./types";
import { validateQuestions, validateSubmission, type Submission } from "./validate";

const rid = (p: string) => `${p}_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export type ReviewAction = "approve" | "needs_info" | "decline" | "update_card" | "publish" | "unpublish" | "publish_all";

/** Business rules for the 2027 family intake. Storage is injected so tests and the review build use memory. */
export function createIntake(store: IntakeStore, now: () => Date = () => new Date()) {
  const iso = () => now().toISOString();

  async function published(season: string) {
    return (await store.listQuestionnaires(season)).find((q) => q.status === "published") ?? null;
  }

  async function draft(season: string): Promise<Questionnaire> {
    const all = await store.listQuestionnaires(season);
    const existing = all.find((q) => q.status === "draft");
    if (existing) return existing;
    const pub = all.find((q) => q.status === "published");
    const d: Questionnaire = {
      id: `draft-${season}`,
      season,
      status: "draft",
      version: Math.max(0, ...all.map((q) => q.version)) + 1,
      questions: pub ? pub.questions : defaultQuestions(),
      updatedAt: iso(),
    };
    await store.putQuestionnaire(d);
    return d;
  }

  async function editorState(season: string) {
    const d = await draft(season);
    const p = await published(season);
    return { draft: d, published: p, changed: !p || !same(d.questions, p.questions) };
  }

  async function saveDraft(season: string, questions: Question[]) {
    const errs = validateQuestions(questions, { forPublish: false });
    if (errs.length) throw new IntakeError(errs.join(" "));
    const d = await draft(season);
    const next = { ...d, questions, updatedAt: iso() };
    await store.putQuestionnaire(next);
    return next;
  }

  async function discardDraft(season: string) {
    const d = await draft(season);
    const p = await published(season);
    const next = { ...d, questions: p ? p.questions : defaultQuestions(), updatedAt: iso() };
    await store.putQuestionnaire(next);
    return next;
  }

  /** Publishing copies the draft into a new immutable version. Existing applications are not touched. */
  async function publish(season: string) {
    const d = await draft(season);
    const errs = validateQuestions(d.questions, { forPublish: true });
    if (errs.length) throw new IntakeError(errs.join(" "));
    const all = await store.listQuestionnaires(season);
    const cur = all.find((q) => q.status === "published");
    if (cur && same(cur.questions, d.questions)) throw new IntakeError("There are no changes to publish.", "conflict");
    const version = Math.max(0, ...all.filter((q) => q.status !== "draft").map((q) => q.version)) + 1;
    if (cur) await store.putQuestionnaire({ ...cur, status: "archived" });
    const pub: Questionnaire = { id: `qn_${season}_v${version}`, season, status: "published", version, questions: d.questions, updatedAt: iso(), publishedAt: iso() };
    await store.putQuestionnaire(pub);
    await store.putQuestionnaire({ ...d, version: version + 1 });
    return pub;
  }

  async function submit(season: string, input: Submission) {
    const pub = await published(season);
    if (!pub) throw new IntakeError("Applications are not open yet.", "closed");
    const v = validateSubmission(pub, input);
    if (!v.ok) return { ok: false as const, errors: v.errors };
    const app: Application = {
      id: rid("app"),
      season,
      questionnaireId: pub.id,
      questionnaireVersion: pub.version,
      status: "submitted",
      submittedAt: iso(),
      household: v.household,
      children: v.children.map((answers) => ({ id: rid("ch"), answers, published: false })),
    };
    await store.putApplication(app);
    return { ok: true as const, id: app.id };
  }

  async function queue(season: string, status?: AppStatus) {
    const all = await store.listApplications(season);
    return all.filter((a) => !status || a.status === status).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  async function counts(season: string) {
    const c: Record<AppStatus, number> = { submitted: 0, needs_info: 0, approved: 0, declined: 0 };
    (await store.listApplications(season)).forEach((a) => c[a.status]++);
    return c;
  }

  async function review(id: string, action: ReviewAction, opts: { note?: string; reviewer?: string; childId?: string; card?: Partial<PublicCard> } = {}) {
    const app = await store.getApplication(id);
    if (!app) throw new IntakeError("Application not found.", "not_found");
    const anyPublished = app.children.some((c) => c.published);
    const child = () => {
      const c = app.children.find((x) => x.id === opts.childId);
      if (!c) throw new IntakeError("Child not found.", "not_found");
      return c;
    };
    const needApproved = () => {
      if (app.status !== "approved") throw new IntakeError("Approve the application first. Approval and publishing are separate steps.", "conflict");
    };

    if (action === "approve") {
      if (app.status !== "approved") {
        const fresh = app.children.filter((c) => !c.code);
        const first = fresh.length ? await store.nextCodes(app.season, fresh.length) : 0;
        fresh.forEach((c, i) => (c.code = `G${app.season.slice(2)}-${String(first + i).padStart(3, "0")}`));
        app.children.forEach((c) => (c.card = c.card ?? buildCard(c.answers)));
      }
      app.status = "approved";
      app.reviewNote = opts.note?.trim() || undefined;
    } else if (action === "needs_info" || action === "decline") {
      if (anyPublished) throw new IntakeError("Unpublish this application's angels from the tree first.", "conflict");
      const note = opts.note?.trim() || "";
      if (action === "needs_info" && !note) throw new IntakeError("Write what you need to know so it is on record.");
      app.status = action === "decline" ? "declined" : "needs_info";
      app.reviewNote = note || undefined;
    } else if (action === "update_card") {
      needApproved();
      child().card = cleanCard(opts.card || {});
    } else if (action === "publish" || action === "unpublish") {
      needApproved();
      const c = child();
      if (action === "publish" && !c.card) throw new IntakeError("Add the approved shopping details first.", "conflict");
      c.published = action === "publish";
      c.publishedAt = c.published ? iso() : undefined;
    } else if (action === "publish_all") {
      needApproved();
      app.children.forEach((c) => {
        if (c.card && !c.published) {
          c.published = true;
          c.publishedAt = iso();
        }
      });
    }
    if (action === "approve" || action === "needs_info" || action === "decline") {
      app.decidedAt = iso();
      app.reviewer = opts.reviewer;
    }
    await store.putApplication(app);
    return app;
  }

  /** What the public tree may show: published children of approved applications, card only. */
  async function treeCards(season: string): Promise<PublishedCard[]> {
    const out: PublishedCard[] = [];
    for (const a of await store.listApplications(season)) {
      if (a.status !== "approved") continue;
      for (const c of a.children) if (c.published && c.code && c.card) out.push({ childId: c.id, applicationId: a.id, code: c.code, card: c.card });
    }
    return out.sort((x, y) => x.code.localeCompare(y.code));
  }

  return { published, editorState, saveDraft, discardDraft, publish, submit, queue, counts, review, treeCards, getApplication: (id: string) => store.getApplication(id) };
}

export type Intake = ReturnType<typeof createIntake>;
