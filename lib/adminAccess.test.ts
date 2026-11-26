import { describe, expect, it } from "vitest";
import { isAdminUser, isWriteMethod, parseAdminEmails, sameOrigin } from "./adminAccess";

const allow = parseAdminEmails(" Organizer@Example.com , second@example.com,, ");
const confirmed = { email: "organizer@example.com", email_confirmed_at: "2026-11-26T10:00:00Z" };

describe("admin access rules", () => {
  it("normalises the allow-list", () => {
    expect(allow).toEqual(["organizer@example.com", "second@example.com"]);
    expect(parseAdminEmails(undefined)).toEqual([]);
  });
  it("accepts only a confirmed, allow-listed email, whatever its case", () => {
    expect(isAdminUser(confirmed, allow)).toBe(true);
    expect(isAdminUser({ ...confirmed, email: "ORGANIZER@example.com" }, allow)).toBe(true);
  });
  it("rejects an allow-listed email that was never confirmed", () => {
    expect(isAdminUser({ email: "organizer@example.com", email_confirmed_at: null }, allow)).toBe(false);
    expect(isAdminUser({ email: "organizer@example.com" }, allow)).toBe(false);
  });
  it("rejects strangers, missing users and an empty allow-list", () => {
    expect(isAdminUser({ email: "someone@else.com", email_confirmed_at: "x" }, allow)).toBe(false);
    expect(isAdminUser(null, allow)).toBe(false);
    expect(isAdminUser(undefined, allow)).toBe(false);
    expect(isAdminUser(confirmed, [])).toBe(false);
  });
  it("does not match on a partial or look-alike email", () => {
    expect(isAdminUser({ email: "organizer@example.com.evil.io", email_confirmed_at: "x" }, allow)).toBe(false);
    expect(isAdminUser({ email: "x organizer@example.com", email_confirmed_at: "x" }, allow)).toBe(false);
  });
});

describe("cross-site request blocking", () => {
  it("allows the site's own origin and requests without an Origin header", () => {
    expect(sameOrigin("https://giftandglam.optimaxproai.com", "giftandglam.optimaxproai.com")).toBe(true);
    expect(sameOrigin(null, "giftandglam.optimaxproai.com")).toBe(true);
  });
  it("blocks other sites, look-alikes and garbage", () => {
    expect(sameOrigin("https://evil.example", "giftandglam.optimaxproai.com")).toBe(false);
    expect(sameOrigin("https://giftandglam.optimaxproai.com.evil.io", "giftandglam.optimaxproai.com")).toBe(false);
    expect(sameOrigin("null", "giftandglam.optimaxproai.com")).toBe(false);
  });
  it("treats only reads as safe methods", () => {
    expect(isWriteMethod("POST")).toBe(true);
    expect(isWriteMethod("delete")).toBe(true);
    expect(isWriteMethod("GET")).toBe(false);
  });
});
