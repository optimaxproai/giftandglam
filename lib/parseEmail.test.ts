import { afterEach, describe, expect, it, vi } from "vitest";
import { parseRequests } from "./parseEmail";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));

afterEach(() => {
  vi.unstubAllEnvs();
  create.mockReset();
});

describe("import model compatibility", () => {
  it("uses automatic tool selection and preserves each extracted gift card store", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fictional-test-key");
    create.mockResolvedValue({ content: [
      { type: "text", text: "Reading fictional request" },
      { type: "tool_use", name: "record_requests", input: { families: [
        { parent: { name: "Jordan Example" }, children: [{ full_name: "Casey Example", gift_card_stores: ["Bookshop", "Target"] }] },
      ] } },
    ] });
    const result = await parseRequests({ text: "Fictional request", pages: [] });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ tool_choice: { type: "auto" } }));
    expect(result[0].children[0].giftCards).toEqual([{ store: "Bookshop", amount: 25 }, { store: "Target", amount: 25 }]);
  });
});
