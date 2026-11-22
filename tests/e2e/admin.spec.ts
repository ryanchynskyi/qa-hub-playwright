import { expect, test } from '../../src/fixtures';
import { numberValue } from '../../src/helpers/locators';

test('the owner sees the statistics', { tag: ['@REQ-ADM-02'] }, async ({ admin }) => {
  const usersTotal = admin.kpi('users-total');
  await expect(usersTotal).toBeVisible();
  // The owner's own account is counted.
  expect(await numberValue(usersTotal)).toBeGreaterThanOrEqual(1);
  await expect(admin.forbidden).toBeHidden();
});
