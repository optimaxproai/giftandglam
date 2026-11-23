/** Phone digits only, US country code dropped. "" when it is too short to match on. */
export function normPhone(p?: string | null): string {
  const d = (p || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return d.slice(1);
  return d.length >= 7 ? d : "";
}

export function normEmail(e?: string | null): string {
  return (e || "").trim().toLowerCase();
}

export function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || "Child";
}

/** Two requests describe the same child when first name and age match inside one family. */
export function sameChild(
  a: { full_name: string; age: number | null },
  b: { full_name: string; age: number | null },
): boolean {
  return firstName(a.full_name).toLowerCase() === firstName(b.full_name).toLowerCase() && (a.age ?? null) === (b.age ?? null);
}
