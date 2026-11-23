import type { ChildRow, FamilyRow, SponsorRow, Status } from "./types";

/** Local preview only. Never active on a Vercel production deployment. */
export function demoMode(): boolean {
  return process.env.ANGEL_DEMO === "1" && process.env.VERCEL_ENV !== "production";
}

const GIRLS = ["Aaliyah", "Brielle", "Camila", "Dani", "Eden", "Faith", "Gianna", "Harper", "Imani", "Jada", "Kennedy", "Layla", "Maya", "Nia", "Olivia", "Paisley", "Quinn", "Riley", "Skylar", "Tessa", "Unique", "Zuri", "Amara", "Bria", "Cora", "Dasia", "Elise", "Fatima", "Gracie", "Hana", "Ivy", "Jordyn", "Kiara", "Lena", "Mila", "Nora"];
const BOYS = ["Aiden", "Brandon", "Caleb", "Deshawn", "Elijah", "Franklin", "Gavin", "Isaiah", "Jalen", "Kendrick", "Liam", "Micah", "Noah", "Omari", "Preston", "Quincy", "Rashad", "Sebastian", "Tyrese", "Xavier", "Zion", "Andre", "Cameron", "Devin"];
const LAST = ["Brooks", "Carter", "Dixon", "Evans", "Foster", "Grant", "Hayes", "Irving", "Jenkins", "Knox", "Lewis", "Mason", "Nelson", "Owens", "Parker", "Reed", "Sims", "Turner"];
const PARENT = ["Monica", "Tamika", "Renee", "Andre", "Keisha", "Marcus", "Janelle", "Derrick", "Simone", "Terrence"];
const KS: Record<number, string> = { 4: "4T", 5: "5", 6: "6", 7: "7", 8: "8", 9: "10", 10: "12", 11: "14", 12: "14/16", 13: "Adult XS", 14: "Adult S", 15: "Adult S", 16: "Adult M", 17: "Adult M" };
const SH: Record<number, string> = { 4: "10 toddler", 5: "11", 6: "12", 7: "13", 8: "1", 9: "2", 10: "3", 11: "4", 12: "5", 13: "6", 14: "7", 15: "8", 16: "9", 17: "9.5" };
const WY = ["Magna-Tiles set", "LEGO Classic bricks", "Squishmallow (12 in)", "Play-Doh kit", "Art easel", "Dress-up set", "Hot Wheels track", "Plush puppy", "Playmobil set", "Light-up sneakers", "Puzzle (100 piece)", "Dinosaur set"];
const WT = ["Instax Mini camera", "Squishy fidget set", "Friendship bracelet kit", "Rhinestone bedazzling kit", "Acrylic paint pens", "Nintendo Switch game", "Bluetooth speaker", "Bean bag chair", "Wearable blanket", "LEGO Technic set", "Sketchbook and pens", "Gentle skincare set"];
const WN = ["Wireless earbuds", "Wooden book lamp", "Aesthetic school supplies", "Makeup brush set", "Cozy hoodie", "Body mist", "Phone case", "Heated blanket", "Lash kit", "Portable charger", "Backpack", "Journal"];
const ND = ["Socks (6 pack)", "Underwear", "Pajamas", "Winter coat", "Hoodie", "Hair care products", "Toothbrush set", "Gloves and beanie", "Body wash and lotion", "School supplies", "Bedding set", "Sneakers"];
const FV = ["Gymnastics", "Drawing", "Singing", "Dancing", "Basketball", "Soccer", "Minecraft", "Taylor Swift", "Bluey", "LEGO", "Slime", "Football", "Reading", "Cooking", "Animals"];
const GC = [["Target", "Walmart", "Amazon"], ["Target", "Amazon", "Barnes & Noble"], ["Ulta", "Hot Topic", "Nike", "Gap", "Target"]];

function pick(pool: string[], i: number, k: number, n: number): string[] {
  const out: string[] = [];
  for (let j = 0; out.length < n && j < pool.length * 3; j++) {
    const x = pool[(i * 3 + k * 5 + j * 7) % pool.length];
    if (!out.includes(x)) out.push(x);
  }
  return out;
}

let cache: ChildRow[] | null = null;

export function demoChildren(): ChildRow[] {
  if (cache) return cache;
  const sizes = [1, 2, 1, 3, 1, 1, 2, 1];
  const rows: ChildRow[] = [];
  const families: FamilyRow[] = [];
  let i = 0;
  let f = 0;
  while (i < 60) {
    const size = Math.min(sizes[f % sizes.length], 60 - i);
    const last = LAST[f % LAST.length];
    const fam: FamilyRow = {
      id: `fam${f}`,
      parent_name: `${PARENT[f % PARENT.length]} ${last}`,
      phone: `404-555-01${String(f % 100).padStart(2, "0")}`,
      email: `family${f + 1}@example.com`,
      story: "Sample request. This family is fictional.",
      source_label: "Demo data",
      created_at: new Date(2026, 10, 6).toISOString(),
    };
    families.push(fam);
    for (let k = 0; k < size; k++, i++) {
      const girl = i % 5 < 3;
      const gi = Math.floor(i / 5) * 3 + (i % 5);
      const bi = Math.floor(i / 5) * 2 + ((i % 5) - 3);
      const first = girl ? GIRLS[gi % GIRLS.length] : BOYS[bi % BOYS.length];
      const age = 4 + ((i * 7) % 14);
      const band = age <= 8 ? 0 : age <= 12 ? 1 : 2;
      const pool = band === 0 ? WY : band === 1 ? WT : WN;
      const stores = GC[band];
      let shoe = SH[age];
      if (!girl && age >= 9) shoe = String(parseFloat(shoe) + 1);
      const claimed = (i * 13) % 5 < 3 && i < 40;
      const status: Status = !claimed ? "available" : (["claimed", "claimed", "purchased", "claimed", "purchased", "returned"][i % 6] as Status);
      const sponsor: SponsorRow | null = claimed
        ? { id: `sp${i}`, name: `Sample Sponsor ${i + 1}`, email: `sponsor${i + 1}@example.com`, phone: `770-555-01${String(i % 100).padStart(2, "0")}`, token: `demosponsor${i}` }
        : null;
      rows.push({
        id: `demo-${i + 1}`,
        no: i + 1,
        family_id: fam.id,
        full_name: `${first} ${last}`,
        first_name: first,
        age,
        gender: girl ? "Girl" : "Boy",
        tops: KS[age],
        bottoms: KS[age],
        shoes: shoe,
        wants: pick(pool, i, 1, 6),
        needs: pick(ND, i, 2, 4),
        faves: pick(FV, i, 3, 3),
        fav_color: i % 3 === 0 ? ["Red", "Blue", "Purple", "Green"][i % 4] : null,
        gift_store: i % 4 !== 3 ? stores[i % stores.length] : null,
        gift_amount: i % 4 !== 3 ? [15, 20, 25][i % 3] : null,
        gift_card_status: claimed && i % 3 === 0 && i % 4 !== 3 ? (status === "returned" ? "received" : "pledged") : "none",
        photo_path: i % 3 === 1 ? "demo" : null,
        photo_public: i % 6 === 1,
        approved: true,
        status,
        sponsor_id: sponsor?.id ?? null,
        claimed_at: claimed ? new Date(2026, 10, 8 + (i % 14)).toISOString() : null,
        returned_at: status === "returned" ? new Date(2026, 10, 20).toISOString() : null,
        organizer_notes: null,
        family: fam,
        sponsor,
      });
    }
    f++;
  }
  cache = rows;
  return rows;
}
