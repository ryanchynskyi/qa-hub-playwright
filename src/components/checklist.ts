import { expect, type Locator, type Page } from '@playwright/test';
import type { Device } from '../fixtures';
import { byTestId } from '../helpers/locators';

export type ChecklistItem = 'vacancy' | 'pitch' | 'stories' | 'questions' | 'company' | 'av';

/**
 * «Перед співбесідою» on `/dash` the day before the interview (`data-state="eve"`) and on the day
 * (`day`): `data-value` = done, `data-total` = 6. A tick is optimistic and saved at once; rows with
 * tips (`stories`, `questions`, `company`) open a sheet. A phone shows four rows until «усі ›».
 */
export class Checklist {
  readonly root: Locator;
  readonly all: Locator;
  readonly items: Locator;
  /** `data-key` = the item. */
  readonly sheet: Locator;
  /** `data-value` = tip lines. */
  readonly sheetTip: Locator;
  readonly sheetDone: Locator;
  readonly sheetLater: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('checklist');
    this.all = page.getByTestId('checklist-all');
    this.items = page.getByTestId('checklist-item');
    this.sheet = page.getByTestId('checklist-sheet');
    this.sheetTip = page.getByTestId('checklist-sheet-tip');
    this.sheetDone = page.getByTestId('checklist-sheet-done');
    this.sheetLater = page.getByTestId('checklist-sheet-later');
  }

  /** `data-state` done/todo. */
  item = (key: ChecklistItem) => byTestId(this.page, 'checklist-item', key);
  toggle = (key: ChecklistItem) => byTestId(this.page, 'checklist-toggle', key);
  tips = (key: ChecklistItem) => byTestId(this.page, 'checklist-tips', key);

  async openTips(key: ChecklistItem): Promise<void> {
    await this.tips(key).click();
    await expect(this.sheet).toHaveAttribute('data-key', key);
  }

  /** Every row on screen: a phone shows fewer until «усі ›», other layouts show all and no link. */
  async showAll(device: Device): Promise<void> {
    if (device !== 'phone') {
      await expect(this.all).toHaveCount(0);
      return;
    }
    const total = Number(await this.root.getAttribute('data-total'));
    await expect(this.all).toBeVisible();
    expect(await this.items.count()).toBeLessThan(total);
    await this.all.click();
  }
}
