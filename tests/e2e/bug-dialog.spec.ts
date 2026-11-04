// spec: specs/phase2-feedback-admin.md
// seed: tests/seed.spec.ts

import { expect, test } from '../../src/fixtures';
import { pngFile, textFile, uniqueText } from '../../src/helpers/data';

test.describe('Bug report dialog', () => {
  test(
    'Escape and the x close the bug dialog and focus returns to the opener',
    { tag: ['@REQ-FB-01'] },
    async ({ page, bugDialog }) => {
      // 1. As a guest open /dash and click `nav-bug`
      await page.goto('dash');
      await bugDialog.open();
      await expect(bugDialog.dialog).toBeVisible();
      await expect(bugDialog.submit).toBeDisabled();

      // 2. Press Escape
      await page.keyboard.press('Escape');
      await expect(bugDialog.dialog).toBeHidden();
      await expect(bugDialog.opener).toBeFocused();

      // 3. Click `nav-bug` again, then click `bug-close`
      await bugDialog.open();
      await bugDialog.close.click();
      await expect(bugDialog.dialog).toBeHidden();
      await expect(bugDialog.opener).toBeFocused();
    },
  );

  test(
    'guest sends a bug report: bug-sent shows and the dialog closes by itself',
    { tag: ['@REQ-FB-01'] },
    async ({ page, api, adminToken, bugDialog }) => {
      // 1. As a guest open the bug dialog and fill `bug-text` with uniqueText('bug')
      const marker = uniqueText('bug');
      await page.goto('dash');
      await bugDialog.open();
      await bugDialog.text.fill(marker);
      await expect(bugDialog.submit).toBeEnabled();

      // 2. Click `bug-submit`
      const id = await bugDialog.send();
      await expect(bugDialog.sent).toBeVisible();
      await expect(bugDialog.dialog).toHaveAttribute('data-state', 'sent');

      // 3. Do not click anything; wait with an auto-retrying assertion
      await expect(bugDialog.dialog).toBeHidden();

      // 4. Read the admin list through ApiClient.adminBugReports(adminToken)
      const { items } = await api.adminBugReports(adminToken);
      const report = items.find((item) => item.id === id);
      expect(report?.text).toBe(marker);
      expect(report?.author).toBeNull();
      expect(report?.status).toBe('open');
    },
  );

  test(
    'send needs 5 characters: 4 keeps it disabled, 5 enables it',
    { tag: ['@REQ-FB-02'] },
    async ({ page, bugDialog }) => {
      // 1. Open the bug dialog, fill `bug-text` with 4 characters
      await page.goto('dash');
      await bugDialog.open();
      await bugDialog.text.fill('abcd');
      await expect(bugDialog.submit).toBeDisabled();
      await expect(bugDialog.count).toHaveCount(0);

      // 2. Fill 5 characters
      await bugDialog.text.fill('abcde');
      await expect(bugDialog.submit).toBeEnabled();

      // 3. Fill 4 characters again
      await bugDialog.text.fill('abcd');
      await expect(bugDialog.submit).toBeDisabled();
    },
  );

  test(
    'send accepts exactly 4000 characters and the counter shows near the limit',
    { tag: ['@REQ-FB-02'] },
    async ({ page, api, adminToken, bugDialog }) => {
      const marker = uniqueText('bug');
      const textOf = (length: number): string => marker + 'x'.repeat(length - marker.length);

      // 1. Open the bug dialog and fill `bug-text` with 3799 characters
      await page.goto('dash');
      await bugDialog.open();
      await bugDialog.text.fill(textOf(3799));
      await expect(bugDialog.count).toHaveCount(0);

      // 2. Fill 3800 characters
      await bugDialog.text.fill(textOf(3800));
      await expect(bugDialog.count).toHaveAttribute('data-value', '3800');

      // 3. Fill 4001 characters (marker at the start); fill respects maxlength and stops at 4000
      await bugDialog.text.fill(textOf(4001));
      await expect(bugDialog.text).toHaveValue(textOf(4000));
      await expect(bugDialog.count).toHaveAttribute('data-value', '4000');

      // 4. Click `bug-submit`
      const id = await bugDialog.send();
      await expect(bugDialog.sent).toBeVisible();
      const { items } = await api.adminBugReports(adminToken);
      const report = items.find((item) => item.id === id);
      expect(report?.text).toBe(textOf(4000));
    },
  );

  test(
    'up to 3 images through the file input, the add button hides at 3, x frees a slot',
    { tag: ['@REQ-FB-03'] },
    async ({ page, api, adminToken, bugDialog }) => {
      // 1. Open the bug dialog; attach 3 PNG files via `bug-file-input`
      await page.goto('dash');
      await bugDialog.open();
      await bugDialog.fileInput.setInputFiles([
        pngFile('a.png'),
        pngFile('b.png'),
        pngFile('c.png'),
      ]);
      await expect(bugDialog.images).toHaveCount(3);
      await expect(bugDialog.addImage).toBeHidden();

      // 2. Click `bug-image-remove` in the thumbnail with key 1
      await bugDialog.removeImage(1);
      await expect(bugDialog.images).toHaveCount(2);
      await expect(bugDialog.addImage).toBeVisible();

      // 3. Attach one more image, fill `bug-text` and click `bug-submit`
      await bugDialog.fileInput.setInputFiles(pngFile('d.png'));
      await expect(bugDialog.images).toHaveCount(3);
      await bugDialog.text.fill(uniqueText('bug'));
      const id = await bugDialog.send();
      await expect(bugDialog.sent).toBeVisible();
      const { items } = await api.adminBugReports(adminToken);
      expect(items.find((item) => item.id === id)?.images).toHaveLength(3);
    },
  );

  test(
    'a 4th image through the file input is refused with image_limit and the three stay',
    { tag: ['@REQ-FB-03'] },
    async ({ page, bugDialog }) => {
      // 1. Open the bug dialog and attach 4 images in one go
      await page.goto('dash');
      await bugDialog.open();
      await bugDialog.fileInput.setInputFiles([
        pngFile('a.png'),
        pngFile('b.png'),
        pngFile('c.png'),
        pngFile('d.png'),
      ]);

      // 2. The extra one is refused
      await expect(bugDialog.error).toHaveAttribute('data-key', 'image_limit');
      await expect(bugDialog.images).toHaveCount(3);
      await expect(bugDialog.addImage).toBeHidden();
    },
  );

  test(
    'a non-image file is refused with image_type',
    { tag: ['@REQ-FB-04'] },
    async ({ page, bugDialog }) => {
      // 1. Open the bug dialog and attach a text/plain file
      await page.goto('dash');
      await bugDialog.open();
      await bugDialog.fileInput.setInputFiles(textFile());
      await expect(bugDialog.error).toHaveAttribute('data-key', 'image_type');
      await expect(bugDialog.error).toHaveAttribute('role', 'alert');
      await expect(bugDialog.images).toHaveCount(0);

      // 2. Fill `bug-text` with 5+ characters
      await bugDialog.text.fill(uniqueText('bug'));
      await expect(bugDialog.submit).toBeEnabled();
    },
  );

  test(
    'undecodable bytes named .png are refused, a real PNG named .txt is accepted',
    { tag: ['@REQ-FB-04'] },
    async ({ page, api, adminToken, bugDialog }) => {
      // 1. Open the bug dialog and attach text bytes declared as image/png
      await page.goto('dash');
      await bugDialog.open();
      await bugDialog.fileInput.setInputFiles(textFile('x.png', 'image/png'));
      await expect(bugDialog.error).toHaveAttribute('data-key', 'image_failed');
      await expect(bugDialog.images).toHaveCount(0);

      // 2. Attach a real PNG named x.txt: the name plays no part
      await bugDialog.fileInput.setInputFiles(pngFile('x.txt'));
      await expect(bugDialog.images).toHaveCount(1);
      await expect(bugDialog.error).toHaveCount(0);

      // 3. Fill `bug-text` and click `bug-submit`
      await bugDialog.text.fill(uniqueText('bug'));
      const id = await bugDialog.send();
      await expect(bugDialog.sent).toBeVisible();
      const { items } = await api.adminBugReports(adminToken);
      expect(items.find((item) => item.id === id)?.images).toHaveLength(1);
    },
  );

  test(
    'paste and drop add images, a paste at 3 images gives image_limit',
    { tag: ['@REQ-FB-03'] },
    async ({ page, bugDialog }) => {
      // 1. Open the bug dialog and paste an image
      await page.goto('dash');
      await bugDialog.open();
      await bugDialog.paste();
      await expect(bugDialog.images).toHaveCount(1);

      // 2. Drop an image onto the dialog
      await bugDialog.drop();
      await expect(bugDialog.images).toHaveCount(2);
      await expect(bugDialog.error).toHaveCount(0);

      // 3. Reach 3 images with the file input, then paste a 4th
      await bugDialog.fileInput.setInputFiles(pngFile('c.png'));
      await expect(bugDialog.images).toHaveCount(3);
      await bugDialog.paste();
      await expect(bugDialog.error).toHaveAttribute('data-key', 'image_limit');
      await expect(bugDialog.images).toHaveCount(3);
    },
  );
});
