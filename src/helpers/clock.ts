import type { Catalog } from '../api/schemas';

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

/** A count inside a text that also holds other digits: `60` but not `600` or `160`. */
export const wholeNumber = (n: number): RegExp => new RegExp(`(^|\\D)${n}(\\D|$)`);
