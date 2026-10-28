import { expect, test } from '../../src/fixtures';
import { byTestId, numberValue } from '../../src/helpers/locators';

test('the owner sees the statistics', { tag: ['@REQ-ADM-02'] }, async ({ adminPage }) => {
  const usersTotal = byTestId(adminPage, 'admin-kpi', 'users-total');
  await expect(usersTotal).toBeVisible();
  // The owner's own account is counted.
  expect(await numberValue(usersTotal)).toBeGreaterThanOrEqual(1);
  await expect(adminPage.getByTestId('admin-forbidden')).toBeHidden();
});
