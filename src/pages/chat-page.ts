import { expect, type Locator, type Page } from '@playwright/test';
import { byTestId } from '../helpers/locators';

/** `/chat`: one shared room, so tests find their own message by id or by a unique text. */
export class ChatPage {
  readonly root: Locator;
  readonly feed: Locator;
  readonly guestCta: Locator;
  readonly login: Locator;
  readonly register: Locator;
  readonly composer: Locator;
  readonly input: Locator;
  readonly send: Locator;
  readonly anonymous: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('chat');
    this.feed = page.getByTestId('chat-feed');
    this.guestCta = page.getByTestId('chat-guest-cta');
    this.login = page.getByTestId('chat-login');
    this.register = page.getByTestId('chat-register');
    this.composer = page.getByTestId('chat-composer');
    this.input = page.getByTestId('chat-input');
    this.send = page.getByTestId('chat-send');
    this.anonymous = page.getByTestId('chat-anonymous');
  }

  /** `data-key` = message id, `data-state` = mine|other. */
  message(id: number): Locator {
    return byTestId(this.page, 'chat-message', id);
  }

  messageByText(text: string): Locator {
    return this.page.getByTestId('chat-message').filter({
      has: this.page.getByTestId('chat-message-text').getByText(text, { exact: true }),
    });
  }

  async goto(): Promise<void> {
    await this.page.goto('chat');
    await expect(this.root).toHaveAttribute('data-state', 'ready');
  }

  async post(text: string): Promise<void> {
    await this.input.fill(text);
    await this.send.click();
    await expect(this.messageByText(text)).toBeVisible();
  }
}
