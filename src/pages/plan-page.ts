import { expect, type Locator, type Page } from '@playwright/test';
import { byTestId } from '../helpers/locators';

/**
 * `/plan` (signed in, active interview) and a plan day `/plan/day?d=YYYY-MM-DD` (`&step=cards` =
 * the card step, `&run=1` = «Ще раз»). The day's round runs in the quiz frame: answer it with
 * `QuizPage` (`question`, `quiz-option`, `quiz-next`). `plan-run` and `plan-result` wrap
 * fixed-position frames: assert them with `toBeAttached()`, not `toBeVisible()`.
 */
export class PlanPage {
  readonly root: Locator;
  /** `data-value` = days left. */
  readonly days: Locator;
  /** Day cards / rows: `data-key` = date, `data-state` todo/done/missed, `data-value` = size. */
  readonly dayList: Locator;
  /** Desktop only: the interview end tile; `data-key` = date, `data-value` = level. */
  readonly interview: Locator;
  /** «Хвилин на день»: `data-value` = minutes. */
  readonly minutes: Locator;
  /** «Завдань на день»: `data-value` = the daily task count. */
  readonly tasks: Locator;
  readonly bonus: Locator;
  /** The round: `data-key` = date, `data-kind="cards"` on the card step. */
  readonly run: Locator;
  readonly result: Locator;
  readonly resultPercent: Locator;
  readonly resultSummary: Locator;
  readonly resultDay: Locator;
  readonly again: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('plan-page');
    this.days = page.getByTestId('plan-days');
    this.dayList = page.getByTestId('plan-day-list').getByTestId('plan-day');
    this.interview = page.getByTestId('plan-interview');
    this.minutes = page.getByTestId('plan-minutes');
    this.tasks = page.getByTestId('plan-tasks');
    this.bonus = page.getByTestId('plan-bonus');
    this.run = page.getByTestId('plan-run');
    this.result = page.getByTestId('plan-result');
    this.resultPercent = page.getByTestId('plan-result-percent');
    this.resultSummary = page.getByTestId('plan-result-summary');
    this.resultDay = page.getByTestId('plan-result-day');
    this.again = page.getByTestId('plan-again');
  }

  day = (date: string) => byTestId(this.page, 'plan-day', date);
  /** `▭ N` on a regular day other than today (`data-value` = cards); the «Фініш» row has none. */
  dayCards = (date: string) => this.day(date).getByTestId('plan-day-cards');
  minutesOption = (value: 15 | 30 | 60) => byTestId(this.page, 'plan-minutes-opt', value);
  tasksOption = (value: 3 | 4 | 5) => byTestId(this.page, 'plan-tasks-opt', value);
  /** Today's «Тест» / «Картки» rows (links); `data-state` todo/done. */
  step = (key: 'test' | 'cards') => byTestId(this.page, 'plan-step', key);

  /** `data-key` of every day in the list, in order. */
  async dayKeys(): Promise<string[]> {
    return this.dayList.evaluateAll((els) => els.map((el) => el.getAttribute('data-key') ?? ''));
  }

  async goto(): Promise<void> {
    await this.page.goto('plan');
    await expect(this.root).toBeVisible();
  }
}
