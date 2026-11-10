/** Self-check of skips.mjs (`npm run test:unit`). */
import assert from 'node:assert/strict';
import { allowedSkips, unexpectedSkips } from './skips.mjs';

const spec = (title, ...statuses) => ({
  file: 'e2e/a.spec.ts',
  title,
  tests: statuses.map((status) => ({ status })),
});
// Specs sit in nested describe suites; one title skipped on several projects counts once.
const report = {
  suites: [
    {
      specs: [spec('runs', 'expected')],
      suites: [
        { specs: [spec('phone only', 'skipped', 'expected', 'skipped'), spec('new', 'skipped')] },
      ],
    },
  ],
};
const allowed = allowedSkips('# comment\n\ne2e/a.spec.ts › phone only\n');
assert.deepEqual(allowed, ['e2e/a.spec.ts › phone only']);
assert.deepEqual(unexpectedSkips(report, allowed), ['e2e/a.spec.ts › new']);
assert.deepEqual(unexpectedSkips({ suites: [] }, allowed), []);
