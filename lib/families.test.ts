import { describe, expect, it } from "vitest";
import { firstName, normEmail, normPhone, sameChild } from "./families";

describe("families", () => {
  it("normalizes phones so the same parent matches across emails", () => {
    expect(normPhone("404-538-4741")).toBe("4045384741");
    expect(normPhone("+1 (404) 538-4741")).toBe("4045384741");
    expect(normPhone("12")).toBe("");
  });
  it("normalizes email", () => expect(normEmail("  Dana@Example.COM ")).toBe("dana@example.com"));
  it("takes the first name and keeps hyphens", () => {
    expect(firstName("Tori-Ann Foster")).toBe("Tori-Ann");
    expect(firstName("  ")).toBe("Child");
  });
  it("treats same first name and age as the same child", () => {
    expect(sameChild({ full_name: "Helen Dixon", age: 10 }, { full_name: "helen D", age: 10 })).toBe(true);
    expect(sameChild({ full_name: "Helen Dixon", age: 10 }, { full_name: "Helen Dixon", age: 11 })).toBe(false);
  });
});
