import { expect, type Locator, type Page } from '@playwright/test';
import { numberValue } from '../helpers/locators';

/**
 * Dashboard tour for a new visitor, armed by opening a /quiz, /recall or /kb page. `overlay`
 * carries the step's first target in `data-key`; the step count depends on the visitor's data,
 * so it is read from `tour-counter` `data-total`.
 */
export class Tour {
  readonly overlay: Locator;
  readonly pop: Locator;
  readonly counter: Locator;
  readonly next: Locator;
  readonly skip: Locator;

  constructor(readonly page: Page) {
    this.overlay = page.getByTestId('tour');
    this.pop = page.getByTestId('tour-pop');
    this.counter = page.getByTestId('tour-counter');
    this.next = page.getByTestId('tour-next');
    this.skip = page.getByTestId('tour-skip');
  }

  /**
   * Waits until the popup has been placed. Spotlight mounts `tour-pop` unpositioned (position:fixed
   * with no top/left, so far below the viewport) and moves it one frame later, once it has measured
   * the target (Spotlight.tsx `setBox` in requestAnimationFrame). A click in that frame lands on the
   * dimmed blocker (or a moving button) and is dropped, so click tour buttons only after this.
   */
  async ready(): Promise<void> {
    await expect(this.pop).toBeVisible();
    await expect(this.next).toBeInViewport();
  }

  /** Clicks `tour-next` up to the last step ("Готово"), without clicking it. */
  async walkToEnd(): Promise<void> {
    await this.ready();
    const total = await numberValue(this.counter, 'data-total');
    for (let step = (await numberValue(this.counter)) + 1; step <= total; step++) {
      await this.next.click();
      await expect(this.counter).toHaveAttribute('data-value', String(step));
    }
  }
}
