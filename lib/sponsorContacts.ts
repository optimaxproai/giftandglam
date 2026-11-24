import { z } from "zod";

const optionalText = (limit: number) => z.string().trim().max(limit).default("");
export const SponsorContactSchema = z.object({
  name: z.string().trim().min(1, "Enter a sponsor name.").max(160),
  organization: optionalText(160),
  email: z.union([z.literal(""), z.string().trim().email().max(200)]),
  phone: optionalText(60),
  links: z.array(z.string().trim().url().max(500).refine((url) => /^https?:\/\//i.test(url), "Use a web link beginning with https:// or http://.")).max(10),
  notes: optionalText(2000),
});
export type SponsorContactInput = z.infer<typeof SponsorContactSchema>;
export type SponsorContact = SponsorContactInput & { id: string; flyer_name: string | null };
export type SponsorFlyer = { flyer_name: string; flyer_type: string; flyer_data: string };
export const FLYER_MAX_BYTES = 2 * 1024 * 1024;
export const CONTACT_COLUMNS = "id,name,organization,email,phone,links,notes,flyer_name";
