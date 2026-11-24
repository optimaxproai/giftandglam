"use client";

import { useEffect, useId, useRef } from "react";

const LISTS = {
  wants: { label: "Wants", item: "want", limit: 40 },
  needs: { label: "Needs", item: "need", limit: 40 },
  interests: { label: "Interests (up to 3)", item: "interest", limit: 3 },
} as const;

export function cleanListItems(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean);
}

export default function ItemListEditor({ kind, items, onChange, disabled = false }: {
  kind: keyof typeof LISTS;
  items: string[];
  onChange: (items: string[]) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const { label, item, limit } = LISTS[kind];
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const addButton = useRef<HTMLButtonElement>(null);
  const focusAfterChange = useRef<number | null>(null);

  useEffect(() => {
    const index = focusAfterChange.current;
    if (index === null) return;
    (inputs.current[index] ?? addButton.current)?.focus();
    focusAfterChange.current = null;
  }, [items.length]);

  return (
    <div className="field item-list-editor" role="group" aria-labelledby={id}>
      <span className="lbl" id={id}>{label}</span>
      {items.map((value, index) => (
        <div className="item-row" key={index}>
          <input
            ref={(input) => { inputs.current[index] = input; }}
            aria-label={`${item} ${index + 1}`}
            value={value}
            maxLength={200}
            disabled={disabled}
            onChange={(e) => onChange(items.map((current, i) => i === index ? e.target.value : current))}
          />
          <button
            type="button"
            className="btn sm ghost"
            aria-label={`Remove ${item} ${index + 1}`}
            disabled={disabled}
            onClick={() => {
              focusAfterChange.current = Math.min(index, items.length - 2);
              onChange(items.filter((_, i) => i !== index));
            }}
          >Remove</button>
        </div>
      ))}
      <div>
        <button
          type="button"
          className="btn sm ghost"
          ref={addButton}
          disabled={disabled || items.length >= limit}
          onClick={() => {
            focusAfterChange.current = items.length;
            onChange([...items, ""]);
          }}
        >+ Add {item}</button>
      </div>
    </div>
  );
}
