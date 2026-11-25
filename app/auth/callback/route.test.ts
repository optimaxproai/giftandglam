import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { exchange, verify } = vi.hoisted(() => ({ exchange: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authClient: () => ({ auth: { exchangeCodeForSession: exchange, verifyOtp: verify } }) }));

const origin = "https://giftandglam.example";
const callback = (query: string) => GET(new Request(`${origin}/auth/callback?${query}`));

describe("organizer email callback", () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it("routes the verified PKCE recovery flow to the password form, even without a next parameter", async () => {
    exchange.mockResolvedValue({ data: { redirectType: "recovery" }, error: null });
    expect((await callback("code=example&sb_flow_id=flow")).headers.get("location")).toBe(`${origin}/admin/reset`);
    expect(exchange).toHaveBeenCalledWith("example", { flowId: "flow" });
  });

  it("keeps previously sent recovery links working", async () => {
    exchange.mockResolvedValue({ data: {}, error: null });
    expect((await callback("code=example&next=/admin/reset")).headers.get("location")).toBe(`${origin}/admin/reset`);
  });

  it("routes token-hash recovery links to the form and offers a fresh link after expiration", async () => {
    verify.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "Expired" } });
    expect((await callback("token_hash=example&type=recovery")).headers.get("location")).toBe(`${origin}/admin/reset`);
    expect(verify).toHaveBeenCalledWith({ token_hash: "example", type: "recovery" });
    expect((await callback("token_hash=expired&type=recovery")).headers.get("location")).toBe(`${origin}/admin/login?error=reset`);
  });

  it("routes ordinary email sign-ins to the console", async () => {
    exchange.mockResolvedValue({ data: { redirectType: null }, error: null });
    expect((await callback("code=example")).headers.get("location")).toBe(`${origin}/admin`);
  });
});
