// spec: specs/phase2-feedback-admin.md
// seed: tests/seed.spec.ts

import type { ApiClient } from '../../src/api/client';
import { expect, test, type TestUser } from '../../src/fixtures';
import { uniqueText } from '../../src/helpers/data';

/** The app sends "seen" without waiting for it and the UI gives no signal, so only a poll shows it. */
const expectSeen = (api: ApiClient, user: TestUser, number: number): Promise<void> =>
  expect
    .poll(
      async () => (await api.myFeedback(user.token)).items.find((i) => i.number === number)?.seen,
    )
    .toBe(true);

test.describe('Site feedback replies', () => {
  test(
    'owner reply produces one reply offer after a reload and Later hides it until reload',
    { tag: ['@REQ-FB-07'] },
    async ({ api, adminToken, user, authedPage, replyOffer }) => {
      // 1. Fresh `user` sends feedback; the owner replies through the ApiClient
      const { id, number } = await api.sendFeedback(4, user.token);
      await api.replyToFeedback(adminToken, id, uniqueText('reply'));

      // 2. Reload /dash signed in as the user
      await authedPage.reload();
      await expect(replyOffer.sheet).toHaveCount(1);
      await expect(replyOffer.sheet).toHaveAttribute('data-key', String(number));

      // 3. Click `feedback-reply-offer-later`
      await replyOffer.later.click();
      await expect(replyOffer.sheet).toBeHidden();

      // 4. Reload the page
      await authedPage.reload();
      await expect(replyOffer.sheet).toBeVisible();
    },
  );

  test(
    'with two unseen replies the offer names the older feedback',
    { tag: ['@REQ-FB-07'] },
    async ({ api, adminToken, user, authedPage, replyOffer }) => {
      // 1. Fresh `user` sends two feedbacks; the owner replies to both
      const older = await api.sendFeedback(4, user.token);
      const newer = await api.sendFeedback(5, user.token);
      await api.replyToFeedback(adminToken, older.id, uniqueText('reply'));
      await api.replyToFeedback(adminToken, newer.id, uniqueText('reply'));

      // 2. Reload /dash signed in as the user
      await authedPage.reload();
      await expect(replyOffer.sheet).toHaveAttribute('data-key', String(older.number));
    },
  );

  test(
    'View opens /profile#feedback-N with the reply and the sheet does not come back',
    { tag: ['@REQ-FB-07'] },
    async ({ api, adminToken, user, authedPage, replyOffer, profile }) => {
      // 1. Fresh `user` with one feedback replied by the owner; reload /dash and wait for the offer
      const { id, number } = await api.sendFeedback(5, user.token);
      const reply = uniqueText('reply');
      await api.replyToFeedback(adminToken, id, reply);
      await authedPage.reload();
      await expect(replyOffer.sheet).toBeVisible();

      // 2. Click `feedback-reply-offer-open`
      await replyOffer.view.click();
      await expect(authedPage).toHaveURL(new RegExp(`/profile#feedback-${number}$`));
      const item = profile.feedbackItem(number);
      await expect(item).toBeInViewport();
      await expect(item).toHaveAttribute('data-state', 'replied');
      await expect(profile.feedbackReply(number)).toContainText(reply);

      // 3. Reload the page
      await expectSeen(api, user, number);
      await authedPage.reload();
      await expect(item).toBeVisible();
      await expect(replyOffer.sheet).toHaveCount(0);
    },
  );

  test(
    'admin sees the reply as seen only after the author opened it',
    { tag: ['@REQ-FB-07'] },
    async ({ api, adminToken, user, authedPage, replyOffer, admin }) => {
      // 1. Fresh `user` sends feedback and the owner replies through the ApiClient
      const { id, number } = await api.sendFeedback(3, user.token);
      await api.replyToFeedback(adminToken, id, uniqueText('reply'));

      // 2. In `adminPage` find AdminPage.feedbackItem(N)
      await admin.reload();
      const { seen } = admin.feedbackReply(number);
      await expect(seen).toHaveAttribute('data-state', 'unseen');

      // 3. As the user click `feedback-reply-offer-open`, then in `adminPage` reload
      await authedPage.reload();
      await replyOffer.view.click();
      await expectSeen(api, user, number);
      await admin.reload();
      await expect(seen).toHaveAttribute('data-state', 'seen');
    },
  );

  test(
    'a reply with HTML is shown as plain text to the author',
    { tag: ['@REQ-FB-07'] },
    async ({ api, adminToken, user, authedPage: _signedIn, profile }) => {
      // 1. Fresh `user` sends feedback; the owner replies with HTML-looking text
      const { id, number } = await api.sendFeedback(2, user.token);
      const reply = `<b>${uniqueText('bold')}</b>`;
      await api.replyToFeedback(adminToken, id, reply);

      // 2. Open /profile as the user
      await profile.goto();
      await expect(profile.feedbackReply(number)).toContainText(reply);
    },
  );
});
