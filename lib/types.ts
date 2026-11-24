import type { GiftCard } from "./giftCards";

export type Status = "available" | "claimed" | "purchased" | "returned" | "given";
export type GiftStatus = "none" | "pledged" | "received";
export type Decision = "pending" | "approved" | "needs_info" | "declined" | "set_aside";

export type FamilyRow = {
  id: string;
  parent_name: string;
  phone: string | null;
  email: string | null;
  story: string | null;
  source_label: string | null;
  created_at: string;
};

export type SponsorRow = { id: string; name: string; email: string; phone: string | null; token: string };

export type ChildRow = {
  id: string;
  no: number;
  family_id: string;
  full_name: string;
  first_name: string;
  age: number | null;
  gender: string | null;
  tops: string | null;
  bottoms: string | null;
  shoes: string | null;
  wants: string[];
  needs: string[];
  faves: string[];
  fav_color: string | null;
  gift_store: string | null;
  gift_amount: number | null;
  gift_cards?: GiftCard[] | null;
  gift_card_status: GiftStatus;
  photo_path: string | null;
  photo_public: boolean;
  approved: boolean;
  status: Status;
  sponsor_id: string | null;
  claimed_at: string | null;
  returned_at: string | null;
  organizer_notes: string | null;
  /** Organizer decision. Separate from `approved`, which means "published on the public tree". */
  decision: Decision;
  decision_reason: string | null;
  set_aside_code: "over_age" | "other" | null;
  age_uncertain: boolean;
  angel_code: string | null;
  decided_at: string | null;
  decided_by: string | null;
  family?: FamilyRow | null;
  sponsor?: SponsorRow | null;
};

/** Everything a sponsor (or the public) may ever see about a child. */
export type PublicChild = {
  id: string;
  no: number;
  firstName: string;
  age: number | null;
  gender: string | null;
  tops: string | null;
  bottoms: string | null;
  shoes: string | null;
  wants: string[];
  needs: string[];
  faves: string[];
  favColor: string | null;
  gift: { store: string; amount: number } | null;
  gifts: GiftCard[];
  available: boolean;
  status: Status;
  hasPhoto: boolean;
  siblings: { id: string; firstName: string; age: number | null; available: boolean }[];
  /** The public label for this angel. Sponsors never see a name. */
  code: string;
};

export const STATUS_LABEL: Record<Status, string> = {
  available: "Available",
  claimed: "Sponsored",
  purchased: "Gifts bought",
  returned: "Gifts returned",
  given: "Given out",
};
export const STATUS_ORDER: Status[] = ["available", "claimed", "purchased", "returned", "given"];
