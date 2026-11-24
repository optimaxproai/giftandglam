import { describe, expect, it } from "vitest";
import { createCampaign } from "./service";
import { createMemoryStore } from "./store";
import { seedCampaignReview } from "./seed";
import { ageFlag, entryDecision, householdState } from "./rules";
import { publicTree, toPublic } from "../child";
import { CARDSTOCK, DEFAULT_CUSTOM_LAYOUT, STOCKS, customStock, defaultStock, labelData, lastName, paginate } from "../print";

const kid = (fullName: string, age: number | null, extra: Record<string, unknown> = {}) => ({ fullName, age, gender: "Girl" as const, wants: ["Bike"], needs: ["Coat"], faves: [], ...extra });
const fresh = () => {
  const store = createMemoryStore();
  return { store, c: createCampaign(store) };
};

describe("one season-wide maximum age", () => {
  it("sets aside an over-age child with a reason, and a lone over-age applicant leaves the active queue", async () => {
    const { c } = fresh();
    const r = await c.enterHousehold({ parentName: "Pat Tester", phone: "555-0100", kids: [kid("Only Child", 21)] });
    expect(r.children[0].decision).toBe("set_aside");
    expect(r.children[0].reason).toBe("Over the age limit: age 21, season limit 17.");
    const hs = await c.households();
    expect(hs[0].state).toBe("set_aside");
    expect(hs.filter((h) => h.state === "review")).toHaveLength(0);
    expect((await c.summary()).households).toMatchObject({ review: 0, set_aside: 1 });
  });

  it("keeps the eligible sibling in review and sets the over-age sibling aside", async () => {
    const { c } = fresh();
    await c.enterHousehold({ parentName: "Pat Tester", phone: "555-0100", kids: [kid("Eligible Kid", 9), kid("Old Sibling", 19)] });
    const [h] = await c.households();
    expect(h.state).toBe("review");
    expect(h.children.find((k) => k.first_name === "Eligible")!.decision).toBe("pending");
    const old = h.children.find((k) => k.first_name === "Old")!;
    expect(old.decision).toBe("set_aside");
    expect(old.set_aside_code).toBe("over_age");
  });

  it("changing the season limit moves open children and age-based set-asides, never decided or published ones", async () => {
    const { c } = fresh();
    const a = await c.enterHousehold({ parentName: "Pat", phone: "555-0100", kids: [kid("Twenty One", 21), kid("Fifteen", 15)] });
    const fifteen = a.children[1].id;
    await c.decide(fifteen, "approved");
    await c.publish(fifteen);
    expect((await c.saveMaxAge(21)).moved).toBe(1);
    let h = (await c.households())[0];
    expect(h.children.find((k) => k.first_name === "Twenty")!.decision).toBe("pending");
    await c.saveMaxAge(10); // the published 15-year-old is already decided: untouched
    h = (await c.households())[0];
    expect(h.children.find((k) => k.first_name === "Twenty")!.decision).toBe("set_aside");
    expect(h.children.find((k) => k.first_name === "Fifteen")!.decision).toBe("approved");
    expect((await c.summary()).settings.maxAgeConfirmed).toBe(true);
  });

  it("rules: boundary is inclusive and flags are exact", () => {
    expect(entryDecision(17, 17).decision).toBe("pending");
    expect(entryDecision(18, 17).decision).toBe("set_aside");
    expect(entryDecision(null, 17).decision).toBe("pending");
    expect(ageFlag({ age: null, age_uncertain: false }, 17)).toBe("missing");
    expect(ageFlag({ age: 12, age_uncertain: true }, 17)).toBe("uncertain");
    expect(ageFlag({ age: 40, age_uncertain: true }, 17)).toBe("over_age");
    expect(householdState([{ decision: "set_aside" }, { decision: "declined" }])).toBe("set_aside");
    expect(householdState([{ decision: "approved" }, { decision: "set_aside" }])).toBe("decided");
    expect(householdState([{ decision: "needs_info" }, { decision: "set_aside" }])).toBe("waiting");
  });
});

