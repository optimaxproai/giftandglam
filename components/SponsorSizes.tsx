import type { PublicChild } from "@/lib/types";

export default function SponsorSizes({ child }: { child: PublicChild }) {
  const fields = [
    ["Shirt", child.tops],
    ["Pants", child.bottoms],
    ["Coat", child.coat_size],
    ["Shoes", child.shoes],
  ];
  if (child.favColor) fields.push(["Favorite color", child.favColor]);

  return (
    <dl className="facts sponsor-sizes" aria-label="Angel sizes and preferences">
      {fields.map(([label, value]) => (
        <div className="fact" key={label}>
          <dt>{label}</dt>
          <dd>{value || "Not provided"}</dd>
        </div>
      ))}
    </dl>
  );
}
