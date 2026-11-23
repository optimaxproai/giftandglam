import { z } from "zod";

/** What the model must return, one tool call. Boxes are fractions of the page image (0 to 1). */
export const PARSE_TOOL = {
  name: "record_requests",
  description: "Record every family and child found in the email or PDF.",
  input_schema: {
    type: "object" as const,
    properties: {
      families: {
        type: "array",
        items: {
          type: "object",
          properties: {
            parent: {
              type: "object",
              properties: {
                name: { type: "string", description: "Parent or guardian full name as written" },
                phone: { type: ["string", "null"] },
                email: { type: ["string", "null"], description: "Parent's email if they give one, else the sender's address" },
              },
              required: ["name"],
            },
            story: { type: ["string", "null"], description: "The parent's reason for asking, trimmed to at most 400 characters, in their words" },
            children: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  full_name: { type: "string" },
                  age: { type: ["integer", "null"] },
                  gender: { type: ["string", "null"], enum: ["Girl", "Boy", "Other", null] },
                  shirt_size: { type: ["string", "null"] },
                  pants_size: { type: ["string", "null"] },
                  shoe_size: { type: ["string", "null"] },
                  wants: { type: "array", items: { type: "string" } },
                  needs: { type: "array", items: { type: "string" } },
                  favorites: { type: "array", items: { type: "string" }, description: "Favorite characters or hobbies, at most 3" },
                  favorite_color: { type: ["string", "null"] },
                  gift_card_stores: { type: "array", items: { type: "string" }, description: "Stores named for gift cards, e.g. Ulta" },
                  photo: {
                    type: ["object", "null"],
                    description: "Where this child's photo is, if the document shows one",
                    properties: {
                      page: { type: "integer", description: "1-based page number" },
                      box: {
                        type: "object",
                        properties: { x: { type: "number" }, y: { type: "number" }, w: { type: "number" }, h: { type: "number" } },
                        required: ["x", "y", "w", "h"],
                      },
                    },
                    required: ["page", "box"],
                  },
                },
                required: ["full_name"],
              },
            },
          },
          required: ["parent", "children"],
        },
      },
    },
    required: ["families"],
  },
};

const Box = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });
const Child = z.object({
  full_name: z.string(),
  age: z.number().nullable().optional(),
  gender: z.string().nullable().optional(),
  shirt_size: z.string().nullable().optional(),
  pants_size: z.string().nullable().optional(),
  shoe_size: z.string().nullable().optional(),
  wants: z.array(z.string()).optional(),
  needs: z.array(z.string()).optional(),
  favorites: z.array(z.string()).optional(),
  favorite_color: z.string().nullable().optional(),
  gift_card_stores: z.array(z.string()).optional(),
  photo: z.object({ page: z.number(), box: Box }).nullable().optional(),
});
export const ParsedSchema = z.object({
  families: z.array(
    z.object({
      parent: z.object({ name: z.string(), phone: z.string().nullable().optional(), email: z.string().nullable().optional() }),
      story: z.string().nullable().optional(),
      children: z.array(Child),
    }),
  ),
});

export type DraftChild = {
  fullName: string;
  age: number | null;
  gender: "Girl" | "Boy" | "Other" | null;
  tops: string;
  bottoms: string;
  shoes: string;
  wants: string[];
  needs: string[];
  faves: string[];
  favColor: string;
  giftStore: string;
  giftAmount: number;
  photo: { page: number; box: { x: number; y: number; w: number; h: number } } | null;
};
export type DraftFamily = { parentName: string; phone: string; email: string; story: string; children: DraftChild[] };

const GIFT_ITEM = /^(.*?)\s*gift\s*cards?$/i;
const clean = (s?: string | null) => (s || "").replace(/\s+/g, " ").trim();
const uniq = (a: string[]) => a.filter((x, i) => a.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Safety net on top of the model: tidy strings, move any "X gift card" line out of the lists into the
 * gift card ask, cap favorites at 3, drop children with no name, and keep photo boxes inside the page.
 */
export function normalizeParsed(raw: z.infer<typeof ParsedSchema>): DraftFamily[] {
  return raw.families
    .map((f) => ({
      parentName: clean(f.parent.name),
      phone: clean(f.parent.phone),
      email: clean(f.parent.email),
      story: clean(f.story).slice(0, 400),
      children: f.children
        .filter((c) => clean(c.full_name))
        .map((c): DraftChild => {
          const stores = (c.gift_card_stores || []).map(clean).filter(Boolean);
          const keep = (list?: string[]) =>
            uniq(
              (list || [])
                .map(clean)
                .filter(Boolean)
                .filter((item) => {
                  const m = item.match(GIFT_ITEM);
                  if (m) {
                    if (clean(m[1])) stores.push(clean(m[1]));
                    return false;
                  }
                  return true;
                }),
            );
          const wants = keep(c.wants);
          const needs = keep(c.needs);
          const g = clean(c.gender).toLowerCase();
          const box = c.photo?.box;
          const photo =
            c.photo && box && box.w > 0.02 && box.h > 0.02 && c.photo.page >= 1
              ? {
                  page: Math.round(c.photo.page),
                  box: { x: clamp01(box.x), y: clamp01(box.y), w: Math.min(box.w, 1 - clamp01(box.x)), h: Math.min(box.h, 1 - clamp01(box.y)) },
                }
              : null;
          return {
            fullName: clean(c.full_name),
            age: c.age == null || !Number.isFinite(c.age) ? null : Math.max(0, Math.min(21, Math.round(c.age))),
            gender: g.startsWith("f") || g === "girl" ? "Girl" : g.startsWith("m") || g === "boy" ? "Boy" : g ? "Other" : null,
            tops: clean(c.shirt_size),
            bottoms: clean(c.pants_size),
            shoes: clean(c.shoe_size),
            wants,
            needs,
            faves: uniq((c.favorites || []).map(clean).filter(Boolean)).slice(0, 3),
            favColor: clean(c.favorite_color),
            giftStore: uniq(stores)[0] || "",
            giftAmount: 25,
            photo,
          };
        }),
    }))
    .filter((f) => f.children.length > 0);
}
