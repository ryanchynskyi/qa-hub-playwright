import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { z } from 'zod';
import {
  AdminAsked,
  AdminAskedItem,
  ApiError,
  AdminBugReport,
  AdminBugReports,
  AdminFeedback,
  AdminFeedbackItem,
  AskedQuestions,
  AskedSearch,
  AuthResponse,
  BugReportCreated,
  Catalog,
  CheckResult,
  type CourseSlug,
  Comments,
  DailyCount,
  FeedbackCreated,
  Health,
  ImportResult,
  InterviewResponse,
  Interviews,
  KbChapter,
  Leaderboard,
  MyFeedback,
  Plan,
  PlanCards,
  PlanStart,
  PlanUpdate,
  Progress,
  Question,
  RateResult,
  RecallCard,
  SavedAskedQuestions,
  SearchHits,
  User,
  type Interview,
  type InterviewOutcome,
  type Lang,
  type QuestionLevel,
  type UploadStatus,
} from './schemas';

/** What the dialogs send beside the text; `route` and `viewport` are required by the API. */
export const UPLOAD_CONTEXT = { route: '/dash', lang: 'uk', viewport: '1280x800' } as const;

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterInput extends Credentials {
  displayName?: string;
  timeZone?: string;
  remember?: boolean;
}

/** Body of POST /me/interviews; `date` is the user's local `YYYY-MM-DD`, tomorrow … today + 7. */
export interface InterviewInput {
  date: string;
  level: QuestionLevel;
  chapterIds: string[];
  minutesPerDay: 15 | 30 | 60;
  replace?: boolean;
}

/** Body of POST /me/import ($APP_DIR packages/shared/src/import.schema.ts); unused parts stay `{}`. */
export interface ImportPayload {
  source: 'guest' | 'legacy';
  questions: Record<string, { lastResult: 0 | 1; attempts?: number }>;
  cards: Record<string, never>;
  articlesRead: Record<string, number>;
  attempts: Record<string, never>;
}

/**
 * Typed wrapper over Playwright's APIRequestContext for the QA Hub API (docs/brief.md §8).
 *
 * Two levels on purpose:
 * - typed methods (`health()`, `login()`, ...) for the happy path and test-data setup: they
 *   assert the status and parse the body with the zod schema, so a broken contract fails here,
 *   with a clear message, and the caller gets a typed object;
 * - `raw` for negative tests that need the status and the error body as they are, and for
 *   "this field must not be there" checks: zod drops unknown keys while parsing, so a parsed
 *   object can never show a leaked field.
 *
 * The context is created by the `api` fixture with baseURL = env.apiURL (ends with '/'), so all
 * paths here are relative and have no leading slash.
 */
export class ApiClient {
  constructor(readonly raw: APIRequestContext) {}

  health(): Promise<Health> {
    return this.getJson('health', Health);
  }

  catalog(lang: Lang = 'uk'): Promise<Catalog> {
    return this.getJson(`content/catalog?lang=${lang}`, Catalog);
  }

  questions(sectionId: string, lang: Lang = 'uk'): Promise<Question[]> {
    return this.getJson(`sections/${sectionId}/questions?lang=${lang}`, Question.array());
  }

  /**
   * Checks an answer. Without a token nothing is recorded, so `choice: null` is a safe way to
   * learn the correct option of a question for a deterministic UI test. With a token the answer
   * counts for that user (progress and XP). `first` marks a guest's first answer: the server
   * trusts it and counts it into the question's correct-answer share (`stat`). `course` also
   * writes the answer into that course's own record (a signed-in `choice: null` is a skip there).
   */
  checkAnswer(
    questionId: string,
    choice: number | null,
    token?: string,
    first?: boolean,
    course?: CourseSlug,
  ): Promise<CheckResult> {
    return this.postJson('quiz/check', { questionId, choice, first, course }, CheckResult, token);
  }

  async correctIndex(questionId: string): Promise<number> {
    return (await this.checkAnswer(questionId, null)).correctIndex;
  }

  recallCards(lang: Lang = 'uk'): Promise<RecallCard[]> {
    return this.getJson(`recall/cards?lang=${lang}`, RecallCard.array());
  }

