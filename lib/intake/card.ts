import type { AnswerSnap, PublicCard, StdKey } from "./types";
import { toList } from "./validate";

export const AGE_RANGES = ["0–3", "4–6", "7–9", "10–12", "13–15", "16–18", "19+"];

export function ageRange(age: number | null): string {
  if (age == null || !Number.isFinite(age) || age < 0) return "Not stated";
  if (age <= 3) return "0–3";
  if (age <= 6) return "4–6";
  if (age <= 9) return "7–9";
  if (age <= 12) return "10–12";
  if (age <= 15) return "13–15";
  if (age <= 18) return "16–18";
  return "19+";
}

/** Lowest age in a range label ("7–9" gives 7), used by the tree's age filter. */
export function ageLowOf(range: string): number | null {
  const m = range.match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}

export function answerOf(answers: AnswerSnap[], key: StdKey): string | string[] | undefined {
  return answers.find((a) => a.key === key)?.value;
}

export const asText = (v: string | string[] | undefined): string => (Array.isArray(v) ? v.join(", ") : (v ?? "")).trim();

/**
 * The public card is built only from the shopping answers (age range, wishes, needs, sizes, interests).
 * Names, contact details, photos and the hardship answer are never read here.
 */
export function buildCard(answers: AnswerSnap[]): PublicCard {
  const age = asText(answerOf(answers, "age"));
  return {
    ageRange: age === "" ? "Not stated" : ageRange(Number(age)),
    wishes: toList(answerOf(answers, "wishes")),
    needs: toList(answerOf(answers, "needs")),
    sizes: asText(answerOf(answers, "sizes")),
    interests: toList(answerOf(answers, "interests")).slice(0, 3),
  };
}

/** Normalizes what an organizer typed in the "approved shopping details" editor. */
export function cleanCard(c: Partial<PublicCard>): PublicCard {
  const list = (v: unknown, max: number) => toList(v as string[]).map((s) => s.slice(0, 200)).slice(0, max);
  const range = AGE_RANGES.includes(String(c.ageRange)) ? String(c.ageRange) : "Not stated";
  return { ageRange: range, wishes: list(c.wishes, 40), needs: list(c.needs, 40), sizes: String(c.sizes ?? "").trim().slice(0, 200), interests: list(c.interests, 3) };
}
