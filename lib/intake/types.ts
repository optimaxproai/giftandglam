export type Scope = "household" | "child";
export type QType = "text" | "longtext" | "number" | "choice" | "list";
/** Standard meanings the app relies on when it builds the public card and shows names in the queue. */
export type StdKey = "parent_name" | "phone" | "email" | "hardship" | "child_name" | "age" | "wishes" | "needs" | "sizes" | "interests";

export type Question = {
  id: string;
  scope: Scope;
  key?: StdKey;
  prompt: string;
  help?: string;
  type: QType;
  options?: string[];
  required: boolean;
};

export type Questionnaire = {
  id: string;
  season: string;
  status: "draft" | "published" | "archived";
  version: number;
  questions: Question[];
  updatedAt: string;
  publishedAt?: string;
};

/** One answer exactly as submitted: the wording is copied in, so later questionnaire edits never change it. */
export type AnswerSnap = {
  questionId: string;
  key?: StdKey;
  scope: Scope;
  prompt: string;
  type: QType;
  required: boolean;
  options?: string[];
  value: string | string[];
};

/** The only part of a child that sponsors ever see (besides the angel code). */
export type PublicCard = { ageRange: string; wishes: string[]; needs: string[]; sizes: string; interests: string[] };

export type ChildApp = {
  id: string;
  answers: AnswerSnap[];
  code?: string;
  card?: PublicCard;
  published: boolean;
  publishedAt?: string;
};

export type AppStatus = "submitted" | "needs_info" | "approved" | "declined";

export type Application = {
  id: string;
  season: string;
  questionnaireId: string;
  questionnaireVersion: number;
  status: AppStatus;
  submittedAt: string;
  household: AnswerSnap[];
  children: ChildApp[];
  reviewNote?: string;
  reviewer?: string;
  decidedAt?: string;
};

export type PublishedCard = { childId: string; applicationId: string; code: string; card: PublicCard };

/** Low-level persistence. Memory (review build, tests) and Supabase (production) both implement it. */
export interface IntakeStore {
  listQuestionnaires(season: string): Promise<Questionnaire[]>;
  putQuestionnaire(q: Questionnaire): Promise<void>;
  listApplications(season: string): Promise<Application[]>;
  getApplication(id: string): Promise<Application | null>;
  putApplication(a: Application): Promise<void>;
  /** Reserves n consecutive angel numbers and returns the first. */
  nextCodes(season: string, n: number): Promise<number>;
}

export class IntakeError extends Error {
  constructor(message: string, public code: "invalid" | "closed" | "not_found" | "conflict" = "invalid") {
    super(message);
  }
}