describe("missing or uncertain ages", () => {
  it("are flagged and block approval until fixed", async () => {
    const { c } = fresh();
    const r = await c.enterHousehold({ parentName: "Pat", phone: "555-0100", kids: [kid("No Age", null), kid("Maybe Twelve", 12, { ageUnsure: true })] });
    const [noAge, maybe] = r.children;
    await expect(c.decide(noAge.id, "approved")).rejects.toThrow(/Enter the age/);
    await expect(c.decide(maybe.id, "approved")).rejects.toThrow(/Confirm the age/);
    await c.setAge(noAge.id, 7, false);
    await c.decide(noAge.id, "approved");
    await c.confirmAge(maybe.id);
    await c.decide(maybe.id, "approved");
    expect((await c.store.list()).filter((k) => k.decision === "approved")).toHaveLength(2);
  });

  it("an age entered later that is over the limit sets the child aside automatically", async () => {
    const { c } = fresh();
    const r = await c.enterHousehold({ parentName: "Pat", phone: "555-0100", kids: [kid("No Age", null)] });
    await c.setAge(r.children[0].id, 30, false);
    const k = (await c.store.list())[0];
    expect(k.decision).toBe("set_aside");
    expect(k.set_aside_code).toBe("over_age");
  });
});

describe("decisions, approval and publishing are separate", () => {
  it("approval assigns the code but puts nothing on the tree; publishing is its own step", async () => {
    const { c, store } = fresh();
    const r = await c.enterHousehold({ parentName: "Pat Tester", phone: "555-0100", kids: [kid("Kid One", 8), kid("Kid Two", 10)] });
    await expect(c.publish(r.children[0].id)).rejects.toThrow(/Approve this child first/);
    await c.decide(r.children[0].id, "approved");
    await c.decide(r.children[1].id, "approved");
    const all = await store.list();
    expect(all.map((k) => k.angel_code)).toEqual(["G26-001", "G26-002"]);
    expect(publicTree(all)).toHaveLength(0);
    await c.publish(r.children[0].id);
    expect(publicTree(await store.list())).toHaveLength(1);
    await expect(c.decide(r.children[0].id, "declined", { reason: "x" })).rejects.toThrow(/Unpublish/);
    expect(await c.publishAll()).toBe(1);
    await c.unpublish(r.children[0].id);
    expect(publicTree(await store.list())).toHaveLength(1);
  });

  it("needs a reason for more info, decline and set aside; restore is blocked while over age", async () => {
    const { c } = fresh();
    const r = await c.enterHousehold({ parentName: "Pat", phone: "555-0100", kids: [kid("Kid One", 8), kid("Old", 30)] });
    await expect(c.decide(r.children[0].id, "needs_info")).rejects.toThrow(/Write what you need/);
    await expect(c.decide(r.children[0].id, "declined")).rejects.toThrow(/reason/);
    await c.decide(r.children[0].id, "needs_info", { reason: "Confirm sizes", by: "me" });
    await c.decide(r.children[0].id, "pending");
    await expect(c.decide(r.children[1].id, "pending")).rejects.toThrow(/Still over the age limit/);
  });

  it("will not approve a child with nothing to shop for", async () => {
    const { c } = fresh();
    const r = await c.enterHousehold({ parentName: "Pat", phone: "555-0100", kids: [kid("Empty", 8, { wants: [], needs: [] })] });
    await expect(c.decide(r.children[0].id, "approved")).rejects.toThrow(/want or need/);
  });

  it("joins a second entry to the same household by phone and skips a repeated child", async () => {
    const { c } = fresh();
    await c.enterHousehold({ parentName: "Pat Tester", phone: "(555) 010-0000", kids: [kid("Kid One", 8)] });
    const r = await c.enterHousehold({ parentName: "Pat Tester", phone: "555-010-0000", kids: [kid("Kid One", 8), kid("Kid Two", 5)] });
    expect(r.merged).toBe(true);
    expect(r.skipped).toEqual(["Kid One"]);
    expect(await c.households()).toHaveLength(1);
    expect((await c.store.list())).toHaveLength(2);
  });
});

