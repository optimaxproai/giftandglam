import { describe, expect, it } from "vitest";
import { demoChildren } from "./demo";
import { publicTree, toPublic } from "./child";

describe("public view of a child", () => {
  const all = demoChildren();
  const multi = all.find((c) => all.filter((x) => x.family_id === c.family_id).length > 1)!;

  it("never contains private values", () => {
    const secrets = all.flatMap((c) => [c.full_name, c.family?.parent_name, c.family?.phone, c.family?.email, c.sponsor?.name, c.sponsor?.email, c.sponsor?.token, c.organizer_notes].filter(Boolean) as string[]);
    const json = JSON.stringify(publicTree(all));
    for (const s of secrets) expect(json.includes(s), `leaked: ${s}`).toBe(false);
  });
  it("lists siblings by first name only", () => {
    const p = toPublic(multi, all);
    expect(p.siblings.length).toBeGreaterThan(0);
    expect(Object.keys(p.siblings[0]).sort()).toEqual(["age", "available", "firstName", "id"]);
  });
  it("never shows a photo publicly, even if the old public flag is set", () => {
    const shown = all.find((c) => c.photo_path && c.photo_public)!;
    expect(shown).toBeTruthy();
    expect(toPublic(shown, all).hasPhoto).toBe(false);
  });
  it("leaves drafts off the tree", () => {
    const draft = { ...all[0], approved: false };
    expect(publicTree([draft, ...all.slice(1)]).some((c) => c.id === draft.id)).toBe(false);
  });
});
