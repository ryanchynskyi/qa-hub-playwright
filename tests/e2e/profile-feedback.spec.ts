// spec: specs/phase2-feedback-admin.md
// seed: tests/seed.spec.ts

import { expect, test } from '../../src/fixtures';
import { uniqueText } from '../../src/helpers/data';
import { ProfilePage } from '../../src/pages/profile-page';

test.describe('Site feedback in the profile and the admin', () => {
  test(
    'profile lists own feedback newest first with reply or waiting state',
    { tag: ['@REQ-FB-08'] },
    async ({ api, adminToken, user, authedPage: _signedIn, profile }) => {
      // 1. Fresh `user` sends two feedback items; the owner replies to the first only
      const older = await api.sendFeedback(5, user.token);
      const newer = await api.sendFeedback(2, user.token);
      await api.replyToFeedback(adminToken, older.id, uniqueText('reply'));

      // 2. Open /profile signed in
      await profile.goto();
      await expect(profile.feedback).toBeVisible();
      await expect(profile.feedbackItems).toHaveCount(2);
      await expect(profile.feedbackItems.first()).toHaveAttribute('data-key', String(newer.number));
      await expect(profile.feedbackItems.last()).toHaveAttribute('data-key', String(older.number));

      // 3. Check each row
      const waiting = profile.feedbackItem(newer.number);
      await expect(waiting).toHaveAttribute('data-state', 'waiting');
      await expect(waiting).toHaveAttribute('data-value', '2');
      await expect(profile.feedbackWaiting(newer.number)).toBeVisible();
      await expect(profile.feedbackReply(newer.number)).toHaveCount(0);
      const replied = profile.feedbackItem(older.number);
      await expect(replied).toHaveAttribute('data-state', 'replied');
      await expect(replied).toHaveAttribute('data-value', '5');
      await expect(profile.feedbackReply(older.number)).toBeVisible();
    },
  );

  test(
    'a user without feedback has no items and a guest has no feedback section',
    { tag: ['@REQ-FB-08'] },
    async ({ profile, secondPage }) => {
      // 1. As a guest open /profile
      await profile.goto();
      await expect(profile.feedback).toHaveCount(0);

      // 2. With a fresh signed-in `user` (no feedback) open /profile
      const mine = new ProfilePage(secondPage);
      await mine.goto();
      await expect(mine.feedbackEmpty).toBeVisible();
      await expect(mine.feedbackItems).toHaveCount(0);
    },
  );

  test(
    'guest feedback in the admin shows no reply form',
    { tag: ['@REQ-FB-07'] },
    async ({ api, admin }) => {
      // 1. api.sendFeedback(no token, rating 3) as a guest gives {number}
      const { number } = await api.sendFeedback(3);

      // 2. In `adminPage` find AdminPage.feedbackItem(number)
      await admin.reload();
      const { none, input, save } = admin.feedbackReply(number);
      await expect(none).toBeVisible();
      await expect(input).toHaveCount(0);
      await expect(save).toHaveCount(0);
    },
  );
});