  /** Rates a card 1..5 for the account; XP only for a new or due card, once per local day. */
  rateCard(
    token: string,
    cardId: string,
    rating: number,
    course?: CourseSlug,
  ): Promise<RateResult> {
    return this.postJson('me/recall/rate', { cardId, rating, course }, RateResult, token);
  }

  search(q: string, limit?: number): Promise<z.infer<typeof SearchHits>> {
    const params = new URLSearchParams({ q });
    if (limit !== undefined) params.set('limit', String(limit));
    return this.getJson(`kb/search?${params.toString()}`, SearchHits);
  }

  /** Article ids of a chapter, for `readArticle`. */
  chapter(chapterId: string): Promise<KbChapter> {
    return this.getJson(`kb/chapters/${chapterId}`, KbChapter);
  }

  leaderboard(period: 'all' | 'week' = 'all', token?: string): Promise<Leaderboard> {
    return this.getJson(`leaderboard?period=${period}`, Leaderboard, token);
  }

  register(input: RegisterInput): Promise<AuthResponse> {
    return this.postJson(
      'auth/register',
      { timeZone: 'Europe/Kyiv', ...input },
      AuthResponse,
      undefined,
      201,
    );
  }

  login(credentials: Credentials & { remember?: boolean }): Promise<AuthResponse> {
    return this.postJson('auth/login', credentials, AuthResponse);
  }

  /**
   * Rotates a refresh token sent in the body ("remember me" keeps it in `qa-hub-rt`). The server
   * prefers the `qa_rt` cookie, and this context keeps the cookie from its own login/register.
   */
  refresh(refreshToken: string): Promise<AuthResponse> {
    return this.postJson('auth/refresh', { refreshToken }, AuthResponse);
  }

  /** POST /auth/logout (204): ends every live token of the presented token's family. */
  async logout(refreshToken: string): Promise<void> {
    const res = await this.raw.post('auth/logout', { data: { refreshToken } });
    await expectStatus(res, 204);
  }

  me(token: string): Promise<User> {
    return this.getJson('auth/me', User, token);
  }

  progress(token: string): Promise<Progress> {
    return this.getJson('me/progress', Progress, token);
  }

  /** Moves guest (or legacy) progress into the account; the server recomputes the XP. */
  importProgress(token: string, payload: ImportPayload): Promise<ImportResult> {
    return this.postJson('me/import', payload, ImportResult, token);
  }

  /** Records a finished run; every question must have been answered in this sitting. */
  async finishQuiz(token: string, sectionId: string, questionIds: string[]): Promise<void> {
    const res = await this.raw.post('me/quiz/finish', {
      data: { sectionId, questionIds },
      headers: bearer(token),
    });
    await expectStatus(res, 200);
  }

  /** An untouched set takes the new size at once; a started one keeps its size until tomorrow. */
  async setDailyCount(token: string, count: number): Promise<DailyCount> {
    const res = await this.raw.put('me/daily-count', { data: { count }, headers: bearer(token) });
    await expectStatus(res, 200);
    return DailyCount.parse(await res.json());
  }

  /** Marks an article read for the account (what advances a READ_ARTICLE task); `course` also
   * marks it in that course's record. Unscoped it stays body-less, as the KB page sends it. */
  async readArticle(token: string, articleId: string, course?: CourseSlug): Promise<void> {
    const res = await this.raw.post(`me/articles/${articleId}/read`, {
      headers: bearer(token),
      ...(course && { data: { course } }),
    });
    await expectStatus(res, 200);
  }

  /** «Скинути прогрес курсу» (204): clears only that course's record; XP and the rest stay. */
  async resetCourse(token: string, slug: CourseSlug): Promise<void> {
    const res = await this.raw.post(`me/courses/${slug}/reset`, { headers: bearer(token) });
    await expectStatus(res, 204);
  }

  /** POST /me/password (204); other sessions of the account end, this one stays. */
  async changePassword(token: string, currentPassword: string, newPassword: string): Promise<void> {
    const res = await this.raw.post('me/password', {
      data: { currentPassword, newPassword },
      headers: bearer(token),
    });
    await expectStatus(res, 204);
  }

  sendBugReport(text: string, token?: string): Promise<z.infer<typeof BugReportCreated>> {
    const data = { ...UPLOAD_CONTEXT, text };
    return this.postJson('bug-reports', data, BugReportCreated, token, 201);
  }

