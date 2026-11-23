import Anthropic from "@anthropic-ai/sdk";
import { PARSE_TOOL, ParsedSchema, normalizeParsed, type DraftFamily } from "./parseSchema";

const MODEL = "claude-sonnet-5-5";

const SYSTEM = `You read gift-drive sponsorship requests that families email to the organizers. The input is the email as page images (a printed Gmail PDF or a screenshot) and/or its text.

Return every family and every child, one entry per child. A single email can describe several children (siblings) for one parent: keep them in one family.

Rules:
- Copy facts as written. Never invent a name, age, size or phone number. Use null or an empty list when something is not stated.
- Sizes: shirt_size, pants_size, shoe_size exactly as written (for example "Adult XS", "12/14", "9 1/2"). If only "clothes size" is given, use it for shirt_size and pants_size.
- Wants are things the child would like. Needs are essentials (clothes, socks, underwear, pajamas, coats, hygiene). Follow the email's own labels such as "Need:" or "Wish list". When it is unlabeled, clothing and basics are needs and the rest are wants.
- Gift cards are not wants. Put the store name in gift_card_stores ("Ulta gift card" -> "Ulta"), and leave the item out of wants.
- favorites: up to 3 favorite characters or hobbies. favorite_color if given.
- parent: the parent or guardian named in the email. If they give no email address, use the sender's address from the header.
- story: the parent's reason for asking, in their own words, trimmed to 400 characters.
- photo: when a page shows a photograph of a child, give the 1-based page number and a tight box around the face and shoulders as fractions of the page (x, y, w, h from the top-left, each between 0 and 1). Match each photo to the right child using captions, order and names. If one photo shows several children, give the same box for each of them. If there is no photo for a child, use null.
- Ignore email chrome (Gmail logo, "(no subject)", handwritten notes, print footers).`;

export type ParseInput = { pages: string[]; text: string };

export async function parseRequests(input: ParseInput): Promise<DraftFamily[]> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic();
  const content: Anthropic.Messages.ContentBlockParam[] = [];
  input.pages.forEach((data, i) => {
    content.push({ type: "text", text: `Page ${i + 1}:` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
  });
  if (input.text.trim()) content.push({ type: "text", text: `Text of the email:\n\n${input.text.slice(0, 20000)}` });
  content.push({ type: "text", text: "Record every family and child using the record_requests tool." });

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    tools: [PARSE_TOOL],
    tool_choice: { type: "tool", name: PARSE_TOOL.name },
    messages: [{ role: "user", content }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("The reader returned nothing usable");
  const parsed = ParsedSchema.safeParse(block.input);
  if (!parsed.success) throw new Error("The reader's answer had an unexpected shape");
  return normalizeParsed(parsed.data);
}
