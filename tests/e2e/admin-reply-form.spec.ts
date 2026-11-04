// spec: specs/phase2-admin-reply-form.md
// seed: tests/seed.spec.ts

import { expect, test } from '../../src/fixtures';
import { uniqueText } from '../../src/helpers/data';

test.describe('Admin reply form (FB-07)', () => {
  test(
    'The owner writes a reply in the form and the author receives it',
    { tag: ['@REQ-FB-07'] },
    async ({ api, user, authedPage, admin, replyOffer }) => {
      // 1. Arrange: user sends feedback; admin.reload(); r = admin.feedbackReply(number)
      const { number } = await api.sendFeedback(4, user.token);
      await admin.reload();
      const r = admin.feedbackReply(number);
      await expect(admin.feedbackItem(number)).toBeVisible();
      await expect(r.input).toBeEmpty();
      await expect(r.save).toBeDisabled();
      await expect(r.block).toHaveCount(0);

      // 2. Fill r.input with whitespace only (3 spaces)
      await r.input.fill('   ');
      await expect(r.save).toBeDisabled();

      // 3. Fill r.input with a unique reply text and click r.save
      const reply = uniqueText('reply');
      await r.input.fill(reply);
      await r.save.click();
      await expect(r.block).toContainText(reply);
      await expect(r.seen).toHaveAttribute('data-state', 'unseen');
      await expect(r.input).toHaveCount(0);

      // 4. In the author's page (signed in as user): reload
      await authedPage.reload();
      await expect(replyOffer.sheet).toBeVisible();
      await expect(replyOffer.sheet).toHaveAttribute('data-key', String(number));
    },
  );

  test(
    'The owner edits a saved reply; cancel keeps the saved text',
    { tag: ['@REQ-FB-07'] },
    async ({ api, adminToken, user, admin }) => {
      // 1. Arrange: sendFeedback, then replyToFeedback with the first text; admin.reload()
      const { id, number } = await api.sendFeedback(4, user.token);
      const first = uniqueText('first');
      await api.replyToFeedback(adminToken, id, first);
      await admin.reload();
      const r = admin.feedbackReply(number);
      await expect(r.block).toContainText(first);
      await expect(r.input).toHaveCount(0);

      // 2. Click r.edit
      await r.edit.click();
      await expect(r.input).toHaveValue(first);
      await expect(r.save).toBeVisible();
      await expect(r.cancel).toBeVisible();

      // 3. Fill r.input with a different draft and click r.cancel
      const draft = uniqueText('draft');
      await r.input.fill(draft);
      await r.cancel.click();
      await expect(r.input).toHaveCount(0);
      await expect(r.block).toContainText(first);
      await expect(r.block).not.toContainText(draft);

      // 4. Click r.edit, fill a second text, click r.save
      const second = uniqueText('second');
      await r.edit.click();
      await expect(r.input).toHaveValue(first);
      await r.input.fill(second);
      await r.save.click();
      await expect(r.block).toContainText(second);
      await expect(r.block).not.toContainText(first);
      await expect(r.seen).toHaveAttribute('data-state', 'unseen');
      await expect(r.input).toHaveCount(0);
    },
  );
});
