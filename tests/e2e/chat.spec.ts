// spec: specs/phase2-social.md
// seed: tests/seed.spec.ts

import { randomUUID } from 'node:crypto';
import { expect, test } from '../../src/fixtures';
import { numberValue } from '../../src/helpers/locators';
import { ChatPage } from '../../src/pages/chat-page';

const unique = (label: string): string => `${label} ${randomUUID().slice(0, 8)}`;

test.describe('Chat UI', () => {
  test(
    'guest reads messages and sees a sign-in prompt instead of the composer',
    { tag: ['@REQ-SOC-03'] },
    async ({ api, user, chat }) => {
      // 1. Arrange: the user posts a unique text through the API. Open /chat as a guest.
      const text = unique('guest read');
      const { id } = await api.postChat(user.token, text);
      await chat.goto();

      // 2. Find the message by its id.
      const message = chat.message(id);
      await expect(message).toBeVisible();
      await expect(message).toHaveAttribute('data-state', 'other');
      await expect(chat.text(message)).toHaveText(text);
      await expect(chat.deleteButton(message)).toHaveCount(0);

      // 3. Look at the bottom of the room.
      await expect(chat.guestCta).toBeVisible();
      await expect(chat.login).toHaveAttribute('href', '/login?next=%2Fchat');
      await expect(chat.register).toHaveAttribute('href', '/register?next=%2Fchat');
      for (const absent of [chat.composer, chat.input, chat.send, chat.anonymous]) {
        await expect(absent).toHaveCount(0);
      }
    },
  );

  test(
    'user posts a message: mine with name and (ти); another context sees it as other',
    { tag: ['@REQ-SOC-03'] },
    async ({ authedPage: _signedIn, otherPage, user, chat }) => {
      // 1. Open /chat in both contexts.
      const otherChat = new ChatPage(otherPage);
      await chat.goto();
      await otherChat.goto();

      // 2. Send a unique text in the first page.
      const text = unique('named');
      await chat.post(text);
      await expect(chat.input).toHaveValue('');

      // 3. Find the message by its text in the first page.
      const mine = chat.messageByText(text);
      await expect(mine).toHaveAttribute('data-state', 'mine');
      const author = chat.author(mine);
      await expect(author).toHaveAttribute('data-state', 'named');
      await expect(author).toHaveText(`${user.displayName} (ти)`);
      await expect(chat.deleteButton(mine)).toBeVisible();

      // 4. The second context gets it by polling (every 5 s).
      const theirs = otherChat.messageByText(text);
      await expect(theirs).toBeVisible({ timeout: 10_000 });
      await expect(theirs).toHaveAttribute('data-state', 'other');
      await expect(chat.author(theirs)).toHaveText(user.displayName);
      await expect(chat.deleteButton(theirs)).toHaveCount(0);
    },
  );

  test(
    'anonymous message gets a stable tag',
    { tag: ['@REQ-SOC-05'] },
    async ({ authedPage: _signedIn, chat }) => {
      // 1. Open /chat, check the default, tick the box and send two messages.
      await chat.goto();
      await expect(chat.anonymous).not.toBeChecked();
      await chat.anonymous.check();
      const first = unique('anon one');
      const second = unique('anon two');
      await chat.post(first);
      await chat.post(second);

      // 2. Both authors are the same tag, shown as "Anonim<N> (ти)".
      const tags: number[] = [];
      for (const text of [first, second]) {
        const author = chat.author(chat.messageByText(text));
        await expect(author).toHaveAttribute('data-state', 'anonymous');
        await expect(author).toHaveText(/^Anonim\d+ \(ти\)$/);
        const tag = await numberValue(author);
        await expect(author).toHaveText(`Anonim${tag} (ти)`);
        tags.push(tag);
      }
      expect(tags[0]).toBe(tags[1]);
    },
  );

  test(
    'another author gets another tag and no author data is in the DOM',
    { tag: ['@REQ-SOC-05'] },
    async ({ authedPage: _signedIn, api, user, otherUser, otherPage, chat }) => {
      // 1. Both users send one anonymous message through the UI.
      const otherChat = new ChatPage(otherPage);
      await chat.goto();
      await otherChat.goto();
      const fromFirst = unique('anon from one');
      const fromSecond = unique('anon from two');
      await chat.anonymous.check();
      await chat.post(fromFirst);
      // Delivery first: posting moves the poll cursor past unseen messages (app bug, Chat.tsx onSent).
      const theirs = otherChat.messageByText(fromFirst);
      await expect(theirs).toBeVisible({ timeout: 10_000 });
      await otherChat.anonymous.check();
      await otherChat.post(fromSecond);

      // 2. The second context sees the first user's message under the author's tag, not its own.
      await expect(theirs).toHaveAttribute('data-state', 'other');
      const theirAuthor = chat.author(theirs);
      await expect(theirAuthor).toHaveText(/^Anonim\d+$/);
      const ownAuthor = chat.author(otherChat.messageByText(fromSecond));
      const tagSeen = await numberValue(theirAuthor);
      expect(tagSeen).not.toBe(await numberValue(ownAuthor));
      expect(tagSeen).toBe(await numberValue(chat.author(chat.messageByText(fromFirst))));

      // 3. The first user's message carries no author data.
      const html = await theirs.evaluate((el) => el.outerHTML);
      expect(html).not.toContain(user.displayName);
      expect(html).not.toContain(user.email);
      expect(html).not.toContain((await api.me(user.token)).id);
      expect(html).not.toContain(otherUser.displayName);
    },
  );

  test(
    'HTML and script in a message are shown literally, never rendered',
    { tag: ['@REQ-SOC-04'] },
    async ({ authedPage, chat }) => {
      // 1. Open /chat, record dialogs and send a payload.
      const dialogs: string[] = [];
      authedPage.on('dialog', (dialog) => {
        dialogs.push(dialog.message());
        void dialog.dismiss();
      });
      const marker = randomUUID().slice(0, 8);
      const payload = `<img src=x onerror="alert('${marker}')"><b>${marker}</b><script>alert('${marker}')</script>`;
      await chat.goto();
      await chat.post(payload);

      // 2. The text is literal, with no child elements and no dialog.
      const text = chat.text(chat.messageByText(payload));
      await expect(text).toHaveText(payload);
      expect(await text.evaluate((el) => el.childElementCount)).toBe(0);
      expect(dialogs).toEqual([]);

      // 3. Reload: the same message, now loaded from the API.
      await chat.goto();
      const reloaded = chat.text(chat.messageByText(payload));
      await expect(reloaded).toHaveText(payload);
      expect(await reloaded.evaluate((el) => el.childElementCount)).toBe(0);
      expect(dialogs).toEqual([]);
    },
  );
});
