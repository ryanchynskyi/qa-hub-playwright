import type { Locator, Page } from '@playwright/test';
import { byTestId } from '../helpers/locators';

/** Step keys of a chapter: the outline, `course-next` and `course-back` share them. */
export type StepKey = `article-${string}` | 'practice' | 'test' | 'cards' | 'result';

/**
 * A step screen of a course chapter (`/course/<slug>/<chapter>/…`): article, Практика, Тест,
 * Картки. The question card inside Практика and Тест is the quiz's own: answer it through
 * `QuizPage` (`question`, `options`, `verdict`, `next`, `answer*`), which reads the same page.
 */
export class CourseStepPage {
  readonly root: Locator;
  readonly ctx: Locator;
  readonly outline: Locator;
  readonly outlineItems: Locator;
  readonly article: Locator;
  readonly back: Locator;
  readonly next: Locator;
  readonly practice: Locator;
  readonly test: Locator;
  /** Chapter result screen (`…/<chapter>/result`), key = chapter id. */
  readonly result: Locator;
  readonly counter: Locator;
  readonly reread: Locator;
  readonly theory: Locator;
  readonly finish: Locator;
  readonly code: Locator;
  readonly levelLabel: Locator;
  readonly explanation: Locator;
  readonly guestBox: Locator;
  readonly guestLogin: Locator;
  readonly guestRegister: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('course-step-view');
    this.ctx = page.getByTestId('course-ctx');
    this.outline = page.getByTestId('course-outline');
    this.outlineItems = page.getByTestId('course-outline-item');
    this.article = page.getByTestId('course-article');
    this.back = page.getByTestId('course-back');
    this.next = page.getByTestId('course-next');
    this.practice = page.getByTestId('course-practice');
    this.test = page.getByTestId('course-test');
    this.result = page.getByTestId('course-result');
    this.counter = page.getByTestId('course-counter');
    this.reread = page.getByTestId('course-reread');
    this.theory = page.getByTestId('course-theory');
    this.finish = page.getByTestId('course-finish');
    this.code = page.getByTestId('quiz-code');
    this.levelLabel = page.getByTestId('quiz-level-label');
    this.explanation = page.getByTestId('quiz-explanation');
    this.guestBox = this.root.getByTestId('course-guest-box');
    this.guestLogin = this.root.getByTestId('course-guest-login');
    this.guestRegister = this.root.getByTestId('course-guest-register');
  }

  /** Article `n` (1-based, as the route has it) of a Playwright chapter. */
  async gotoArticle(chapterId: string, n: number): Promise<void> {
    await this.page.goto(`course/playwright/${chapterId}/article/${n}`);
  }

  async gotoStep(chapterId: string, step: 'practice' | 'test' | 'cards' | 'result'): Promise<void> {
    await this.page.goto(`course/playwright/${chapterId}/${step}`);
  }

  outlineItem(key: StepKey): Locator {
    return byTestId(this.page, 'course-outline-item', key);
  }

  /** `data-key` of every outline item, in order. */
  outlineKeys(): Promise<string[]> {
    return this.outlineItems.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-key') ?? ''),
    );
  }
}

/** The outline and step key of an article id. */
export function articleStep(articleId: string): StepKey {
  return `article-${articleId}`;
}
