import type { Locator, Page } from '@playwright/test';
import type { DailyTask } from '../api/schemas';
import { byTestId } from '../helpers/locators';

/** Dashboard, `/dash` (also rendered at the root `/`). */
export class DashboardPage {
  readonly root: Locator;
  readonly title: Locator;
  readonly today: Locator;
  readonly todayState: Locator;
  readonly todayXp: Locator;
  readonly todayContinue: Locator;
  /** One per daily task: `data-key` = task id, `data-state` = pending|running|done. */
  readonly tasks: Locator;
  readonly topics: Locator;
  readonly ready: Locator;
  readonly quickstart: Locator;
  readonly topicsLock: Locator;
  /** Plan mode (`dash` `data-state="plan"`): day blocks, `data-value` = today … «Фініш». */
  readonly days: Locator;
  readonly planHow: Locator;
  readonly planHowOk: Locator;
  /** Signed in, no active interview: the «Додай дату співбесіди» tile; never for guests. */
  readonly addDate: Locator;
  readonly addDateLink: Locator;
  /** Ticker items in order; plan mode starts with keys `interview`, `days`. */
  readonly tickerItems: Locator;
  /** Blocks a new visitor's short dashboard leaves out until the tour (DASH-020). */
  readonly fullOnly: Locator[];

  constructor(readonly page: Page) {
    this.root = page.getByTestId('dash');
    this.title = page.getByTestId('dash-title');
    this.today = page.getByTestId('today');
    this.todayState = page.getByTestId('today-state');
    this.todayXp = page.getByTestId('today-xp');
    this.todayContinue = page.getByTestId('today-continue');
    this.tasks = page.getByTestId('task');
    this.topics = page.getByTestId('topics');
    this.ready = page.getByTestId('dash-ready');
    this.quickstart = page.getByTestId('dash-quickstart');
    this.topicsLock = page.getByTestId('topics-lock');
    this.days = page.getByTestId('dash-days');
    this.planHow = page.getByTestId('dash-plan-how');
    this.planHowOk = page.getByTestId('dash-plan-how-ok');
    this.addDate = page.getByTestId('dash-add-date');
    this.addDateLink = page.getByTestId('dash-add-date-link');
    this.tickerItems = page.getByTestId('ticker-item');
    this.fullOnly = ['dash-ready', 'today', 'weak'].map((id) => page.getByTestId(id));
  }

  /** A day block: `data-key` = date, `data-state` todo/done/missed, today `aria-current="date"`. */
  day(date: string): Locator {
    return byTestId(this.page, 'dash-day', date);
  }

  task(id: string): Locator {
    return byTestId(this.page, 'task', id);
  }

  taskOfType(type: DailyTask['type']): Locator {
    return this.page.locator(`[data-testid="task"][data-type="${type}"]`);
  }

  /** `data-key` of every task, in slot order. */
  async taskKeys(): Promise<string[]> {
    return this.tasks.evaluateAll((els) => els.map((el) => el.getAttribute('data-key') ?? ''));
  }

  taskStart(task: Locator): Locator {
    return task.getByTestId('task-start');
  }

  /** `data-value`, `data-total` and `data-reward` of one task. */
  taskProgress(task: Locator): Locator {
    return task.getByTestId('task-progress');
  }

  async goto(): Promise<void> {
    // Relative to baseURL (which ends with '/'): works for any base path, local or prod.
    await this.page.goto('dash');
  }
}
