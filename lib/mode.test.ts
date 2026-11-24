import { afterEach, describe, expect, it, vi } from "vitest";
import { reviewMode, show2027OnTree } from "./mode";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("review build switch", () => {
  it("can never be on in production, even if forced", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ANGEL_REVIEW", "1");
    expect(reviewMode()).toBe(false);
    expect(show2027OnTree()).toBe(false);
  });
  it("turns on for a preview with no Supabase configured", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(reviewMode()).toBe(true);
  });
  it("stays off for a preview that has a real database, unless forced", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    expect(reviewMode()).toBe(false);
    vi.stubEnv("ANGEL_REVIEW", "1");
    expect(reviewMode()).toBe(true);
  });
  it("keeps 2027 cards off the public tree in production until ANGEL_SHOW_2027=1", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(show2027OnTree()).toBe(false);
    vi.stubEnv("ANGEL_SHOW_2027", "1");
    expect(show2027OnTree()).toBe(true);
  });
});
