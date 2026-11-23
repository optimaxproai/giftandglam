import type { Application, IntakeStore, Questionnaire } from "./types";

/** In-memory store for the review build and tests. Holds fictional data only and resets on a cold start. */
export function createMemoryStore(): IntakeStore {
  const qs = new Map<string, Questionnaire>();
  const apps = new Map<string, Application>();
  const counters = new Map<string, number>();
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
  return {
    async listQuestionnaires(season) {
      return [...qs.values()].filter((q) => q.season === season).map(clone);
    },
    async putQuestionnaire(q) {
      qs.set(q.id, clone(q));
    },
    async listApplications(season) {
      return [...apps.values()].filter((a) => a.season === season).map(clone);
    },
    async getApplication(id) {
      const a = apps.get(id);
      return a ? clone(a) : null;
    },
    async putApplication(a) {
      apps.set(a.id, clone(a));
    },
    async nextCodes(season, n) {
      const first = (counters.get(season) ?? 0) + 1;
      counters.set(season, first + n - 1);
      return first;
    },
  };
}