  sendFeedback(rating: number, token?: string): Promise<z.infer<typeof FeedbackCreated>> {
    const data = { ...UPLOAD_CONTEXT, rating };
    return this.postJson('feedback', data, FeedbackCreated, token, 201);
  }

  adminBugReports(adminToken: string): Promise<AdminBugReports> {
    return this.getJson('admin/bug-reports', AdminBugReports, adminToken);
  }

  async setBugStatus(
    adminToken: string,
    id: number,
    status: UploadStatus,
  ): Promise<z.infer<typeof AdminBugReport>> {
    const res = await this.raw.patch(`admin/bug-reports/${id}`, {
      data: { status },
      headers: bearer(adminToken),
    });
    await expectStatus(res, 200);
    return AdminBugReport.parse(await res.json());
  }

  adminFeedback(adminToken: string): Promise<z.infer<typeof AdminFeedback>> {
    return this.getJson('admin/feedback', AdminFeedback, adminToken);
  }

  async replyToFeedback(
    adminToken: string,
    id: string,
    reply: string,
  ): Promise<z.infer<typeof AdminFeedbackItem>> {
    const res = await this.raw.put(`admin/feedback/${id}/reply`, {
      data: { reply },
      headers: bearer(adminToken),
    });
    await expectStatus(res, 200);
    return AdminFeedbackItem.parse(await res.json());
  }

  myFeedback(token: string): Promise<z.infer<typeof MyFeedback>> {
    return this.getJson('me/feedback', MyFeedback, token);
  }

  /** Comments target a question (or another `targetType`) by id. */
  async postComment(token: string, targetId: string, text: string): Promise<void> {
    const res = await this.raw.post('comments', {
      data: { targetType: 'question', targetId, text },
      headers: bearer(token),
    });
    await expectStatus(res, 201);
  }

  async comments(targetId: string): Promise<Comments['items']> {
    const params = new URLSearchParams({ targetType: 'question', targetId });
    return (await this.getJson(`comments?${params}`, Comments)).items;
  }

  /** 201; a second active interview needs `replace: true` (else 409 `interview_exists`, use `raw`). */
  async createInterview(token: string, input: InterviewInput): Promise<Interview> {
    return (await this.postJson('me/interviews', input, InterviewResponse, token, 201)).interview;
  }

  interviews(token: string): Promise<Interviews> {
    return this.getJson('me/interviews', Interviews, token);
  }

  plan(token: string): Promise<Plan> {
    return this.getJson('me/plan', Plan, token);
  }

  // The plan's body-less POSTs go without `data`: a JSON content-type with an empty body is a 400.

  /** Starts the day's test round; answer its questions with `checkAnswer(id, choice, token)`. */
  startPlanDay(token: string, date: string): Promise<PlanStart> {
    return this.postEmpty(`me/plan/days/${date}/start`, PlanStart, token);
  }

  /** The day's card step: picked at the first call, the same cards (and ratings) after it. */
  startPlanCards(token: string, date: string): Promise<PlanCards> {
    return this.postEmpty(`me/plan/days/${date}/cards/start`, PlanCards, token);
  }

  ratePlanCard(token: string, date: string, cardId: string, rating: number): Promise<PlanUpdate> {
    return this.postJson(`me/plan/days/${date}/cards/${cardId}`, { rating }, PlanUpdate, token);
  }

  /** 409 `not_answered` until every question of the started round is answered (use `raw`). */
  finishPlanDay(token: string, date: string): Promise<PlanUpdate> {
    return this.postEmpty(`me/plan/days/${date}/finish`, PlanUpdate, token);
  }

  /** «Сьогодні 1 год» (60) or back to the interview's minutes (null): PUT /me/plan/today. */
  async setPlanToday(token: string, minutes: 60 | null): Promise<void> {
    const res = await this.raw.put('me/plan/today', { data: { minutes }, headers: bearer(token) });
    await expectStatus(res, 200);
  }

  /** «Як пройшла?» on a past interview; freezes its readiness. */
  async setInterviewOutcome(
    token: string,
    id: string,
    outcome: InterviewOutcome,
  ): Promise<Interview> {
    const res = await this.raw.put(`me/interviews/${id}/outcome`, {
      data: { outcome },
      headers: bearer(token),
    });
    await expectStatus(res, 200);
    return InterviewResponse.parse(await res.json()).interview;
  }

