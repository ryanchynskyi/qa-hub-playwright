import { expect, type Locator, type Page } from '@playwright/test';
import type { QuestionLevel } from '../api/schemas';
import type { Device } from '../fixtures';
import { byTestId } from '../helpers/locators';

export type InterviewChip = 'tomorrow' | 'in3' | 'week';
export type InterviewMinutes = 15 | 30 | 60;

/**
 * `/profile/interview` (signed in only, no shell), the profile «Наступна» block and its «Змінити
 * дату» dialog. The date row, chips, days line and minutes share their ids between the form, the
 * dialog and onboarding step 2 (`interview-onboard`), and only one of them is on screen at a time,
 * so the locators are page-wide. Desktop is one page; a phone has three steps (`?step=1|2|3`).
 */
export class InterviewPage {
  readonly root: Locator;
  readonly form: Locator;
  readonly step: Locator;
  readonly next: Locator;
  readonly back: Locator;
  readonly replaces: Locator;
  /** `<input type="date">`; `fill('YYYY-MM-DD')` works, `data-value` is the picked date. */
  readonly date: Locator;
  readonly dateError: Locator;
  readonly days: Locator;
  readonly daysWas: Locator;
  readonly total: Locator;
  readonly save: Locator;
  readonly replace: Locator;
  readonly replaceWas: Locator;
  readonly replaceNext: Locator;
  readonly replaceConfirm: Locator;
  readonly replaceKeep: Locator;
  readonly upcoming: Locator;
  readonly upcomingDays: Locator;
  readonly changeOpen: Locator;
  readonly change: Locator;
  readonly changeSave: Locator;
  readonly topicsEdit: Locator;
  readonly onboard: Locator;
  readonly onboardSum: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('interview-page');
    this.form = page.getByTestId('interview-form');
    this.step = page.getByTestId('interview-step');
    this.next = page.getByTestId('interview-next');
    this.back = page.getByTestId('interview-back');
    this.replaces = page.getByTestId('interview-replaces');
    this.date = page.getByTestId('interview-date');
    this.dateError = page.getByTestId('interview-date-error');
    this.days = page.getByTestId('interview-days');
    this.daysWas = page.getByTestId('interview-days-was');
    this.total = page.getByTestId('interview-total');
    this.save = page.getByTestId('interview-save');
    this.replace = page.getByTestId('interview-replace');
    this.replaceWas = page.getByTestId('interview-replace-was');
    this.replaceNext = page.getByTestId('interview-replace-next');
    this.replaceConfirm = page.getByTestId('interview-replace-confirm');
    this.replaceKeep = page.getByTestId('interview-replace-keep');
    this.upcoming = page.getByTestId('interview-upcoming');
    this.upcomingDays = page.getByTestId('interview-upcoming-days');
    this.changeOpen = page.getByTestId('interview-change-open');
    this.change = page.getByTestId('interview-change');
    this.changeSave = page.getByTestId('interview-change-save');
    this.topicsEdit = page.getByTestId('interview-topics-edit');
    this.onboard = page.getByTestId('interview-onboard');
    this.onboardSum = page.getByTestId('interview-onboard-sum');
  }

  chip = (key: InterviewChip) => byTestId(this.page, 'interview-chip', key);
  minutes = (value: InterviewMinutes) => byTestId(this.page, 'interview-minutes', value);
  level = (key: QuestionLevel) => byTestId(this.page, 'interview-level', key);
  changeLevel = (key: QuestionLevel) => byTestId(this.page, 'interview-change-level', key);
  /** `data-state` on/part/off, `data-value` picked, `data-total` chapters. */
  topic = (topicId: string) => byTestId(this.page, 'interview-topic', topicId);
  /** The chevron: makes the topic active (desktop, right column) or expands it (phone). */
  topicOpen = (topicId: string) => byTestId(this.page, 'interview-topic-open', topicId);
  /** One chapter row; `data-state` on/off. */
  section = (chapterId: string) => byTestId(this.page, 'interview-section', chapterId);

  /** Ticks or unticks all chapters of a topic (its checkbox; the row itself only opens it). */
  async toggleTopic(topicId: string): Promise<void> {
    await this.topic(topicId).getByRole('checkbox').click();
  }

  /** Ticks or unticks one chapter; on desktop its topic must be the active one first. */
  async toggleSection(chapterId: string): Promise<void> {
    await this.section(chapterId).getByRole('checkbox').click();
  }

  async goto(edit = false): Promise<void> {
    await this.page.goto(edit ? 'profile/interview?edit=1' : 'profile/interview');
    await expect(this.form).toBeVisible();
  }

  /** «Змінити дату» on `/profile`: the dialog reuses the date row ids of the form. */
  async openChange(): Promise<void> {
    await this.changeOpen.click();
    await expect(this.change).toBeVisible();
  }

  /**
   * From the filled date to the topics. A phone walks the three steps (`?step=`): back from step 2
   * keeps the date, a reload on step 3 returns to step 1 with an empty form, so the date is filled
   * again. Other layouts are one page with no steps.
   */
  async toTopics(device: Device, date: string): Promise<void> {
    if (device !== 'phone') {
      await expect(this.save).toBeVisible();
      await expect(this.step).toHaveCount(0);
      await expect(this.next).toHaveCount(0);
      return;
    }
    await expect(this.step).toHaveAttribute('data-value', '1');
    await expect(this.back).toHaveAttribute('href', '/profile');
    await this.next.click();
    await expect(this.page).toHaveURL(/\?step=2$/);
    await expect(this.step).toHaveAttribute('data-value', '2');
    await this.back.click();
    await expect(this.page).toHaveURL(/\?step=1$/);
    await expect(this.date).toHaveValue(date);
    await this.next.click();
    await this.next.click();
    await expect(this.page).toHaveURL(/\?step=3$/);
    await expect(this.step).toHaveAttribute('data-value', '3');

    await this.page.reload();
    await expect(this.page).toHaveURL(/\?step=1$/);
    await expect(this.step).toHaveAttribute('data-value', '1');
    await expect(this.date).toHaveValue('');

    await this.date.fill(date);
    await this.next.click();
    await this.next.click();
    await expect(this.step).toHaveAttribute('data-value', '3');
  }
}