describe("what the public can see", () => {
  it("shows codes only: no names, photos, contact details or hardship text, on the tree or among siblings", async () => {
    const { c, store } = fresh();
    const r = await c.enterHousehold({ parentName: "Pat Tester", phone: "555-0199", email: "pat@example.com", story: "SECRET-STORY", kids: [kid("Alpha Name", 8, { notes: "ORGANIZER-NOTE" }), kid("Beta Name", 10)] });
    for (const k of r.children) { await c.decide(k.id, "approved"); await c.publish(k.id); }
    await store.patchChild(r.children[0].id, { photo_path: "x.jpg", photo_public: true });
    const all = await store.list();
    const json = JSON.stringify(publicTree(all));
    for (const secret of ["Alpha Name", "Beta Name", "Alpha", "Beta", "Pat Tester", "Tester", "555-0199", "pat@example.com", "SECRET-STORY", "ORGANIZER-NOTE", "x.jpg"]) expect(json.includes(secret), `leaked ${secret}`).toBe(false);
    const p = toPublic(all[0], all);
    expect(p.code).toBe("G26-001");
    expect(p.hasPhoto).toBe(false);
    expect(p.siblings.map((s) => s.firstName)).toEqual(["G26-002"]);
  });

  it("the review seed puts exactly one fictional angel on the tree and covers every case", async () => {
    const store = createMemoryStore();
    const c = createCampaign(store);
    await seedCampaignReview(c);
    const tree = publicTree(await store.list());
    expect(tree).toHaveLength(1);
    expect(tree[0].code).toBe("G26-001");
    const s = await c.summary();
    expect(s.published).toBe(1);
    expect(s.approved).toBe(2); // one published, one approved but not yet published
    const hs = await c.households();
    expect(hs.find((h) => h.family.parent_name === "Avery Example")!.state).toBe("set_aside");
    expect(hs.find((h) => h.family.parent_name === "Quinn Placeholder")!.state).toBe("review");
    expect(s.ageFlags).toBe(2); // one missing, one uncertain
  });
});

describe("sponsorship and gift receipt", () => {
  it("claims once, rejects a second claim, ties a sponsor to their own session, and shows receipt", async () => {
    const { c, store } = fresh();
    const r = await c.enterHousehold({ parentName: "Pat", phone: "555-0100", kids: [kid("A", 8, { giftStore: "Target" }), kid("B", 9)] });
    for (const k of r.children) { await c.decide(k.id, "approved"); await c.publish(k.id); }
    const t = await store.claim({ childId: r.children[0].id, name: "Sam Sponsor", email: "sam@example.com", phone: null, gift: true, sponsorToken: null });
    await expect(store.claim({ childId: r.children[0].id, name: "Other", email: "o@example.com", phone: null, gift: false, sponsorToken: null })).rejects.toThrow(/child_unavailable/);
    await expect(store.claim({ childId: r.children[1].id, name: "Imposter", email: "SAM@example.com", phone: null, gift: false, sponsorToken: null })).rejects.toThrow(/sponsor_session_required/);
    await store.claim({ childId: r.children[1].id, name: "Sam Sponsor", email: "sam@example.com", phone: null, gift: false, sponsorToken: t });
    expect(await store.mineAction({ token: t, childId: r.children[0].id, action: "bought" })).toBe(true);
    await store.patchChild(r.children[0].id, { status: "returned", returned_at: new Date().toISOString() });
    const s = await c.summary();
    expect(s.sponsored).toBe(2);
    expect(s.giftsReceived).toBe(1);
  });
});

