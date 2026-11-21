import { expect } from '@playwright/test';
import type { ApiClient, Credentials, InterviewInput } from '../api/client';
import type { Catalog, Interview } from '../api/schemas';
import type { Shell } from '../components/shell';
import type { DashboardPage } from '../pages/dashboard-page';
import type { InterviewsPage } from '../pages/interviews-page';

/**
 * Base date of the server-clock tests (project `clock`): years ahead, so a jump never goes back
 * before an account's creation; December, far from DST changes. Every instant is built from it.
 */
const BASE = '2030-12-03';

/** The calendar date `n` days after the base date, `YYYY-MM-DD`. */
export function day(n: number): string {
  const date = new Date(`${BASE}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/** 12:00 Europe/Kyiv (winter, UTC+2) on the day `n` after the base date: far from midnight. */
export const noon = (n: number): string => `${day(n)}T10:00:00Z`;

/** `YYYY-MM-DD` as the dashboard prints a date: `DD.MM`. */
export const ddmm = (date: string): string => `${date.slice(8, 10)}.${date.slice(5, 7)}`;

/**
 * Every chapter of the first `topics` topics. One topic is enough for a plan and for «Фініш» to
 * fill 15 items; with one, every plan day has the same topic, so a move between days needs two.
 */
export function topicChapters(catalog: Catalog, topics = 1): string[] {
  const ids = [...new Set(catalog.chapters.map((c) => c.topicId))].slice(0, topics);
  return catalog.chapters.filter((c) => ids.includes(c.topicId)).map((c) => c.id);
}

/** A middle-level interview on `date` over one topic, 15 minutes a day. */
export const interviewInput = (catalog: Catalog, date: string): InterviewInput => ({
  date,
  level: 'middle',
  chapterIds: topicChapters(catalog),
  minutesPerDay: 15,
});

/** A count inside a text that also holds other digits: `60` but not `600` or `160`. */
export const wholeNumber = (n: number): RegExp => new RegExp(`(^|\\D)${n}(\\D|$)`);

/**
 * Clock D0, an interview on D0+2 over one topic, `rate` of its recall cards rated 1 (the «Фініш»
 * takes up to 8 of them). Returns a token valid until the next clock move.
 */
export async function interviewWithMistakes(
  api: ApiClient,
  catalog: Catalog,
  serverClock: (at: string) => Promise<void>,
  user: Credentials,
  rate: number,
): Promise<string> {
  await serverClock(noon(0));
  const token = (await api.login(user)).accessToken;
  const chapterIds = topicChapters(catalog);
  await api.createInterview(token, {
    date: day(2),
    level: 'middle',
    chapterIds,
    minutesPerDay: 15,
  });
  const cards = (await api.recallCards())
    .filter((card) => chapterIds.includes(card.chapterId))
    .slice(0, rate);
  expect(cards, 'cards to rate badly').toHaveLength(rate);
  for (const card of cards) await api.rateCard(token, card.id, 1);
  return token;
}

/** Clock D0, an interview on D0+1 over one topic, then the clock on D0+`jump` (log in again). */
export async function interviewThenJump(
  api: ApiClient,
  catalog: Catalog,
  serverClock: (at: string) => Promise<void>,
  user: Credentials,
  jump: number,
): Promise<Interview> {
  await serverClock(noon(0));
  const token = (await api.login(user)).accessToken;
  const interview = await api.createInterview(token, interviewInput(catalog, day(1)));
  await serverClock(noon(jump));
  return interview;
}

/**
 * A fresh page load of the history (its row proves GET /me/interviews answered), then the dashboard
 * through the in-app link: `ask-card`, `asked-card` and the ticker item `ask` come from that cached
 * answer, so they are decided on the dashboard's first render and an absence check cannot run early.
 */
export async function dashAfterInterviews(
  interviews: InterviewsPage,
  shell: Shell,
  dashboard: DashboardPage,
  id: string,
): Promise<void> {
  await interviews.goto();
  await expect(interviews.row(id)).toBeVisible();
  await shell.open('dash');
  await expect(dashboard.root).toBeVisible();
}
