import { describe, expect, it } from "vitest";
import { ParsedSchema, normalizeParsed } from "./parseSchema";

// Shaped like the Nov 11 sample email (fictional names): one parent, three children, gift cards inside the lists.
const sample = {
  families: [
    {
      parent: { name: "Dana Whitfield", phone: "404-555-0123", email: null },
      story: "  We lost my mother in April.   Money is tight.  ",
      children: [
        { full_name: "Nia Whitfield", age: 16, gender: "Female", shirt_size: "Adult XS", shoe_size: "7", wants: ["Lash clusters kit", "Ulta gift card", "Candles"], needs: ["Socks", "socks", "Pajamas"], favorites: ["a", "b", "c", "d"], photo: { page: 1, box: { x: 0.1, y: 0.1, w: 0.3, h: 0.2 } } },
        { full_name: "Trey Whitfield", age: 14, gender: "male", wants: ["Hot Topic Gift card", "LEGO set"], needs: [], photo: { page: 1, box: { x: 0.9, y: 0.9, w: 0.5, h: 0.5 } } },
        { full_name: "   ", age: 3 },
      ],
    },
  ],
};

describe("normalizeParsed", () => {
  const out = normalizeParsed(ParsedSchema.parse(sample));
  it("keeps siblings together and drops nameless children", () => {
    expect(out).toHaveLength(1);
    expect(out[0].children.map((c) => c.fullName)).toEqual(["Nia Whitfield", "Trey Whitfield"]);
  });
  it("moves gift cards out of wants into the gift ask", () => {
    expect(out[0].children[0].wants).toEqual(["Lash clusters kit", "Candles"]);
    expect(out[0].children[0].giftStore).toBe("Ulta");
    expect(out[0].children[1].giftStore).toBe("Hot Topic");
  });
  it("dedupes, caps favorites at 3 and maps gender", () => {
    expect(out[0].children[0].needs).toEqual(["Socks", "Pajamas"]);
    expect(out[0].children[0].faves).toHaveLength(3);
    expect(out[0].children.map((c) => c.gender)).toEqual(["Girl", "Boy"]);
  });
  it("tidies the story and keeps photo boxes inside the page", () => {
    expect(out[0].story).toBe("We lost my mother in April. Money is tight.");
    const b = out[0].children[1].photo!.box;
    expect(b.x + b.w).toBeLessThanOrEqual(1);
    expect(b.y + b.h).toBeLessThanOrEqual(1);
  });
});
