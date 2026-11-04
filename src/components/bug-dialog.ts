import { expect, type JSHandle, type Locator, type Page } from '@playwright/test';
import { BugReportCreated } from '../api/schemas';
import { PNG_BASE64 } from '../helpers/data';
import { byTestId } from '../helpers/locators';
import type { Shell } from './shell';

/** "Report a bug" dialog, on every page, for guests too. */
export class BugDialog {
  readonly dialog: Locator;
  readonly text: Locator;
  readonly count: Locator;
  readonly addImage: Locator;
  readonly fileInput: Locator;
  readonly images: Locator;
  readonly submit: Locator;
  readonly close: Locator;
  readonly sent: Locator;
  readonly error: Locator;

  constructor(
    readonly page: Page,
    private readonly shell: Shell,
  ) {
    this.dialog = page.getByTestId('bug-dialog');
    this.text = page.getByTestId('bug-text');
    this.count = page.getByTestId('bug-count');
    this.addImage = page.getByTestId('bug-add-image');
    this.fileInput = page.getByTestId('bug-file-input');
    this.images = page.getByTestId('bug-image');
    this.submit = page.getByTestId('bug-submit');
    this.close = page.getByTestId('bug-close');
    this.sent = page.getByTestId('bug-sent');
    this.error = page.getByTestId('bug-error');
  }

  /** Where focus returns when the dialog closes. */
  get opener(): Locator {
    return this.shell.link('bug');
  }

  async open(): Promise<void> {
    await this.shell.open('bug');
    await expect(this.dialog).toHaveAttribute('data-state', 'open');
  }

  /** Clicks send and returns the new report's id: the UI never shows it, the response has it. */
  async send(): Promise<number> {
    const created = this.page.waitForResponse(
      (res) => res.url().endsWith('/bug-reports') && res.request().method() === 'POST',
    );
    await this.submit.click();
    const res = await created;
    expect(res.status()).toBe(201);
    return BugReportCreated.parse(await res.json()).id;
  }

  removeImage(index: number): Promise<void> {
    return byTestId(this.page, 'bug-image', index).getByTestId('bug-image-remove').click();
  }

  /** Ctrl+V with a PNG on the clipboard; the app listens on the document. */
  async paste(): Promise<void> {
    const clipboardData = await this.pngTransfer();
    await this.page.evaluate((data) => {
      // A plain Event: `clipboardData` in the ClipboardEvent constructor is not portable (Firefox).
      const event = new Event('paste');
      Object.defineProperty(event, 'clipboardData', { value: data });
      document.dispatchEvent(event);
    }, clipboardData);
  }

  /** Drag and drop of a PNG onto the dialog. */
  async drop(): Promise<void> {
    await this.dialog.dispatchEvent('drop', { dataTransfer: await this.pngTransfer() });
  }

  private pngTransfer(): Promise<JSHandle<DataTransfer>> {
    return this.page.evaluateHandle((base64) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], 'shot.png', { type: 'image/png' }));
      return transfer;
    }, PNG_BASE64);
  }
}
