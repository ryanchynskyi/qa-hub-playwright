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
  /** Картки screen, key = chapter id; the card inside is Recall's (`RecallPage`). */
  readonly cards: Locator;
  /** Result: score of the Тест (v correct, t total), its XP chip (v, absent at 0), the bar. */
  readonly score: Locator;
  readonly xp: Locator;
  readonly scoreBar: Locator;
  /** One segment per question of the scored step (they carry no test id or state). */
  readonly scoreSegments: Locator;
  /** «Повторити помилки · N» (→ `…/retry`), absent when nothing is wrong. */
  readonly failRetry: Locator;
  /** Fail run wrapper (key = chapter id), its skip and finish, and the fixed line on the result. */
  readonly retry: Locator;
  readonly retrySkip: Locator;
  readonly retryFinish: Locator;
  readonly retryFixed: Locator;
  /** «До підсумку курсу» link of the result → `/course/<slug>/done`. */
  readonly summaryLink: Locator;

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
    this.cards = page.getByTestId('course-cards');
    this.score = page.getByTestId('course-score');
    this.xp = page.getByTestId('course-xp');
    this.scoreBar = page.getByTestId('course-score-bar');
    this.scoreSegments = this.scoreBar.locator('span');
    this.failRetry = page.getByTestId('course-fail-retry');
    this.retry = page.getByTestId('course-retry');
    this.retrySkip = page.getByTestId('course-retry-skip');
    this.retryFinish = page.getByTestId('course-retry-finish');
    this.retryFixed = page.getByTestId('course-retry-fixed');
    this.summaryLink = page.getByTestId('course-summary-link');
  }

  /** Article `n` (1-based, as the route has it) of a Playwright chapter. */
  async gotoArticle(chapterId: string, n: number): Promise<void> {
    await this.page.goto(`course/playwright/${chapterId}/article/${n}`);
  }

  async gotoStep(
    chapterId: string,
    step: 'practice' | 'test' | 'cards' | 'result' | 'retry',
  ): Promise<void> {
    await this.page.goto(`course/playwright/${chapterId}/${step}`);
  }

  /**
   * A visit with an empty router state. A reload or a goto to the URL already open keeps
   * `history.state` (the retried ids of a Fail run), so the page is left first.
   */
  async gotoStepFresh(chapterId: string, step: 'result'): Promise<void> {
    await this.page.goto('about:blank');
    await this.gotoStep(chapterId, step);
  }

  /** A row of «По кроках» on the result: state done/todo, v, t. */
  resultStep(key: 'article' | 'practice' | 'test' | 'cards'): Locator {
    return byTestId(this.page, 'course-result-step', key);
  }

  /** N of «Повторити помилки · N»: the button has no data-value, the number is its only digits. */
  // shortcut: parses the only digits of the label; ask the app for data-value on course-fail-retry.
  async failRetryCount(): Promise<number> {
    const digits = /\d+/.exec((await this.failRetry.textContent()) ?? '');
    if (!digits) throw new Error('course-fail-retry shows no number');
    return Number(digits[0]);
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
