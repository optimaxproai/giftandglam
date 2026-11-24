import type { PublicChild } from "./types";

export type TreeGender = "boy" | "girl" | "other";
export type TreeFilters = { query: string; age: string; gender: string; availableOnly: boolean };

export function treeGender(gender: string | null): TreeGender {
  const normalized = gender?.trim().toLowerCase();
  if (normalized === "boy" || normalized === "male") return "boy";
  if (normalized === "girl" || normalized === "female") return "girl";
  return "other";
}

export function treeColor(child: Pick<PublicChild, "available" | "gender">, selected = false) {
  return selected || !child.available ? "gold" : treeGender(child.gender);
}

export function treeMatches(child: PublicChild, filters: TreeFilters): boolean {
  if (filters.availableOnly && !child.available) return false;
  if (filters.gender && treeGender(child.gender) !== filters.gender) return false;
  if (filters.age) {
    if (child.age === null) return false;
    const [low, high] = filters.age.split("-");
    if (child.age < Number(low) || (high && child.age > Number(high))) return false;
  }
  const query = filters.query.trim().toLowerCase();
  return !query || [child.code, ...child.wants, ...child.needs, ...child.faves].join(" ").toLowerCase().includes(query);
}

/** Deterministic positions for the full campaign; applying filters never moves the remaining ornaments. */
export function layoutAngelTree(count: number) {
  const rows = Math.max(1, Math.ceil((Math.sqrt(8 * count + 1) - 1) / 2));
  const deficit = rows * (rows + 1) / 2 - count;
  const points: { x: number; y: number }[] = [];
  for (let row = 0; row < rows && points.length < count; row++) {
    const slots = row + 1 - (row > 0 && row <= deficit ? 1 : 0);
    const y = rows === 1 ? 47 : rows <= 3 ? 29 + (row / (rows - 1)) * 45 : 19 + (row / (rows - 1)) * 62;
    const pitch = rows <= 3 ? 21 : 80 / (rows - 1);
    for (let col = 0; col < slots; col++) points.push({ x: 50 + (col - (slots - 1) / 2) * pitch, y });
  }
  return { points, rows, minWidth: Math.max(300, Math.ceil((rows - 1) * 54 / 0.8 + 68)), minHeight: Math.max(470, Math.ceil((rows - 1) * 64 / 0.62 + 24)) };
}
