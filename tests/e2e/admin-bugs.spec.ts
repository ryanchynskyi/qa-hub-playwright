// spec: specs/phase2-feedback-admin.md
// seed: tests/seed.spec.ts

import { expect, test } from '../../src/fixtures';
import { uniqueText } from '../../src/helpers/data';

test.describe('Admin access and bug reports', () => {
  test(
    'admin sees a bug report created through the API, newest first, by its id',
    { tag: ['@REQ-ADM-04'] },
    async ({ api, admin }) => {
      // 1. api.sendBugReport as a guest with text uniqueText('bug') gives {id}
      const marker = uniqueText('bug');
      const { id } = await api.sendBugReport(marker);

      // 2. In `adminPage` reload /admin
      await admin.reload();
      await expect(admin.bug(id)).toBeVisible();
      await expect(admin.bug(id)).toHaveAttribute('data-state', 'open');
      await expect(admin.bug(id)).toContainText(marker);

      // 3. Send a second report (id2) and reload
      const { id: id2 } = await api.sendBugReport(uniqueText('bug'));
      await admin.reload();
      await expect(admin.bug(id2)).toBeVisible();
      const keys = await admin.bugs.evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-key')),
      );
      expect(keys).toContain(String(id));
      expect(keys.indexOf(String(id2))).toBeLessThan(keys.indexOf(String(id)));
    },
  );

  test(
    'admin toggles a bug report done and open again; the counter shows the list it rendered',
    { tag: ['@REQ-ADM-04'] },
    async ({ api, admin }) => {
      // 1. api.sendBugReport as a guest gives {id}; in `adminPage` reload and find the row
      const { id } = await api.sendBugReport(uniqueText('bug'));
      await admin.reload();
      const row = admin.bug(id);
      await expect(row).toHaveAttribute('data-state', 'open');
      await expect(admin.bugToggle(id)).toBeVisible();

      // 2. Click `admin-bug-toggle` inside that row; the page re-fetches and renders the list
      const done = await admin.toggleBug(id);
      await expect(row).toHaveAttribute('data-state', 'done');
      await expect(admin.bugError).toHaveCount(0);

      // 3. The counter shows the open count of the list the page rendered
      await expect(admin.bugsCount).toHaveAttribute('data-value', String(done.open));
      expect(done.items.find((item) => item.id === id)?.status).toBe('done');

      // 4. Click `admin-bug-toggle` again
      const reopened = await admin.toggleBug(id);
      await expect(row).toHaveAttribute('data-state', 'open');
      await expect(admin.bugsCount).toHaveAttribute('data-value', String(reopened.open));
      expect(reopened.items.find((item) => item.id === id)?.status).toBe('open');
    },
  );
});
