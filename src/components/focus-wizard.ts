import { expect, type Locator, type Page } from '@playwright/test';
import { byTestId } from '../helpers/locators';
import type { QuizPage } from '../pages/quiz-page';

/**
 * First visit (`focus-gate`, replaces the shell): the guest home, then, after the 5-question first
 * run, the focus wizard, and what the wizard leaves on the dashboard. Track and level advance on
 * click; the framework step has `focus-next`; the topics step (the last one) has `focus-save`.
 * Steps change ~300 ms after a click: assert, never read.
 */
export class FocusWizard {
  readonly gate: Locator;
  readonly home: Locator;
  readonly homeStart: Locator;
  readonly firstRunSetup: Locator;
  readonly step: Locator;
  readonly next: Locator;
  readonly back: Locator;
  readonly save: Locator;
  readonly skip: Locator;
  readonly total: Locator;
  readonly bar: Locator;
  readonly summary: Locator;
  readonly skipped: Locator;
  readonly topics: Locator;
  /** Topics ticked on the topics step (`data-state` = on). */
  readonly ticked: Locator;
  readonly setupOpen: Locator;

  constructor(readonly page: Page) {
    this.gate = page.getByTestId('focus-gate');
    this.home = page.getByTestId('guest-home');
    this.homeStart = byTestId(page, 'guest-home-start', 'hero');
    this.firstRunSetup = page.getByTestId('first-run-setup');
    this.step = page.getByTestId('focus-step');
    this.next = page.getByTestId('focus-next');
    this.back = page.getByTestId('focus-back');
    this.save = page.getByTestId('focus-save');
    this.skip = page.getByTestId('focus-skip');
    this.total = page.getByTestId('focus-total');
    this.bar = page.getByTestId('focus-bar');
    this.summary = page.getByTestId('focus-summary');
    this.skipped = page.getByTestId('focus-skipped');
    this.topics = page.getByTestId('focus-topic');
    this.ticked = page.locator('[data-testid="focus-topic"][data-state="on"]');
    this.setupOpen = page.getByTestId('focus-setup-open');
  }

  track = (key: 'manual' | 'auto' | 'all') => byTestId(this.page, 'focus-track', key);
  stack = (key: string) => byTestId(this.page, 'focus-stack', key);
  level = (key: 'junior' | 'middle' | 'senior') => byTestId(this.page, 'focus-level', key);
  topic = (id: string) => byTestId(this.page, 'focus-topic', id);

  /**
   * From the guest home: the first run (5 questions, all skipped), then `first-run-setup` on its
   * results. The wizard opens only this way: the app keeps it in memory, not in storage.
   */
  async openAfterFirstRun(quiz: QuizPage): Promise<void> {
    await this.homeStart.click();
    await expect(quiz.progress).toHaveAttribute('data-total', '5');
    for (let i = 0; i < 5; i++) {
      await quiz.skipQuestion();
      await quiz.goNext();
    }
    await this.firstRunSetup.click();
    await expect(this.step).toBeVisible();
  }
}
