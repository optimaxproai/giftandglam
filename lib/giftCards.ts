import { z } from "zod";

export const GiftCardsSchema = z.array(z.object({ store: z.string().trim().min(1).max(80), amount: z.number().int().min(5).max(200) })).max(40);
export type GiftCard = z.infer<typeof GiftCardsSchema>[number];

/** Older records have a single store and amount. New records carry one entry per card. */
export function readGiftCards(record: { gift_cards?: GiftCard[] | null; gift_store: string | null; gift_amount: number | null }): GiftCard[] {
  return record.gift_cards ?? (record.gift_store && record.gift_amount ? [{ store: record.gift_store, amount: record.gift_amount }] : []);
}

export function cleanGiftCards(cards: GiftCard[]): GiftCard[] {
  return cards.map((card) => ({ ...card, store: card.store.trim() })).filter((card) => card.store);
}

export function giftCardFields(cards: GiftCard[]) {
  return { gift_cards: cards, gift_store: cards[0]?.store ?? null, gift_amount: cards[0]?.amount ?? null };
}