  /** «Перенесли»: the same past interview on a new date (409 `interview_exists` without replace). */
  async moveInterview(
    token: string,
    id: string,
    body: { date: string; replace?: boolean },
  ): Promise<Interview> {
    return (await this.postJson(`me/interviews/${id}/move`, body, InterviewResponse, token))
      .interview;
  }

  askedQuestions(token: string, id: string): Promise<AskedQuestions> {
    return this.getJson(`me/interviews/${id}/questions`, AskedQuestions, token);
  }

  /** `questionIds` replace the marks, `texts` add own questions (for the admin inbox). */
  async saveAskedQuestions(
    token: string,
    id: string,
    body: { questionIds: string[]; texts: string[] },
  ): Promise<z.infer<typeof SavedAskedQuestions>> {
    const res = await this.raw.put(`me/interviews/${id}/questions`, {
      data: body,
      headers: bearer(token),
    });
    await expectStatus(res, 200);
    return SavedAskedQuestions.parse(await res.json());
  }

  async askedSearch(token: string, q: string): Promise<z.infer<typeof AskedSearch>['items']> {
    const params = new URLSearchParams({ q });
    return (await this.getJson(`quiz/search?${params}`, AskedSearch, token)).items;
  }

  adminAsked(adminToken: string): Promise<AdminAsked> {
    return this.getJson('admin/asked', AdminAsked, adminToken);
  }

  /** The owner marks an own question done or open again (PATCH /admin/asked/:id). */
  async setAskedStatus(
    adminToken: string,
    id: number,
    status: 'open' | 'done',
  ): Promise<z.infer<typeof AdminAskedItem>> {
    const res = await this.raw.patch(`admin/asked/${id}`, {
      data: { status },
      headers: bearer(adminToken),
    });
    await expectStatus(res, 200);
    return AdminAskedItem.parse(await res.json());
  }

  /**
   * The local e2e API's clock (never on prod): `{ at }` (ISO) or `{ offsetMs }` from real time,
   * global for the whole server. Tokens minted before a jump look expired after it: log in again.
   */
  async setClock(body: { at: string } | { offsetMs: number }): Promise<number> {
    const res = await this.raw.put('__e2e/clock', { data: body });
    await expectStatus(res, 200);
    return z.object({ now: z.number() }).parse(await res.json()).now;
  }

  /** Deletes the account the token belongs to (DELETE /me, 204). */
  async deleteAccount(token: string, email: string): Promise<void> {
    const res = await this.raw.delete('me', {
      headers: bearer(token),
      data: { confirmEmail: email },
    });
    await expectStatus(res, 204);
  }

  private async getJson<S extends z.ZodType>(
    path: string,
    schema: S,
    token?: string,
  ): Promise<z.infer<S>> {
    const res = await this.raw.get(path, { headers: bearer(token) });
    await expectStatus(res, 200);
    return schema.parse(await res.json());
  }

  private async postJson<S extends z.ZodType>(
    path: string,
    data: unknown,
    schema: S,
    token?: string,
    status = 200,
  ): Promise<z.infer<S>> {
    const res = await this.raw.post(path, { data, headers: bearer(token) });
    await expectStatus(res, status);
    return schema.parse(await res.json());
  }

  private async postEmpty<S extends z.ZodType>(
    path: string,
    schema: S,
    token: string,
  ): Promise<z.infer<S>> {
    const res = await this.raw.post(path, { headers: bearer(token) });
    await expectStatus(res, 200);
    return schema.parse(await res.json());
  }
}

export function bearer(token?: string): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {};
}

/** Status check whose failure message shows the method, URL and body, not just "500 !== 200". */
export async function expectStatus(res: APIResponse, status: number): Promise<void> {
  if (res.status() === status) return;
  const body = await res.text().catch(() => '<no body>');
  expect(res.status(), `${res.url()} returned ${res.status()}: ${body.slice(0, 500)}`).toBe(status);
}

/** A rejection in the common error format: the status, then the `error` code. */
export async function expectError(res: APIResponse, status: number, error: string): Promise<void> {
  await expectStatus(res, status);
  expect(ApiError.parse(await res.json()).error, res.url()).toBe(error);
}
