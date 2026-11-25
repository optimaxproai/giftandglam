import { describe, expect, it } from "vitest";
import { layoutAngelTree, treeColor, treeGender, treeMatches } from "./treeLayout";
import type { PublicChild } from "./types";

const child = {
  id: "fictional-1", no: 1, code: "G26-001", firstName: "G26-001", age: 14, gender: "Girl",
  tops: "Youth L", bottoms: "Youth 12", shoes: "Youth 5", wants: ["Art kit"], needs: ["School supplies"], faves: ["Drawing"], favColor: null,
  gift: null, gifts: [], available: true, status: "available", hasPhoto: false, siblings: [],
} as PublicChild;
const all = { query: "", age: "", gender: "", availableOnly: false };

describe("interactive angel tree", () => {
  it("gives each approved public angel one stable, distinct position, including zero and dense trees", () => {
    for (const count of [0, 1, 2, 3, 6, 7, 28, 29, 60, 129]) {
      const a = layoutAngelTree(count);
      expect(a.points).toHaveLength(count);
      expect(new Set(a.points.map(({ x, y }) => `${x}:${y}`)).size).toBe(count);
      expect(a.points.every(({ x, y }) => x >= 10 && x <= 90 && y >= 19 && y <= 81)).toBe(true);
      expect(layoutAngelTree(count)).toEqual(a);
    }
  });
  it("combines age, gender and case-insensitive wish/code search without excluding sponsored angels by default", () => {
    expect(treeMatches(child, { ...all, query: "ART KIT", age: "13-", gender: "girl" })).toBe(true);
    expect(treeMatches(child, { ...all, query: "g26-001" })).toBe(true);
    expect(treeMatches(child, { ...all, query: "school" })).toBe(true);
    expect(treeMatches(child, { ...all, age: "0-8" })).toBe(false);
    expect(treeMatches(child, { ...all, gender: "boy" })).toBe(false);
    expect(treeMatches({ ...child, age: null }, { ...all, age: "13-" })).toBe(false);
    expect(treeMatches({ ...child, available: false }, all)).toBe(true);
    expect(treeMatches({ ...child, available: false }, { ...all, availableOnly: true })).toBe(false);
  });
  it("assigns colors from gender and uses gold for selection or confirmed sponsorship", () => {
    expect(treeGender("Boy")).toBe("boy");
    expect(treeGender("Female")).toBe("girl");
    expect(treeGender(null)).toBe("other");
    expect(treeColor(child)).toBe("girl");
    expect(treeColor({ ...child, gender: "Boy" })).toBe("boy");
    expect(treeColor({ ...child, gender: "Other" })).toBe("other");
    expect(treeColor(child, true)).toBe("gold");
    expect(treeColor({ ...child, available: false })).toBe("gold");
  });
});