describe("batch print layouts", () => {
  it("takes the last name of a parent or guardian", () => {
    expect(lastName("LaShana Middleton")).toBe("Middleton");
    expect(lastName("Dana Whitfield Jr.")).toBe("Whitfield");
    expect(lastName("Cher")).toBe("Cher");
    expect(lastName("")).toBe("");
  });
  it("labels carry exactly the angel code, parent's last name, gender and age", () => {
    const d = labelData({ angel_code: "G26-004", gender: "Girl", age: 9, family: { parent_name: "Pat Tester" } });
    expect(d).toEqual({ code: "G26-004", family: "Tester", gender: "Girl", age: "9" });
  });
  it("uses cardstock until a label stock is saved", () => {
    expect(defaultStock(null).id).toBe("cardstock");
    expect(defaultStock("nonsense").id).toBe("cardstock");
    expect(defaultStock("avery5163").id).toBe("avery5163");
  });
  it("paginates to US Letter pages inside the sheet for every stock", () => {
    for (const s of STOCKS) {
      const per = s.cols * s.rows;
      const pages = paginate(Array.from({ length: per * 2 + 1 }, (_, i) => i), s);
      expect(pages).toHaveLength(3);
      expect(pages[0]).toHaveLength(per);
      for (const p of pages.flat()) {
        expect(p.left + s.w).toBeLessThanOrEqual(8.5 + 1e-9);
        expect(p.top + s.h).toBeLessThanOrEqual(11 + 1e-9);
      }
    }
    expect(CARDSTOCK.cols * CARDSTOCK.rows).toBe(10);
  });
  it("uses the custom paper dimensions and number of slots even with a partial row", () => {
    const layout = { ...DEFAULT_CUSTOM_LAYOUT, pageWidth: 7, pageHeight: 5, width: 2, height: 1, columns: 3, perPage: 5, gapX: 0.25, gapY: 0.5 };
    const stock = defaultStock(layout);
    expect(stock).toMatchObject({ id: "custom", page: { width: 7, height: 5 } });
    const pages = paginate(Array.from({ length: 11 }, (_, i) => i), stock);
    expect(pages.map((page) => page.length)).toEqual([5, 5, 1]);
    expect(pages[0][4]).toEqual({ item: 4, left: 2.5, top: 1.75 });
    expect(pages[1][0]).toEqual({ item: 5, left: 0.25, top: 0.25 });
  });
  it("validates the measurements and the finished grid", () => {
    expect(customStock({ ...DEFAULT_CUSTOM_LAYOUT, height: 0 }).error).toMatch(/positive widths and heights/);
    expect(customStock({ ...DEFAULT_CUSTOM_LAYOUT, perPage: 4.5 }).error).toMatch(/whole numbers/);
    expect(customStock({ ...DEFAULT_CUSTOM_LAYOUT, left: -0.25 }).error).toMatch(/positive number/);
    expect(customStock({ ...DEFAULT_CUSTOM_LAYOUT, width: 4.5 }).error).toMatch(/do not fit/);
    expect(customStock({ ...DEFAULT_CUSTOM_LAYOUT, perPage: 12 }).error).toMatch(/do not fit/);
  });
  it("saves a valid custom default and preserves it when an invalid layout is submitted", async () => {
    const { c, store } = fresh();
    const layout = { ...DEFAULT_CUSTOM_LAYOUT, pageWidth: 6, pageHeight: 4, width: 2.5, height: 1, perPage: 6 };
    await c.saveLabelStock(layout);
    await expect(c.saveLabelStock({ ...layout, pageHeight: 2 })).rejects.toThrow(/do not fit/);
    expect((await store.getSettings()).labelStock).toEqual(layout);
    await c.saveLabelStock("avery5163");
    expect(defaultStock((await store.getSettings()).labelStock).id).toBe("avery5163");
    await c.saveLabelStock(null);
    expect(defaultStock((await store.getSettings()).labelStock).id).toBe("cardstock");
  });
});
