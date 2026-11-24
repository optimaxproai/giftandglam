import { Q } from "./defaults";
import type { Intake } from "./service";

/**
 * Fictional review data: one approved application (NOT yet published, so the shared tree keeps exactly one angel:
 * the 2026 one), plus two applications waiting in the queue. Publishing the 2027 angel is a step reviewers can try.
 * Every name, address and phone number here is made up.
 */
export async function seedReview(intake: Intake, season: string) {
  await intake.publish(season);
  const parent = (name: string, phone: string, email: string, hardship: string) => ({
    [Q.parentName]: name,
    [Q.phone]: phone,
    [Q.email]: email,
    [Q.hardship]: hardship,
  });
  const kid = (name: string, age: string, wishes: string[], needs: string[], sizes: string, interests: string[]) => ({
    [Q.childName]: name,
    [Q.age]: age,
    [Q.wishes]: wishes,
    [Q.needs]: needs,
    [Q.sizes]: sizes,
    [Q.interests]: interests,
  });

  const a = await intake.submit(season, {
    household: parent("Taylor Sample", "555-0100", "taylor.sample@example.com", "Fictional review answer: a sample hardship story that only organizers can read."),
    children: [kid("Ada Sample", "8", ["Art easel set", "LEGO Classic bricks", "Illustrated animal encyclopedia", "Light-up sneakers"], ["Winter coat", "Socks (6 pack)", "Pajamas"], "Shirt 8, pants 8, shoes 1", ["Drawing", "Animals", "Bicycles"])],
  });
  if (a.ok) {
    await intake.review(a.id, "approve", { reviewer: "review-build" });
  }

  await intake.submit(season, {
    household: parent("Morgan Example", "555-0101", "morgan.example@example.com", "Fictional review answer: sample text for the queue."),
    children: [
      kid("Ben Example", "12", ["Basketball", "Headphones", "Board game"], ["Hoodie", "Jeans", "Socks"], "Shirt Youth L, pants 14, shoes 5", ["Basketball"]),
      kid("Cleo Example", "5", ["Play-Doh kit", "Plush fox", "Picture books"], ["Pajamas", "Rain boots", "Underwear"], "Shirt 5, pants 5, shoes 11", ["Animals", "Painting"]),
    ],
  });

  const c = await intake.submit(season, {
    household: parent("Riley Placeholder", "555-0102", "riley.placeholder@example.com", "Fictional review answer: sample text."),
    children: [kid("Sam Placeholder", "15", ["Wireless earbuds", "Journal"], ["Sneakers", "Winter coat"], "Shirt Adult S", ["Music"])],
  });
  if (c.ok) await intake.review(c.id, "needs_info", { note: "Please confirm shoe size.", reviewer: "review-build" });
}
