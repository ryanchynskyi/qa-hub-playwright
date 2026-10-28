import type { Locator, Page } from '@playwright/test';
import { byTestId } from '../helpers/locators';

/**
 * First-visit focus wizard (`focus-gate`, replaces the shell) and what it leaves on the dashboard.
 * Track and level advance on click; framework, topics and language steps have `focus-next`; the
 * last (theme) step has `focus-save`. Steps change ~300 ms after a click: assert, never read.
 */
export class FocusWizard {
  readonly gate: Locator;
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
  /** Theme step options: the current one (`selected`) and the other one (`off`). */
  readonly currentTheme: Locator;
  readonly otherTheme: Locator;
  /** `<html>`: `data-theme` appears once a theme is picked (before that, the system one). */
  readonly html: Locator;

  constructor(readonly page: Page) {
    this.gate = page.getByTestId('focus-gate');
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
    this.currentTheme = page.locator('[data-testid="focus-theme"][data-state="selected"]');
    this.otherTheme = page.locator('[data-testid="focus-theme"][data-state="off"]');
    this.html = page.locator('html');
  }

  track = (key: 'manual' | 'auto' | 'all') => byTestId(this.page, 'focus-track', key);
  stack = (key: string) => byTestId(this.page, 'focus-stack', key);
  level = (key: 'junior' | 'middle' | 'senior') => byTestId(this.page, 'focus-level', key);
  topic = (id: string) => byTestId(this.page, 'focus-topic', id);
  lang = (key: string) => byTestId(this.page, 'focus-lang', key);
  theme = (key: 'light' | 'dark') => byTestId(this.page, 'focus-theme', key);

  /** Manual path with the preset topics and language, up to the theme step (the last one). */
  async passToTheme(level: 'junior' | 'middle' | 'senior' = 'junior'): Promise<void> {
    await this.track('manual').click();
    await this.level(level).click();
    await this.next.click();
    await this.next.click();
  }
}
