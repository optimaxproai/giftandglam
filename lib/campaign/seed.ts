import type { Campaign } from "./service";

const kid = (fullName: string, age: number | null, gender: "Girl" | "Boy" | "Other", wants: string[], needs: string[], extra: { ageUnsure?: boolean; faves?: string[]; tops?: string; shoes?: string } = {}) => ({
  fullName, age, gender, wants, needs, faves: extra.faves ?? [], tops: extra.tops, shoes: extra.shoes, ageUnsure: extra.ageUnsure,
});

/**
 * Fictional 2026 records for the review build. Every name, phone and email is made up.
 * Public tree: exactly ONE angel. Also: a household with only an over-age applicant,
 * a household with an eligible sibling and an over-age sibling, and households with missing or uncertain ages.
 */
export async function seedCampaignReview(c: Campaign) {
  const by = "review-build";
  // 1. Approved. One child is published (the only angel on the tree); her brother is approved but not published yet.
  const a = await c.enterHousehold({ parentName: "Jordan Sample", phone: "555-0110", email: "jordan.sample@example.com", story: "Fictional review note: sample hardship text that only organizers can read.", source: "Fictional printed email", kids: [
    kid("Casey Sample", 8, "Girl", ["Art easel set", "LEGO Classic bricks", "Illustrated animal encyclopedia", "Light-up sneakers"], ["Winter coat", "Socks (6 pack)", "Pajamas"], { faves: ["Drawing", "Animals"], tops: "Youth M", shoes: "1" }),
    kid("Drew Sample", 6, "Boy", ["Dinosaur set", "Hot Wheels track"], ["Rain boots", "Underwear"], { faves: ["Dinosaurs"] }),
  ] }, by);
  for (const k of a.children) await c.decide(k.id, "approved", { by });
  await c.publish(a.children[0].id);

  // 2. Only applicant is over the age limit: set aside automatically, out of the active queue.
  await c.enterHousehold({ parentName: "Avery Example", phone: "555-0111", email: "avery.example@example.com", story: "Fictional review note.", kids: [kid("Morgan Example", 21, "Boy", ["Work boots"], ["Winter coat"])] }, by);

  // 3. Eligible sibling stays in review; the over-age sibling is set aside inside the same household.
  await c.enterHousehold({ parentName: "Quinn Placeholder", phone: "555-0112", email: "quinn.placeholder@example.com", story: "Fictional review note.", kids: [
    kid("Riley Placeholder", 9, "Girl", ["Bike helmet", "Sketchbook and pens"], ["Sneakers", "Gloves and beanie"], { faves: ["Biking"] }),
    kid("Sky Placeholder", 19, "Boy", ["Headphones"], ["Hoodie"]),
  ] }, by);

  // 4. Missing age and an uncertain age: flagged for the organizer.
  await c.enterHousehold({ parentName: "Robin Testfield", phone: "555-0113", email: "robin.testfield@example.com", story: "Fictional review note.", kids: [
    kid("Harper Testfield", null, "Girl", ["Craft kit"], ["Socks"]),
    kid("Eli Testfield", 12, "Boy", ["Basketball"], ["Jeans"], { ageUnsure: true }),
  ] }, by);
}
