import { demoMode } from "../demo";
import { createMemoryStore } from "./memory";
import { createIntake, type Intake } from "./service";
import { seedReview } from "./seed";
import { createSupabaseStore } from "./supabaseStore";
import { INTAKE_SEASON } from "../drive";

type Holder = { intake: Intake; ready: Promise<void> };
const g = globalThis as unknown as { __angelReview?: Holder };

function freshReview(): Holder {
  const intake = createIntake(createMemoryStore());
  return { intake, ready: seedReview(intake, INTAKE_SEASON) };
}

/** Review build and local demo use fictional in-memory data. Everything else uses Supabase. */
export async function getIntake(): Promise<Intake> {
  if (demoMode()) {
    g.__angelReview ??= freshReview();
    await g.__angelReview.ready;
    return g.__angelReview.intake;
  }
  return createIntake(createSupabaseStore());
}

export async function resetReview(): Promise<void> {
  g.__angelReview = freshReview();
  await g.__angelReview.ready;
}
