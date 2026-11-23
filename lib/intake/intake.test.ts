import { describe, expect, it } from "vitest";
import { Q, defaultQuestions } from "./defaults";
import { createMemoryStore } from "./memory";
import { seedReview } from "./seed";
import { createIntake } from "./service";
import { ageRange, buildCard } from "./card";
import { validateQuestions } from "./validate";
import type { Question } from "./types";

const S = "2027";
const parent = { [Q.parentName]: "Pat Tester", [Q.phone]: "555-0199", [Q.email]: "pat@example.com", [Q.hardship]: "SECRET-HARDSHIP-TEXT" };
const kid = (name: string, age = "9") => ({ [Q.childName]: name, [Q.age]: age, [Q.wishes]: ["Bike", "Book"], [Q.needs]: ["Coat"], [Q.sizes]: "8 / 8 / 2", [Q.interests]: ["Art"] });

async function openForm() {
  const intake = createIntake(createMemoryStore());
  await intake.publish(S);
  return intake;
}

describe("required questions", () => {
  it("block an incomplete submission and store nothing", async () => {
    const intake = await openForm();
    const r = await intake.submit(S, { household: { ...parent, [Q.parentName]: "  " }, children: [{ ...kid("Kid One"), [Q.wishes]: [] }] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.household[Q.parentName]).toMatch(/required/i);
      expect(r.errors.children[0][Q.wishes]).toMatch(/required/i);
    }
    expect(await intake.queue(S)).toHaveLength(0);
  });

  it("an optional question may stay empty", async () => {
    const intake = await openForm();
    const r = await intake.submit(S, { household: parent, children: [{ ...kid("Kid One"), [Q.interests]: [] }] });
    expect(r.ok).toBe(true);
  });

  it("a question the organizer unticks Required no longer blocks", async () => {
    const intake = await openForm();
    const qs = defaultQuestions().map((q) => (q.id === Q.sizes ? { ...q, required: false } : q));
    await intake.saveDraft(S, qs);
    await intake.publish(S);
    const r = await intake.submit(S, { household: parent, children: [{ ...kid("Kid One"), [Q.sizes]: "" }] });
    expect(r.ok).toBe(true);
  });

  it("rejects an application with no children, and a bad age", async () => {
    const intake = await openForm();
    expect((await intake.submit(S, { household: parent, children: [] })).ok).toBe(false);
    expect((await intake.submit(S, { household: parent, children: [kid("Kid One", "40")] })).ok).toBe(false);
  });
});

describe("one application per household", () => {
  it("a two-child application reaches the review queue as one item", async () => {
    const intake = await openForm();
    const r = await intake.submit(S, { household: parent, children: [kid("Kid One", "8"), kid("Kid Two", "12")] });
    expect(r.ok).toBe(true);
    const q = await intake.queue(S, "submitted");
    expect(q).toHaveLength(1);
    expect(q[0].children).toHaveLength(2);
    expect(q[0].household.find((a) => a.key === "hardship")?.value).toBe("SECRET-HARDSHIP-TEXT");
    expect(q[0].children[1].answers.find((a) => a.key === "child_name")?.value).toBe("Kid Two");
  });
});

describe("questionnaire edits only affect future applications", () => {
  it("earlier answers keep their original wording and values", async () => {
    const intake = await openForm();
    const first = await intake.submit(S, { household: parent, children: [kid("Kid One")] });
    expect(first.ok).toBe(true);

    // Reword wishes, delete interests, add a new required question, publish v2.
    const extra: Question = { id: "q_new", scope: "household", prompt: "How did you hear about us?", type: "text", required: true };
    const edited = defaultQuestions()
      .filter((q) => q.id !== Q.interests)
      .map((q) => (q.id === Q.wishes ? { ...q, prompt: "REWORDED wishes question" } : q))
      .concat(extra);
    await intake.saveDraft(S, edited);
    const v2 = await intake.publish(S);
    expect(v2.version).toBe(2);

    const old = (await intake.queue(S))[0];
    expect(old.questionnaireVersion).toBe(1);
    expect(old.children[0].answers.find((a) => a.questionId === Q.wishes)?.prompt).toMatch(/^Wishes:/);
    expect(old.children[0].answers.find((a) => a.questionId === Q.interests)?.value).toEqual(["Art"]);
    expect(old.household.some((a) => a.questionId === "q_new")).toBe(false);

    // New applications use the new form: the new question is required, the deleted one is gone.
    const blocked = await intake.submit(S, { household: parent, children: [kid("Kid Two")] });
    expect(blocked.ok).toBe(false);
    const ok = await intake.submit(S, { household: { ...parent, q_new: "A friend" }, children: [kid("Kid Two")] });
    expect(ok.ok).toBe(true);
    const newest = (await intake.queue(S)).find((a) => a.questionnaireVersion === 2)!;
    expect(newest.children[0].answers.some((a) => a.questionId === Q.interests)).toBe(false);
    expect(newest.children[0].answers.find((a) => a.questionId === Q.wishes)?.prompt).toBe("REWORDED wishes question");
  });

  it("a draft is not live until published, and can be discarded", async () => {
    const intake = await openForm();
    await intake.saveDraft(S, defaultQuestions().map((q) => (q.id === Q.age ? { ...q, prompt: "DRAFT ONLY" } : q)));
    expect((await intake.published(S))!.questions.find((q) => q.id === Q.age)!.prompt).not.toBe("DRAFT ONLY");
    expect((await intake.editorState(S)).changed).toBe(true);
    await intake.discardDraft(S);
    expect((await intake.editorState(S)).changed).toBe(false);
  });

  it("refuses to publish a form that has lost the questions the queue relies on", () => {
    const noName = defaultQuestions().filter((q) => q.key !== "parent_name");
    expect(validateQuestions(noName, { forPublish: true }).join(" ")).toMatch(/parent or guardian name/i);
    expect(validateQuestions([{ id: "a", scope: "child", prompt: "Pick", type: "choice", options: ["x"], required: true }], { forPublish: false }).join(" ")).toMatch(/2 options/);
  });
});

