import type { Locator, Page } from '@playwright/test';

/**
 * «Фініш» the day before the interview (`dash` state `finish`) and the warm-up on the day (`day`).
 * The round runs in `plan-run` (`data-kind` finish|warmup): cards first (`recall-reveal`,
 * `recall-rate`, see `RecallPage`), then questions (`QuizPage`); `phase` says which. The result is
 * a page in the shell. `plan-run` wraps a fixed frame: `toBeAttached()`.
 */
export class Finish {
  /** The yellow «Фініш · 15 хв» card (a link); `data-state` todo/done. */
  readonly card: Locator;
  readonly start: Locator;
  readonly parts: Locator;
  readonly paused: Locator;
  readonly note: Locator;
  /** `data-state` cards|questions. */
  readonly phase: Locator;
  /** `data-kind` finish|warmup. */
  readonly result: Locator;
  /** `data-value` = right, `data-total` = items. */
  readonly score: Locator;
  readonly verdict: Locator;
  readonly confused: Locator;
  /** Cards first, then questions. */
  readonly confusedItems: Locator;
  readonly theory: Locator;
  /** The result's «До чекліста» link. */
  readonly checklistGo: Locator;
  /** Interview day: «Розминка · 5 хв». */
  readonly warmupCard: Locator;
  readonly warmupStart: Locator;
  readonly warmupScore: Locator;

  constructor(readonly page: Page) {
    this.card = page.getByTestId('finish-card');
    this.start = page.getByTestId('finish-start');
    this.parts = page.getByTestId('finish-parts');
    this.paused = page.getByTestId('finish-paused');
    this.note = page.getByTestId('finish-note');
    this.phase = page.getByTestId('finish-phase');
    this.result = page.getByTestId('finish-result');
    this.score = page.getByTestId('finish-score');
    this.verdict = page.getByTestId('finish-verdict');
    this.confused = page.getByTestId('finish-confused');
    this.confusedItems = page.getByTestId('finish-confused-item');
    this.theory = page.getByTestId('finish-theory');
    this.checklistGo = page.getByTestId('checklist-go');
    this.warmupCard = page.getByTestId('warmup-card');
    this.warmupStart = page.getByTestId('warmup-start');
    this.warmupScore = page.getByTestId('warmup-score');
  }
}
