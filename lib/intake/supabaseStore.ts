import { db } from "../supabase/admin";
import type { Application, IntakeStore, Questionnaire } from "./types";

type QRow = { id: string; season: string; status: Questionnaire["status"]; version: number; questions: Questionnaire["questions"]; updated_at: string; published_at: string | null };
const toQ = (r: QRow): Questionnaire => ({ id: r.id, season: r.season, status: r.status, version: r.version, questions: r.questions, updatedAt: r.updated_at, publishedAt: r.published_at ?? undefined });

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Production store. Needs the 20261201120000_family_intake_2027 migration. */
export function createSupabaseStore(): IntakeStore {
  return {
    async listQuestionnaires(season) {
      const rows = check(await db().from("intake_questionnaires").select("*").eq("season", season).order("version")) as QRow[];
      return rows.map(toQ);
    },
    async putQuestionnaire(q) {
      check(
        await db().from("intake_questionnaires").upsert({ id: q.id, season: q.season, status: q.status, version: q.version, questions: q.questions, updated_at: q.updatedAt, published_at: q.publishedAt ?? null }),
      );
    },
    async listApplications(season) {
      const rows = check(await db().from("intake_applications").select("data").eq("season", season)) as { data: Application }[];
      return rows.map((r) => r.data);
    },
    async getApplication(id) {
      const row = check(await db().from("intake_applications").select("data").eq("id", id).maybeSingle()) as { data: Application } | null;
      return row?.data ?? null;
    },
    async putApplication(a) {
      check(await db().from("intake_applications").upsert({ id: a.id, season: a.season, status: a.status, submitted_at: a.submittedAt, data: a }));
    },
    async nextCodes(season, n) {
      return Number(check(await db().rpc("intake_next_codes", { p_season: season, p_n: n })));
    },
  };
}
