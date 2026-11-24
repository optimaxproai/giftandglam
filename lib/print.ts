export type Stock = { id: string; name: string; cols: number; rows: number; w: number; h: number; left: number; top: number; gapX: number; gapY: number; cutGuides: boolean };

/** Inches, US Letter. Avery figures are the published template measurements for each stock. */
export const STOCKS: Stock[] = [
  { id: "cardstock", name: "US Letter cardstock, cut apart (10 per sheet)", cols: 2, rows: 5, w: 4, h: 2.1, left: 0.25, top: 0.25, gapX: 0, gapY: 0, cutGuides: true },
  { id: "avery5160", name: "Label sheet: Avery 5160 / 8160 (30 per sheet, 1\" × 2⅝\")", cols: 3, rows: 10, w: 2.625, h: 1, left: 0.1875, top: 0.5, gapX: 0.125, gapY: 0, cutGuides: false },
  { id: "avery5163", name: "Label sheet: Avery 5163 / 8163 (10 per sheet, 2\" × 4\")", cols: 2, rows: 5, w: 4, h: 2, left: 0.15625, top: 0.5, gapX: 0.1875, gapY: 0, cutGuides: false },
  { id: "avery5164", name: "Label sheet: Avery 5164 / 8164 (6 per sheet, 3⅓\" × 4\")", cols: 2, rows: 3, w: 4, h: 3.3333, left: 0.15625, top: 0.5, gapX: 0.1875, gapY: 0, cutGuides: false },
];

export const CARDSTOCK = STOCKS[0];
export const stockById = (id: string | null | undefined): Stock | null => STOCKS.find((s) => s.id === id) ?? null;

/** Cardstock until the organizer saves a label stock; then that label sheet. */
export function defaultStock(saved: string | null): Stock {
  return stockById(saved) ?? CARDSTOCK;
}

export type Placed<T> = { item: T; left: number; top: number };

/** Splits items into Letter pages and gives each its position in inches. */
export function paginate<T>(items: T[], s: Stock): Placed<T>[][] {
  const per = s.cols * s.rows;
  const pages: Placed<T>[][] = [];
  for (let i = 0; i < items.length; i += per) {
    pages.push(
      items.slice(i, i + per).map((item, k) => ({
        item,
        left: s.left + (k % s.cols) * (s.w + s.gapX),
        top: s.top + Math.floor(k / s.cols) * (s.h + s.gapY),
      })),
    );
  }
  return pages;
}

const SUFFIX = /^(jr|sr|ii|iii|iv|v)\.?$/i;

/** Last name from a parent or guardian's full name, ignoring suffixes like Jr. */
export function lastName(parent: string | null | undefined): string {
  const parts = (parent || "").replace(/[,]+/g, " ").trim().split(/\s+/).filter(Boolean);
  while (parts.length > 1 && SUFFIX.test(parts[parts.length - 1])) parts.pop();
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || "";
}

export type LabelData = { code: string; family: string; gender: string; age: string };

/** Exactly the four things on a label: angel code, parent's last name, gender, age. */
export function labelData(c: { angel_code: string | null; gender: string | null; age: number | null; family?: { parent_name: string } | null }): LabelData {
  return { code: c.angel_code || "", family: lastName(c.family?.parent_name), gender: c.gender || "", age: c.age == null ? "" : String(c.age) };
}
