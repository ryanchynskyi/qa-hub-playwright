/** Self-check of gate.mjs (`npm run test:unit`, part of `npm run check`). */
import assert from 'node:assert/strict';
import { assertionChanges, reqTags, withoutMutant } from './gate.mjs';

// A changed locator is a healer's fix; everything that changes what a test asserts is not.
const allowed = `--- a/tests/a.spec.ts
+++ b/tests/a.spec.ts
-    await page.getByTestId('old').click();
+    await page.getByTestId('new').click();
 await expect(context).toBeVisible();`;
assert.deepEqual(assertionChanges(allowed), []);

for (const line of [
  '-  await expect(a).toHaveCount(3);',
  '+    .toBeGreaterThan(1);',
  '-  await shell.expectSignedIn();',
  "+  test.skip(mobile, 'reason');",
  '+  await a.click({ timeout: 30_000 });',
  "-test('x', { tag: '@REQ-QUIZ-01' }, async () => {});",
  '+  retries: 2,',
]) {
  assert.deepEqual(assertionChanges(line), [line]);
}

// Tags are unique; REQ-less tags are not requirements.
assert.deepEqual(reqTags("tag: ['@REQ-SOC-03', '@smoke', '@REQ-SOC-03', '@REQ-GEN-11']"), [
  'SOC-03',
  'GEN-11',
]);

// A mutant belongs to exactly its requirement.
assert.deepEqual(withoutMutant(['AUTH-1', 'AUTH-11'], ['AUTH-11-1.patch']), ['AUTH-1']);
