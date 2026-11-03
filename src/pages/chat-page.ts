import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '../config/env';
import { byTestId } from '../helpers/locators';
import { breakApi } from '../helpers/network';

const POLL = 'chat/messages?*after=*';

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
  readonly newBelow: Locator;

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
    this.newBelow = page.getByTestId('chat-new');
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

  text(message: Locator): Locator {
    return message.getByTestId('chat-message-text');
  }

  /** `data-state` = named|anonymous, `data-value` = the tag number of an anonymous author. */
  author(message: Locator): Locator {
    return message.getByTestId('chat-message-author');
  }

  deleteButton(message: Locator): Locator {
    return message.getByTestId('chat-delete');
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

  /** Fails the page's polls until the returned `restore` is called, so a message can land unseen. */
  pausePolling(): Promise<() => Promise<void>> {
    return breakApi(this.page, POLL, 'abort');
  }

  /** Polls bring back only my messages: the room is shared with parallel tests. */
  async pollOnlyMine(): Promise<void> {
    await this.page.route(`${env.apiURL}${POLL}`, async (route) => {
      const response = await route.fetch();
      const json = (await response.json()) as { messages: { isMine: boolean }[] };
      json.messages = json.messages.filter((m) => m.isMine);
      await route.fulfill({ response, json });
    });
  }

  async nextPoll(): Promise<void> {
    await this.page.waitForResponse(`${env.apiURL}${POLL}`, { timeout: 15_000 });
  }

  /** Makes the feed scrollable and moves away from its bottom, where new messages are not announced. */
  async scrollAwayFromBottom(): Promise<void> {
    await this.feed.evaluate((el) => {
      el.style.maxHeight = '10px';
      el.scrollTop = 0;
    });
  }
}
