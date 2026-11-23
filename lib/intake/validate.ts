import type { AnswerSnap, Question, Questionnaire } from "./types";

export type Value = string | string[] | undefined;
export type Submission = { household: Record<string, Value>; children: Record<string, Value>[] };
export type SubmissionErrors = { form?: string; household: Record<string, string>; children: Record<string, string>[] };

export const LIMITS = { text: 300, longtext: 3000, listItems: 40, listItem: 200, children: 8, questions: 40, options: 12 };

export function toList(v: Value): string[] {
  const raw = Array.isArray(v) ? v : String(v ?? "").split("\n");
  return raw.map((s) => String(s).trim()).filter(Boolean);
}

type Norm = { empty: boolean; value: string | string[]; error?: string };

function normalize(q: Question, v: Value): Norm {
  if (q.type === "list") {
    const items = toList(v);
    if (items.length > LIMITS.listItems) return { empty: false, value: items, error: `Please list no more than ${LIMITS.listItems} items.` };
    if (items.some((i) => i.length > LIMITS.listItem)) return { empty: false, value: items, error: `Each line can be up to ${LIMITS.listItem} characters.` };
    return { empty: items.length === 0, value: items };
  }
  const s = Array.isArray(v) ? v.join(" ").trim() : String(v ?? "").trim();
  if (q.type === "number") {
    if (!s) return { empty: true, value: "" };
    const n = Number(s);
    if (!Number.isFinite(n)) return { empty: false, value: s, error: "Enter a number." };
    if (q.key === "age" && (!Number.isInteger(n) || n < 0 || n > 21)) return { empty: false, value: s, error: "Enter an age from 0 to 21." };
    if (n < 0 || n > 9999) return { empty: false, value: s, error: "Enter a number between 0 and 9999." };
    return { empty: false, value: String(n) };
  }
  if (q.type === "choice") {
    if (!s) return { empty: true, value: "" };
    if (!(q.options || []).includes(s)) return { empty: false, value: s, error: "Choose one of the options." };
    return { empty: false, value: s };
  }
  const max = q.type === "longtext" ? LIMITS.longtext : LIMITS.text;
  if (s.length > max) return { empty: false, value: s, error: `Please keep this under ${max} characters.` };
  return { empty: s === "", value: s };
}

function snap(q: Question, value: string | string[]): AnswerSnap {
  return { questionId: q.id, key: q.key, scope: q.scope, prompt: q.prompt, type: q.type, required: q.required, options: q.options, value };
}

/**
 * Checks a household application against a questionnaire. Required questions block it.
 * On success, returns the answers with each question's wording copied in as submitted.
 */
export function validateSubmission(qn: Pick<Questionnaire, "questions">, input: Submission) {
  const errors: SubmissionErrors = { household: {}, children: [] };
  const hq = qn.questions.filter((q) => q.scope === "household");
  const cq = qn.questions.filter((q) => q.scope === "child");
  const children = Array.isArray(input?.children) ? input.children : [];
  if (children.length < 1) errors.form = "Add at least one child.";
  else if (children.length > LIMITS.children) errors.form = `You can add up to ${LIMITS.children} children on one application.`;

  const run = (qs: Question[], values: Record<string, Value>, into: Record<string, string>): AnswerSnap[] => {
    const out: AnswerSnap[] = [];
    for (const q of qs) {
      const n = normalize(q, values?.[q.id]);
      if (n.error) into[q.id] = n.error;
      else if (q.required && n.empty) into[q.id] = "This question is required.";
      out.push(snap(q, n.value));
    }
    return out;
  };

  const household = run(hq, input?.household || {}, errors.household);
  const kids = children.slice(0, LIMITS.children).map((c) => {
    const e: Record<string, string> = {};
    errors.children.push(e);
    return run(cq, c || {}, e);
  });
  const ok = !errors.form && !Object.keys(errors.household).length && errors.children.every((e) => !Object.keys(e).length);
  return { ok, errors, household, children: kids };
}

/** Structure checks for the editor. forPublish adds what the app needs to read and publish applications. */
export function validateQuestions(questions: Question[], opts: { forPublish: boolean }): string[] {
  const out: string[] = [];
  if (!Array.isArray(questions) || questions.length === 0) return ["Add at least one question."];
  if (questions.length > LIMITS.questions) out.push(`A questionnaire can have up to ${LIMITS.questions} questions.`);
  const ids = new Set<string>();
  questions.forEach((q, i) => {
    const n = i + 1;
    if (!q.id || ids.has(q.id)) out.push(`Question ${n} has a duplicate or missing id.`);
    ids.add(q.id);
    if (q.scope !== "household" && q.scope !== "child") out.push(`Question ${n} needs a section.`);
    if (!q.prompt?.trim()) out.push(`Question ${n} needs wording.`);
    else if (q.prompt.length > 300) out.push(`Question ${n}'s wording is over 300 characters.`);
    if (q.help && q.help.length > 300) out.push(`Question ${n}'s help text is over 300 characters.`);
    if (!["text", "longtext", "number", "choice", "list"].includes(q.type)) out.push(`Question ${n} has an unknown answer type.`);
    if (q.type === "choice") {
      const o = (q.options || []).map((x) => x.trim()).filter(Boolean);
      if (o.length < 2) out.push(`Question ${n} is a choice question and needs at least 2 options.`);
      if (o.length > LIMITS.options) out.push(`Question ${n} has more than ${LIMITS.options} options.`);
      if (new Set(o).size !== o.length) out.push(`Question ${n} has repeated options.`);
    }
  });
  if (opts.forPublish) {
    const has = (scope: string, key: string) => questions.some((q) => q.scope === scope && q.key === key);
    if (!has("household", "parent_name")) out.push("Keep a parent or guardian name question so the review queue can tell households apart.");
    if (!has("household", "phone") && !has("household", "email")) out.push("Keep a phone or email question so organizers can reach each household.");
    if (!has("child", "child_name")) out.push("Keep a child name question.");
    if (!questions.some((q) => q.scope === "child")) out.push("Add at least one child question.");
  }
  return out;
}
