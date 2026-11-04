// spec: specs/phase2-feedback-admin.md
// seed: tests/seed.spec.ts

import { expect, test } from '../../src/fixtures';
import { pngFile, uniqueText } from '../../src/helpers/data';

test.describe('Site feedback', () => {
  test(
    'send stays disabled until a star is picked; a comment alone does not enable it',
    { tag: ['@REQ-FB-05'] },
    async ({ page, feedbackDialog }) => {
      // 1. As a guest open `nav-feedback`
      await page.goto('dash');
      await feedbackDialog.open();
      await expect(feedbackDialog.submit).toBeDisabled();
      for (const rating of [1, 2, 3, 4, 5]) {
        await expect(feedbackDialog.star(rating)).toHaveAttribute('data-state', 'idle');
      }

      // 2. Fill `feedback-text` with uniqueText('fb')
      await feedbackDialog.text.fill(uniqueText('fb'));
      await expect(feedbackDialog.submit).toBeDisabled();

      // 3. Reach the 4th star with the keyboard from the comment and press Enter
      await feedbackDialog.text.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(feedbackDialog.star(4)).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(feedbackDialog.star(4)).toHaveAttribute('aria-pressed', 'true');
      await expect(feedbackDialog.star(4)).toHaveAttribute('data-state', 'selected');
      await expect(feedbackDialog.submit).toBeEnabled();

      // 4. Select star 1
      await feedbackDialog.star(1).click();
      await expect(feedbackDialog.star(1)).toHaveAttribute('aria-pressed', 'true');
      for (const rating of [2, 3, 4, 5]) {
        await expect(feedbackDialog.star(rating)).toHaveAttribute('aria-pressed', 'false');
      }
      await expect(feedbackDialog.submit).toBeEnabled();
    },
  );

  test(
    'rating without a comment is accepted (comment is optional)',
    { tag: ['@REQ-FB-05'] },
    async ({ page, feedbackDialog }) => {
      // 1. As a guest open `nav-feedback`, pick star 5, leave `feedback-text` empty
      await page.goto('dash');
      await feedbackDialog.open();
      await feedbackDialog.star(5).click();
      await expect(feedbackDialog.submit).toBeEnabled();

      // 2. Click `feedback-submit`
      await feedbackDialog.send();
      await expect(feedbackDialog.form).toBeHidden();
    },
  );

  test(
    'thanks carries the number and the admin item shows the same number',
    { tag: ['@REQ-FB-06'] },
    async ({ page, feedbackDialog, admin }) => {
      // 1. As a guest open `nav-feedback`, pick star 3, fill the comment, attach one PNG
      await page.goto('dash');
      await feedbackDialog.open();
      await feedbackDialog.star(3).click();
      await feedbackDialog.text.fill(uniqueText('fb'));
      await feedbackDialog.fileInput.setInputFiles(pngFile());
      await expect(feedbackDialog.images).toHaveCount(1);

      // 2. Click `feedback-submit`
      const number = await feedbackDialog.send();
      await expect(feedbackDialog.form).toBeHidden();

      // 3. In `adminPage` reload and find the item through AdminPage.feedbackItem(N)
      await admin.reload();
      const item = admin.feedbackItem(number);
      await expect(item).toHaveAttribute('data-value', '3');
      await expect(admin.feedbackReply(number).none).toBeVisible();
      await expect(admin.feedbackImages(number)).toHaveCount(1);
    },
  );

  test(
    'a signed-in user sends feedback twice and gets two different numbers',
    { tag: ['@REQ-FB-06'] },
    async ({ authedPage: _signedIn, user, feedbackDialog, admin }) => {
      // 1. With `authedPage` open `nav-feedback`, pick star 4, send; remember N1
      await feedbackDialog.open();
      await feedbackDialog.star(4).click();
      const first = await feedbackDialog.send();
      await expect(feedbackDialog.form).toBeHidden();

      // 2. Open `nav-feedback` again, pick star 2, send; read N2
      await feedbackDialog.open();
      await feedbackDialog.star(2).click();
      const second = await feedbackDialog.send();
      expect(second).toBeGreaterThan(first);

      // 3. In `adminPage` find AdminPage.feedbackItem(N2)
      await admin.reload();
      await expect(admin.feedbackItem(second)).toContainText(user.displayName);
      await expect(admin.feedbackReply(second).input).toBeVisible();
      await expect(admin.feedbackReply(second).none).toHaveCount(0);
    },
  );
});