describe("review, approval and publishing are separate", () => {
  it("approving does not publish; publishing needs approval; the card is shopping details only", async () => {
    const intake = await openForm();
    const r = await intake.submit(S, { household: parent, children: [kid("Kid One", "8")] });
    if (!r.ok) throw new Error("setup");
    const id = r.id;
    const childId = (await intake.getApplication(id))!.children[0].id;

    await expect(intake.review(id, "publish", { childId })).rejects.toThrow(/Approve the application first/);
    await intake.review(id, "approve");
    expect(await intake.treeCards(S)).toHaveLength(0); // approved, not published
    const app = (await intake.getApplication(id))!;
    expect(app.children[0].code).toBe("G27-001");

    await intake.review(id, "publish", { childId });
    const cards = await intake.treeCards(S);
    expect(cards).toHaveLength(1);
    const json = JSON.stringify(cards);
    for (const secret of ["Kid One", "Pat Tester", "555-0199", "pat@example.com", "SECRET-HARDSHIP-TEXT"]) expect(json.includes(secret), `leaked ${secret}`).toBe(false);
    expect(cards[0].card).toEqual({ ageRange: "7–9", wishes: ["Bike", "Book"], needs: ["Coat"], sizes: "8 / 8 / 2", interests: ["Art"] });

    await expect(intake.review(id, "decline")).rejects.toThrow(/Unpublish/);
    await intake.review(id, "unpublish", { childId });
    expect(await intake.treeCards(S)).toHaveLength(0);
  });

  it("request more information needs a note; decline keeps the application on record", async () => {
    const intake = await openForm();
    const r = await intake.submit(S, { household: parent, children: [kid("Kid One")] });
    if (!r.ok) throw new Error("setup");
    await expect(intake.review(r.id, "needs_info")).rejects.toThrow(/Write what you need/);
    await intake.review(r.id, "needs_info", { note: "Please confirm sizes." });
    expect((await intake.getApplication(r.id))!.status).toBe("needs_info");
    await intake.review(r.id, "decline", { note: "Outside our service area." });
    expect((await intake.queue(S, "declined"))).toHaveLength(1);
  });

  it("assigns sequential angel codes across households", async () => {
    const intake = await openForm();
    const a = await intake.submit(S, { household: parent, children: [kid("A1"), kid("A2")] });
    const b = await intake.submit(S, { household: parent, children: [kid("B1")] });
    if (!a.ok || !b.ok) throw new Error("setup");
    await intake.review(a.id, "approve");
    await intake.review(b.id, "approve");
    const codes = [...(await intake.getApplication(a.id))!.children, ...(await intake.getApplication(b.id))!.children].map((c) => c.code);
    expect(codes).toEqual(["G27-001", "G27-002", "G27-003"]);
  });
});

describe("review build data", () => {
  it("seeds an approved but unpublished angel, so the shared tree stays at one; publishing is a separate step", async () => {
    const intake = createIntake(createMemoryStore());
    await seedReview(intake, S);
    expect(await intake.treeCards(S)).toHaveLength(0);
    const c = await intake.counts(S);
    expect(c).toMatchObject({ submitted: 1, needs_info: 1, approved: 1 });
    const app = (await intake.queue(S, "approved"))[0];
    await intake.review(app.id, "publish_all");
    const cards = await intake.treeCards(S);
    expect(cards).toHaveLength(1);
    expect(cards[0].code).toBe("G27-001");
    expect(cards[0].card.ageRange).toBe("7–9");
    expect(JSON.stringify(cards)).not.toMatch(/Sample|Example|Placeholder|555-/);
  });
});

describe("card helpers", () => {
  it("bands ages", () => {
    expect([0, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19].map(ageRange)).toEqual(["0–3", "0–3", "4–6", "4–6", "7–9", "7–9", "10–12", "10–12", "13–15", "13–15", "16–18", "16–18", "19+"]);
  });
  it("caps interests at 3 and never reads names", () => {
    const answers = [
      { questionId: "x", key: "child_name" as const, scope: "child" as const, prompt: "n", type: "text" as const, required: true, value: "Hidden Name" },
      { questionId: "y", key: "interests" as const, scope: "child" as const, prompt: "i", type: "list" as const, required: false, value: ["a", "b", "c", "d"] },
    ];
    const c = buildCard(answers);
    expect(c.interests).toHaveLength(3);
    expect(JSON.stringify(c)).not.toContain("Hidden Name");
  });
});
