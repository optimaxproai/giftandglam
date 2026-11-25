import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { PublicChild } from "./types";
import { DRIVE, giftDropOff } from "./drive";
import { organizerEmail } from "./sponsorMail";

/** Standard PDF fonts only cover Latin-1 plus a few punctuation marks. Anything else becomes a plain stand-in. */
const MAP: Record<string, string> = { "’": "'", "‘": "'", "“": '"', "”": '"', "–": "-", "—": "-", "•": "-", "→": "->", "★": "*" };
export const pdfSafe = (s: string) => [...s].map((ch) => MAP[ch] ?? (/[\x20-\x7e -ÿ]/.test(ch) ? ch : "")).join("");

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of pdfSafe(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

const GREEN = rgb(0.09, 0.3, 0.2);
const RED = rgb(0.69, 0.1, 0.22);
const GOLD = rgb(0.9, 0.7, 0.25);
const INK = rgb(0.12, 0.14, 0.13);
const MUTED = rgb(0.4, 0.44, 0.42);
const LINE = rgb(0.82, 0.86, 0.84);

/** One printable page: the sponsor's own angel, from public-safe fields only (no names, photos or contact details). */
export async function buildGiftPdf(c: PublicChild): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Gift & Glam - Angel ${c.code}`);
  pdf.setAuthor("Gift & Glam");
  const page: PDFPage = pdf.addPage([612, 792]);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const W = 612;
  const M = 44;
  const CW = W - M * 2;

  page.drawRectangle({ x: 0, y: 792 - 96, width: W, height: 96, color: GREEN });
  page.drawRectangle({ x: 0, y: 792 - 100, width: W, height: 4, color: GOLD });
  page.drawText("Gift & Glam", { x: M, y: 792 - 52, size: 30, font: serif, color: rgb(1, 1, 1) });
  page.drawText(pdfSafe(`${DRIVE.name}  |  Your shopping list`), { x: M, y: 792 - 76, size: 11, font: reg, color: rgb(0.85, 0.93, 0.88) });
  let y = 792 - 100 - 34;

  page.drawText("ANGEL", { x: M, y, size: 11, font: bold, color: MUTED });
  y -= 44;
  page.drawText(pdfSafe(c.code), { x: M, y, size: 46, font: bold, color: RED });
  const meta = [c.age != null ? `${c.age} years old` : "", c.gender || ""].filter(Boolean).join("  |  ");
  if (meta) page.drawText(pdfSafe(meta), { x: M + 230, y: y + 8, size: 14, font: reg, color: INK });
  y -= 26;

  const sizes: [string, string | null | undefined][] = [["Shirt", c.tops], ["Pants", c.bottoms], ["Coat", c.coat_size], ["Shoes", c.shoes], ["Favorite color", c.favColor]];
  const shown = sizes.filter(([, v]) => !!v) as [string, string][];
  if (shown.length) {
    const cell = CW / shown.length;
    shown.forEach(([k, v], i) => {
      const x = M + i * cell;
      page.drawText(pdfSafe(k.toUpperCase()), { x, y, size: 8, font: bold, color: MUTED });
      page.drawText(pdfSafe(v), { x, y: y - 15, size: 13, font: bold, color: INK });
    });
    y -= 36;
  }
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: LINE });
  y -= 24;

  const section = (title: string, items: string[]) => {
    if (!items.length) return;
    page.drawText(pdfSafe(title), { x: M, y, size: 13, font: bold, color: GREEN });
    y -= 17;
    for (const item of items.slice(0, 14)) {
      const lines = wrap(item, reg, 11.5, CW - 22);
      page.drawText("-", { x: M + 4, y, size: 11.5, font: bold, color: RED });
      for (const ln of lines) {
        page.drawText(ln, { x: M + 18, y, size: 11.5, font: reg, color: INK });
        y -= 15;
      }
    }
    y -= 8;
  };
  section("Needs", c.needs);
  section("Wants", c.wants);
  section("Interests", c.faves);
  if (c.gifts.length) section("Optional gift cards", c.gifts.map((g) => `$${g.amount} ${g.store}`));
  if (!c.needs.length && !c.wants.length) section("Wish list", ["No items listed yet. Please check My Angels or contact the organizers."]);

  const info = [`Return gifts UNWRAPPED by ${DRIVE.returnByLabel}. Label every bag with ${c.code}.`, `Gift drive giveaway: ${DRIVE.giveawayLabel}.`, giftDropOff(), DRIVE.giftSuggestion];
  const boxLines = info.flatMap((t, i) => [...wrap(t, i === 0 ? bold : reg, 11, CW - 28), ""]).slice(0, -1);
  const boxH = boxLines.length * 14 + 22;
  y -= 4;
  page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: rgb(0.96, 0.98, 0.97), borderColor: GREEN, borderWidth: 1.2 });
  let by = y - 20;
  let first = true;
  for (const ln of boxLines) {
    page.drawText(ln, { x: M + 14, y: by, size: 11, font: first ? bold : reg, color: INK });
    if (ln === "") first = false;
    by -= 14;
  }
  y -= boxH + 16;

  for (const ln of wrap("Tip: take a photo of this page with your phone so you always have your list with you.", bold, 11, CW)) {
    page.drawText(ln, { x: M, y, size: 11, font: bold, color: RED });
    y -= 15;
  }
  page.drawText(pdfSafe(`Questions? ${organizerEmail}`), { x: M, y: y - 2, size: 10, font: reg, color: MUTED });
  y -= 26;

  const LH = 92;
  if (y - LH > 30) {
    page.drawRectangle({ x: M, y: y - LH, width: CW, height: LH, borderColor: MUTED, borderWidth: 1, borderDashArray: [5, 4] });
    page.drawText("Cut out and attach to your gift bag", { x: M + 12, y: y - 16, size: 8.5, font: reg, color: MUTED });
    page.drawText("Gift & Glam", { x: M + 14, y: y - 46, size: 18, font: serif, color: GREEN });
    page.drawText(pdfSafe(c.code), { x: M + 190, y: y - 62, size: 38, font: bold, color: RED });
    page.drawText(pdfSafe(`Return unwrapped by ${DRIVE.returnByLabel}`), { x: M + 14, y: y - 70, size: 10, font: bold, color: INK });
  }
  return pdf.save();
}
