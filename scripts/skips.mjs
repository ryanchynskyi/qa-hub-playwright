#!/usr/bin/env node
/**
 * Skipped tests are not green tests. After a run, every skipped test must be listed in
 * specs/allowed-skips.txt (`file › title`, one per line, `#` comments), so a new `test.skip` or
 * `test.fixme` cannot hide a failure while CI stays green. Lint already forbids a bare skip; this
 * catches a conditional one that skips more than it should.
 *
 *   node scripts/skips.mjs [report]    default report: test-results/results.json (playwright.config)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(import.meta.dirname, '..');

/** `file › title` of the skipped tests in a Playwright JSON report that `allowed` does not list. */
export function unexpectedSkips(report, allowed) {
  const skipped = new Set();
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      if (spec.tests.some((t) => t.status === 'skipped'))
        skipped.add(`${spec.file} › ${spec.title}`);
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites ?? []) walk(suite);
  return [...skipped].filter((s) => !allowed.includes(s));
}

export const allowedSkips = (text) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = JSON.parse(
    readFileSync(resolve(root, process.argv[2] ?? 'test-results/results.json'), 'utf8'),
  );
  const allowed = allowedSkips(readFileSync(resolve(root, 'specs/allowed-skips.txt'), 'utf8'));
  const extra = unexpectedSkips(report, allowed);
  if (extra.length) {
    console.error(
      `[skips] skipped but not in specs/allowed-skips.txt (a decision for the user):\n${extra.join('\n')}`,
    );
    process.exit(1);
  }
  console.log(`[skips] ok: ${report.stats?.skipped ?? 0} skipped runs, all allowed`);
}
