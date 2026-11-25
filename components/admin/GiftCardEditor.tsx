"use client";
import type { GiftCard } from "@/lib/giftCards";

export default function GiftCardEditor({ cards, onChange, disabled }: { cards: GiftCard[]; onChange: (cards: GiftCard[]) => void; disabled?: boolean }) {
  function update(index: number, patch: Partial<GiftCard>) {
    onChange(cards.map((card, i) => i === index ? { ...card, ...patch } : card));
  }
  return (
    <div className="field item-list-editor" role="group" aria-label="Gift cards">
      <div className="item-editor-header">
        <span className="lbl">Gift cards (optional)</span>
        <button type="button" className="item-add" disabled={disabled || cards.length >= 40} onClick={() => onChange([...cards, { store: "", amount: 25 }])}>+ Add gift card</button>
      </div>
      {cards.map((card, i) => (
        <div className="gift-card-row" key={i}>
          <input aria-label={`Gift card ${i + 1} store`} placeholder="Store" maxLength={80} value={card.store} disabled={disabled} onChange={(e) => update(i, { store: e.target.value })} />
          <input aria-label={`Gift card ${i + 1} amount in dollars`} type="number" placeholder="$" min={5} max={200} value={card.amount || ""} disabled={disabled} onChange={(e) => update(i, { amount: Number(e.target.value) })} />
          <button type="button" className="item-remove" disabled={disabled} aria-label={`Remove gift card ${i + 1}`} onClick={() => onChange(cards.filter((_, index) => index !== i))}><span aria-hidden="true">×</span></button>
        </div>
      ))}
    </div>
  );
}
