import { expect, type Locator, type Page } from '@playwright/test';
import type { ApiClient } from '../api/client';
import { byTestId, numberValue } from '../helpers/locators';

export type QuizCount = '10' | '20' | 'all';
export type Verdict = 'correct' | 'wrong' | 'skipped';

/**
 * Quiz, `/quiz/:sectionId`: setup (section, level, count) → run (one question at a time) →
 * results. Clicking an option *is* the check: options stay `data-state=idle` until the server
 * answers, then the verdict appears.
 */
export class QuizPage {
  readonly start: Locator;
  readonly question: Locator;
  readonly options: Locator;
  readonly verdict: Locator;
  readonly xpGain: Locator;
  readonly next: Locator;
  readonly skip: Locator;
  readonly progress: Locator;
  readonly results: Locator;
  readonly resultPercent: Locator;
  readonly resultBonus: Locator;
  readonly feedback: Locator;
  readonly stat: Locator;
  readonly commentsOpen: Locator;
  readonly finish: Locator;
  readonly counts: Locator;
  readonly redo: Locator;
  readonly resultRows: Locator;
  readonly resultMisses: Locator;
  readonly resultRecall: Locator;

  constructor(readonly page: Page) {
    this.start = page.getByTestId('quiz-start');
    this.question = page.getByTestId('question');
    this.options = this.question.getByTestId('quiz-option');
    this.verdict = this.question.getByTestId('quiz-verdict');
    this.xpGain = this.question.getByTestId('quiz-xp-gain');
    this.next = page.getByTestId('quiz-next');
    this.skip = page.getByTestId('quiz-skip');
    this.progress = page.getByTestId('quiz-progress');
    this.results = page.getByTestId('results');
    this.resultPercent = page.getByTestId('quiz-result-percent');
    this.resultBonus = page.getByTestId('quiz-result-bonus');
    this.feedback = page.getByTestId('quiz-feedback');
    this.stat = this.feedback.getByTestId('quiz-stat');
    this.commentsOpen = page.getByTestId('comments-open');
    this.finish = page.getByTestId('quiz-finish');
    this.counts = page.getByTestId('quiz-counts');
    this.redo = page.getByTestId('quiz-redo');
    this.resultRows = page.getByTestId('quiz-result-row');
    this.resultMisses = page.getByTestId('quiz-result-miss');
    this.resultRecall = page.getByTestId('quiz-result-recall');
  }

  section(sectionId: string): Locator {
    return byTestId(this.page, 'quiz-section', sectionId);
  }

  option(index: number): Locator {
    return byTestId(this.question, 'quiz-option', index);
  }

  /** Option at a screen position, 1-based: the order digit keys use (stored keys are shuffled). */
  optionAt(position: number): Locator {
    return this.options.nth(position - 1);
  }

  resultScale(key: 'pass' | 'fail' | 'skipped'): Locator {
    return byTestId(this.page, 'quiz-result-scale', key);
  }

  resultMiss(questionId: string): Locator {
    return byTestId(this.page, 'quiz-result-miss', questionId);
  }

  /** Options of the current question in a state: `idle` before the verdict, then `correct|wrong`. */
  optionsInState(state: 'idle' | 'correct' | 'wrong'): Locator {
    return this.question.locator(`[data-testid="quiz-option"][data-state="${state}"]`);
  }

  async goto(sectionId: string): Promise<void> {
    await this.page.goto(`quiz/${sectionId}`);
    await expect(this.section(sectionId)).toHaveAttribute('aria-selected', 'true');
  }

  async startRun(count: QuizCount = '10'): Promise<void> {
    await byTestId(this.page, 'quiz-count', count).click();
    await this.start.click();
    await expect(this.question).toBeVisible();
  }

  async currentQuestionId(): Promise<string> {
    const id = await this.question.getAttribute('data-key');
    if (!id) throw new Error('No question on screen');
    return id;
  }

  /** Clicks an option by its stored index (`data-key`; display order is shuffled) and waits for the verdict. */
  async answer(index: number): Promise<Verdict> {
    await this.option(index).click();
    await expect(this.verdict).toBeVisible();
    return (await this.verdict.getAttribute('data-state')) as Verdict;
  }

  /** Answers the current question correctly: asks the API for the right index (records nothing). */
  async answerCorrectly(api: ApiClient): Promise<void> {
    const index = await api.correctIndex(await this.currentQuestionId());
    await expect.soft(this.option(index)).toHaveAttribute('data-state', 'idle');
    const verdict = await this.answer(index);
    expect(verdict, 'verdict after the correct option').toBe('correct');
  }

  /** Answers the current question wrong; returns the stored index of the chosen option. */
  async answerWrong(api: ApiClient): Promise<number> {
    const index = (await api.correctIndex(await this.currentQuestionId())) === 0 ? 1 : 0;
    const verdict = await this.answer(index);
    expect(verdict, 'verdict after a wrong option').toBe('wrong');
    return index;
  }

  /**
   * Answers the questions of a started run one after another, `true` = correct, and returns their
   * ids. Stays on the last verdict, so the caller decides whether to go on or finish.
   */
  async answerSeries(api: ApiClient, correct: boolean[]): Promise<string[]> {
    const ids: string[] = [];
    for (const [i, right] of correct.entries()) {
      if (i > 0) await this.goNext();
      ids.push(await this.currentQuestionId());
      await (right ? this.answerCorrectly(api) : this.answerWrong(api));
    }
    return ids;
  }

  async skipQuestion(): Promise<void> {
    await this.skip.click();
    await expect(this.verdict).toHaveAttribute('data-state', 'skipped');
  }

  /** Ends the run early: the results count only the questions answered so far. */
  async finishRun(): Promise<void> {
    await this.finish.click();
    await expect(this.results).toBeVisible();
  }

  /** XP shown for the current answer; the element exists only when the gain is above 0. */
  async shownXpGain(): Promise<number> {
    return (await this.xpGain.count()) ? numberValue(this.xpGain) : 0;
  }

  /** Goes to the next question (or to the results after the last one) and waits for the change. */
  async goNext(): Promise<void> {
    const before = await numberValue(this.progress);
    const total = await numberValue(this.progress, 'data-total');
    await this.next.click();
    if (before < total) {
      await expect(this.progress).toHaveAttribute('data-value', String(before + 1));
    } else {
      await expect(this.results).toBeVisible();
    }
  }
}
