/** Donation destinations printed on the 2026 organizer flyer; update only with the organizer's confirmation. */
export const DONATIONS = {
  paypal: "https://paypal.me/giftandgive",
  zelle: "paradigmgiftdrive@gmail.com",
  cashApp: "$paradigmgifting",
  organizerEmail: "paradigmgiftdrive@gmail.com",
};

export const DONATION_PURPOSES = {
  store_gift_card: "Gift of a Store Gift Card",
  additional_angel_gifts: "To Purchase Additional Angel Gifts",
  party_expenses: "Toward Party Expenses",
  other: "Other Ways to Give",
} as const;
export type DonationPurpose = keyof typeof DONATION_PURPOSES;
export type DonationMethod = "PayPal" | "Zelle" | "Cash App" | "In person" | "Other";
export type DonationStatus = "pending" | "received" | "contacted" | "closed";
export type DonationOfferInput = { purpose:DonationPurpose; name:string; email:string; amount_cents:number|null; method:DonationMethod|null; details:string };
export type DonationOffer = DonationOfferInput & { id:string; created_at:string; status:DonationStatus; received_cents:number|null; organizer_notes:string };
export type DonationOfferUpdate = {status:DonationStatus;received_cents:number|null;organizer_notes:string};
export const donationMemo = (purpose:DonationPurpose,store?:string) => `Gift & Glam — ${DONATION_PURPOSES[purpose]}${purpose==="store_gift_card"&&store?.trim()?` (${store.trim()})`:""}`;
export const dollars = (cents:number|null) => cents===null?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);
