import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { z } from 'zod';
import {
  AuthResponse,
  Catalog,
  ChatFeed,
  ChatMessage,
  CheckResult,
  Comments,
  Health,
  Leaderboard,
  Progress,
  Question,
  RecallCard,
  SearchHits,
  User,
  type Lang,
} from './schemas';

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterInput extends Credentials {
  displayName?: string;
  timeZone?: string;
  remember?: boolean;
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
   * trusts it and counts it into the question's correct-answer share (`stat`).
   */
  checkAnswer(
    questionId: string,
    choice: number | null,
    token?: string,
    first?: boolean,
  ): Promise<CheckResult> {
    return this.postJson('quiz/check', { questionId, choice, first }, CheckResult, token);
  }

  async correctIndex(questionId: string): Promise<number> {
    return (await this.checkAnswer(questionId, null)).correctIndex;
  }

  recallCards(lang: Lang = 'uk'): Promise<RecallCard[]> {
    return this.getJson(`recall/cards?lang=${lang}`, RecallCard.array());
  }

  search(q: string, limit?: number): Promise<z.infer<typeof SearchHits>> {
    const params = new URLSearchParams({ q });
    if (limit !== undefined) params.set('limit', String(limit));
    return this.getJson(`kb/search?${params.toString()}`, SearchHits);
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

  me(token: string): Promise<User> {
    return this.getJson('auth/me', User, token);
  }

  progress(token: string): Promise<Progress> {
    return this.getJson('me/progress', Progress, token);
  }

  /** Records a finished run; every question must have been answered in this sitting. */
  async finishQuiz(token: string, sectionId: string, questionIds: string[]): Promise<void> {
    const res = await this.raw.post('me/quiz/finish', {
      data: { sectionId, questionIds },
      headers: bearer(token),
    });
    await expectStatus(res, 200);
  }

  /** POST /me/password (204); other sessions of the account end, this one stays. */
  async changePassword(token: string, currentPassword: string, newPassword: string): Promise<void> {
    const res = await this.raw.post('me/password', {
      data: { currentPassword, newPassword },
      headers: bearer(token),
    });
    await expectStatus(res, 204);
  }

  postChat(token: string, text: string): Promise<ChatMessage> {
    return this.postJson('chat/messages', { text }, ChatMessage, token, 201);
  }

  async chatMessages(): Promise<ChatMessage[]> {
    return (await this.getJson('chat/messages', ChatFeed)).messages;
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
