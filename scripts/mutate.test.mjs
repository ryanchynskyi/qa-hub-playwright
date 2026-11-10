/** Self-check of mutate.mjs verdicts (`npm run test:unit`). Messages are real Playwright output. */
import assert from 'node:assert/strict';
import { verdict } from './mutate.mjs';

const ASSERT = 'Error: \x1b[2mexpect(\x1b[22m\x1b[31mlocator\x1b[39m\x1b[2m).\x1b[22mtoBeVisible()';
// A fixture error's code frame shows the test's own expect: it must not count.
const FIXTURE = "Error: fixture boom\n\n  4 | await expect(page.getByText('y')).toBeVisible();";
const TIMEOUT = '\x1b[31mTest timeout of 1000ms exceeded.\x1b[39m';

const report = (...results) => ({
  suites: [{ specs: [], suites: [{ specs: [{ tests: [{ results }] }] }] }],
});
const run = (status, ...messages) => ({ status, errors: messages.map((message) => ({ message })) });

assert.equal(verdict(report(run('failed', ASSERT))), 'killed');
assert.equal(verdict(report(run('timedOut', TIMEOUT, ASSERT))), 'killed');
assert.equal(verdict(report(run('failed', FIXTURE))), 'error');
assert.equal(verdict(report(run('timedOut', TIMEOUT))), 'error');
assert.equal(verdict(report(run('passed'), run('skipped'))), 'survived');
// One assertion failure among other errors still proves the mutant is caught.
assert.equal(verdict(report(run('failed', FIXTURE), run('failed', ASSERT))), 'killed');
// Nothing ran, or the run broke before the tests (global setup, webServer).
assert.equal(verdict({ suites: [] }), 'error');
assert.equal(
  verdict({ ...report(run('failed', ASSERT)), errors: [{ message: 'setup' }] }),
  'error',
);
