"use client";
import { useId, useState } from "react";

type Kind = "shirt" | "pants" | "shoes";
const sequence = (start: number, end: number, step = 1) => Array.from({ length: Math.floor((end - start) / step) + 1 }, (_, i) => String(start + step * i));
const sizes = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];
const children = [
  { label: "Infant", options: ["Preemie", "Newborn", "0–3 months", "3–6 months", "6–9 months", "9–12 months", "12–18 months", "18–24 months"] },
  { label: "Toddler", options: ["2T", "3T", "4T", "5T", "6T"] },
  { label: "Youth", options: [...sequence(2, 20).map((n) => `Youth ${n}`), "Youth 4/5", "Youth 6/7", "Youth 8/10", "Youth 10/12", "Youth 12/14", "Youth 14/16", "Youth 16/18", ...sizes.slice(0, 7).map((s) => `Youth ${s}`)] },
  { label: "Adult", options: sizes.map((s) => `Adult ${s}`) },
];
const choices: Record<Kind, typeof children> = {
  shirt: children,
  pants: [...children, { label: "Adult waist (inches)", options: sequence(24, 60).map((n) => `Waist ${n}`) }, { label: "Women's numeric / plus", options: ["Women's 00", ...sequence(0, 32, 2).map((n) => `Women's ${n}`), "Women's 1X", "Women's 2X", "Women's 3X", "Women's 4X", "Women's 5X", "Women's 6X"] }],
  shoes: [
    { label: "Infant and toddler (US)", options: sequence(0, 10, .5).map((n) => `Toddler ${n}`) },
    { label: "Little kid / youth (US)", options: [...sequence(10.5, 13.5, .5), ...sequence(1, 7, .5)].map((n) => `Youth ${n}`) },
    { label: "Adult women's (US)", options: sequence(4, 16, .5).map((n) => `Women's ${n}`) },
    { label: "Adult men's (US)", options: sequence(4, 20, .5).map((n) => `Men's ${n}`) },
  ],
};

export default function SizeField({ kind, value, onChange }: { kind: Kind; value: string; onChange: (value: string) => void }) {
  const id = useId();
  const groups = choices[kind];
  const known = groups.some((g) => g.options.includes(value));
  const [custom, setCustom] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{kind === "shirt" ? "Shirt" : kind === "pants" ? "Pants" : "Shoes"}</label>
      <select id={id} value={custom ? "__custom" : value} onChange={(e) => {
        if (e.target.value === "__custom") { setCustom(true); onChange(""); }
        else { setCustom(false); onChange(e.target.value); }
      }}>
        <option value="">Not stated</option>
        {!known && value && <option value={value}>{value} (as provided)</option>}
        {groups.map((g) => <optgroup key={g.label} label={g.label}>{g.options.map((s) => <option key={s} value={s}>{s}</option>)}</optgroup>)}
        <option value="__custom">Other / enter exact size</option>
      </select>
      {custom && <input aria-label={`Other ${kind} size`} placeholder="Size, width or fit" maxLength={60} value={value} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}
