import type { Locator, Page } from '@playwright/test';
import type { CourseSlug } from '../api/schemas';
import { byTestId } from '../helpers/locators';

/** `/course/<slug>`: the programme of chapters, the desktop panel and the reset dialog. */
export class CoursePage {
  readonly root: Locator;
  readonly chapters: Locator;
  readonly panelCta: Locator;
  readonly progress: Locator;
  readonly reset: Locator;
  readonly resetDialog: Locator;
  readonly resetConfirm: Locator;
  readonly resetCancel: Locator;
  readonly guestBox: Locator;
  readonly guestLogin: Locator;
  readonly guestRegister: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('course-page');
    this.chapters = page.getByTestId('course-chapter');
    this.panelCta = page.getByTestId('course-panel-cta');
    this.progress = page.getByTestId('course-progress');
    this.reset = page.getByTestId('course-reset');
    this.resetDialog = page.getByTestId('course-reset-dialog');
    this.resetConfirm = page.getByTestId('course-reset-confirm');
    this.resetCancel = page.getByTestId('course-reset-cancel');
    this.guestBox = page.getByTestId('course-guest-box');
    this.guestLogin = page.getByTestId('course-guest-login');
    this.guestRegister = page.getByTestId('course-guest-register');
  }

  async goto(slug: CourseSlug = 'playwright'): Promise<void> {
    await this.page.goto(`course/${slug}`);
  }

  chapter(id: string): Locator {
    return byTestId(this.page, 'course-chapter', id);
  }

  /** Expand button of a row; a locked row has none. */
  toggle(chapterId: string): Locator {
    return this.chapter(chapterId).getByTestId('course-chapter-toggle');
  }

  /** «N кроків»: on desktop only on todo and locked rows. */
  lessons(chapterId: string): Locator {
    return this.chapter(chapterId).getByTestId('course-chapter-lessons');
  }

  /** A step chip of an open chapter: `article-<articleId>`, `practice`, `test`, `cards`. */
  step(chapterId: string, key: string): Locator {
    return byTestId(this.chapter(chapterId), 'course-step', key);
  }

  /** `data-key` of every chapter row, in order. */
  chapterIds(): Promise<string[]> {
    return this.chapters.evaluateAll((els) => els.map((el) => el.getAttribute('data-key') ?? ''));
  }
}
