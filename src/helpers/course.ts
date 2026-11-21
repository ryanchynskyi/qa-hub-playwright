import type { ApiClient } from '../api/client';
import type { Catalog, CourseSlug } from '../api/schemas';

/** Guests use the first chapters only (`COURSE_GUEST_CHAPTERS`, $APP_DIR packages/shared/src/course.ts). */
export const GUEST_CHAPTERS = 2;

/** One chapter of the Playwright course as the step screens build it, all ids in catalog order. */
export interface CourseChapter {
  id: string;
  /** 1-based place in the course. */
  position: number;
  articles: string[];
  /** Questions with code: the Практика step. */
  code: string[];
  /** The rest: the Тест step. */
  plain: string[];
  cards: string[];
}

/**
 * The Playwright course from the API: every chapter of the topic by `order` (the app reads the
 * same list), articles from the KB, Практика/Тест split by the question's `code`, which only
 * the section endpoint carries.
 */
export async function playwrightCourse(api: ApiClient, catalog: Catalog): Promise<CourseChapter[]> {
  const chapters = catalog.chapters
    .filter((c) => c.topicId === 'playwright')
    .sort((a, b) => a.order - b.order);
  const ids = new Set(chapters.map((c) => c.id));
  const questions = catalog.questions.filter((q) => ids.has(q.chapterId));
  const sections = [...new Set(questions.map((q) => q.sectionId))];
  const withCode = new Set(
    (await Promise.all(sections.map((id) => api.questions(id))))
      .flat()
      .filter((q) => q.code !== '')
      .map((q) => q.id),
  );
  return Promise.all(
    chapters.map(async (c, i) => {
      const own = questions.filter((q) => q.chapterId === c.id).map((q) => q.id);
      return {
        id: c.id,
        position: i + 1,
        articles: (await api.chapter(c.id)).articles.map((a) => a.id),
        code: own.filter((id) => withCode.has(id)),
        plain: own.filter((id) => !withCode.has(id)),
        cards: catalog.recallCards.filter((r) => r.chapterId === c.id).map((r) => r.id),
      };
    }),
  );
}

/** «N кроків» of a row: the articles plus each of Практика, Тест, Картки that exists. */
export function lessonCount(chapter: CourseChapter): number {
  const steps = [chapter.code, chapter.plain, chapter.cards].filter((ids) => ids.length > 0);
  return chapter.articles.length + steps.length;
}

/** What each picker needs, for the failure message. */
const NEEDS = {
  full: '>= 2 articles, >= 1 code, >= 3 plain questions, >= 2 cards',
  noCode: 'no code question, >= 1 plain question',
  noCards: 'no cards',
};

const SHAPES = {
  /** Every step, enough of each for the step scenarios. */
  full: (c: CourseChapter) =>
    c.articles.length >= 2 && c.code.length >= 1 && c.plain.length >= 3 && c.cards.length >= 2,
  /** No Практика. */
  noCode: (c: CourseChapter) => c.code.length === 0 && c.plain.length >= 1,
  /** No Картки. */
  noCards: (c: CourseChapter) => c.cards.length === 0,
};

/** The first chapter of a shape; fails naming the shape when today's content has none. */
export function chapterOf(course: CourseChapter[], shape: keyof typeof SHAPES): CourseChapter {
  const chapter = course.find(SHAPES[shape]);
  if (!chapter) throw new Error(`No Playwright course chapter "${shape}" (${NEEDS[shape]})`);
  return chapter;
}

/** The chapter at a 1-based place (3 = the first one a guest cannot open). */
export function chapterAt(course: CourseChapter[], position: number): CourseChapter {
  const chapter = course[position - 1];
  if (!chapter) throw new Error(`The Playwright course has no chapter ${position}`);
  return chapter;
}

/** A right answer inside a course (the index comes from a guest call, which records nothing). */
export async function answerInCourse(
  api: ApiClient,
  token: string,
  questionId: string,
  course: CourseSlug = 'playwright',
): Promise<string> {
  const choice = await api.correctIndex(questionId);
  return (await api.checkAnswer(questionId, choice, token, undefined, course)).outcome;
}

/** Does every step of a chapter inside the course: reads, right answers, ratings. */
export async function completeChapter(
  api: ApiClient,
  token: string,
  chapter: CourseChapter,
): Promise<void> {
  for (const id of chapter.articles) await api.readArticle(token, id, 'playwright');
  for (const id of [...chapter.code, ...chapter.plain]) await answerInCourse(api, token, id);
  for (const id of chapter.cards) await api.rateCard(token, id, 5, 'playwright');
}
