import type { Locator, Page } from '@playwright/test';
import type { CourseSlug } from '../api/schemas';
import { byTestId } from '../helpers/locators';

/** «Готуємо» chips of the catalog (test-ids.md, Courses). */
export type SoonKey = 'cypress' | 'selenium' | 'typescript' | 'sql' | 'appium';

/** `/course`: one card per course, the card ids repeat, so they are read inside `card(slug)`. */
export class CourseCatalogPage {
  readonly root: Locator;
  readonly cards: Locator;
  readonly soonChips: Locator;
  readonly soonNote: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('course-catalog');
    this.cards = page.getByTestId('course-card');
    this.soonChips = page.getByTestId('course-soon');
    this.soonNote = page.getByTestId('course-soon-note');
  }

  async goto(): Promise<void> {
    await this.page.goto('course');
  }

  card(slug: CourseSlug): Locator {
    return byTestId(this.page, 'course-card', slug);
  }

  /** The «12 розділів» count line or the «12» of «5 / 12». */
  chapters(slug: CourseSlug): Locator {
    return byTestId(this.card(slug), 'course-stat', 'chapters');
  }

  /** Count line (not started) or bar (started): `data-value` done chapters, `data-total` all. */
  progress(slug: CourseSlug): Locator {
    return this.card(slug).getByTestId('course-progress');
  }

  /** The bar of a started course; the not-started count line has none (no test id on the bar). */
  bar(slug: CourseSlug): Locator {
    return this.progress(slug).getByRole('progressbar');
  }

  cta(slug: CourseSlug): Locator {
    return this.card(slug).getByTestId('course-cta');
  }

  soon(key: SoonKey): Locator {
    return byTestId(this.page, 'course-soon', key);
  }
}
