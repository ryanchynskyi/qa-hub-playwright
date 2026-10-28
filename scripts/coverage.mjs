#!/usr/bin/env node
/**
 * Requirements coverage from test tags (specs/COVERAGE.md, phase 0.1). A test names the
 * requirements it checks as tags, `@REQ-<AREA>-<nn>`; this script lists the tests per requirement
 * from `playwright test --list` and checks the tags against the matrix in specs/COVERAGE.md.
 *
 *   node scripts/coverage.mjs
 *
 * Fails when a tag names a requirement that is not in the matrix, or when the matrix status
 * disagrees with the tags: ✅/🟡 without a tagged test, ❌ with one. The status itself (✅ vs 🟡)
 * stays a human decision in the matrix.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const MATRIX = 'specs/COVERAGE.md';
const IGNORED_FILES = new Set(['seed.spec.ts', 'seed-new.spec.ts']); // the agents' starting point, not a test

/** First cell of a matrix row → ids: `REC-01…03` → REC-01..03, `PROG-07, 08` → PROG-07, PROG-08. */
function expandIds(cell) {
  const match = cell.match(/^([A-Z]+)-(\d.*)$/);
  if (!match) return [];
  const [, area, rest] = match;
  return rest.split(/,\s*/).flatMap((part) => {
    const [from, to = from] = part.split('…').map(Number);
    return Array.from(
      { length: to - from + 1 },
      (_, i) => `${area}-${String(from + i).padStart(2, '0')}`,
    );
  });
}
assert.deepEqual(expandIds('REC-01…03'), ['REC-01', 'REC-02', 'REC-03']);
assert.deepEqual(expandIds('PROG-07, 08'), ['PROG-07', 'PROG-08']);
assert.deepEqual(expandIds('Таблиця XP'), []);

/** REQ id → status emoji, from the tables of the matrix. */
function readMatrix() {
  const status = new Map();
  for (const line of readFileSync(MATRIX, 'utf8').split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 3) continue;
    for (const id of expandIds(cells[1])) status.set(id, cells[2].split(/\s/)[0]);
  }
  return status;
}

/** Every test once (projects repeat them), with its REQ tags. */
function listTests() {
  const json = execFileSync(
    process.execPath,
    ['node_modules/@playwright/test/cli.js', 'test', '--list', '--reporter=json'],
    // TARGET=prod would list only @prod-safe tests (grepFor in playwright.config.ts).
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, TARGET: 'local' } },
  );
  const tests = new Map();
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      if (IGNORED_FILES.has(spec.file)) continue;
      const reqs = spec.tags.map((t) => t.replace(/^@/, '')).filter((t) => t.startsWith('REQ-'));
      tests.set(
        `${spec.file}:${spec.line} ${spec.title}`,
        reqs.map((t) => t.slice(4)),
      );
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of JSON.parse(json).suites) walk(suite);
  return tests;
}

const status = readMatrix();
const tests = listTests();

const byReq = new Map();
const untagged = [];
for (const [test, reqs] of tests) {
  if (!reqs.length) untagged.push(test);
  for (const req of reqs) byReq.set(req, [...(byReq.get(req) ?? []), test]);
}

for (const [req, list] of [...byReq].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`REQ-${req} ${status.get(req) ?? '?'}`);
  for (const test of list) console.log(`  ${test}`);
}
if (untagged.length) {
  console.log('\nNo REQ tag:');
  for (const test of untagged) console.log(`  ${test}`);
}

const errors = [];
for (const req of byReq.keys()) {
  if (!status.has(req)) errors.push(`REQ-${req}: tagged, but not in ${MATRIX}`);
  else if (status.get(req) === '❌') errors.push(`REQ-${req}: ❌ in ${MATRIX}, but has tests`);
}
for (const [req, mark] of status) {
  if ((mark === '✅' || mark === '🟡') && !byReq.has(req)) {
    errors.push(`REQ-${req}: ${mark} in ${MATRIX}, but no test is tagged with it`);
  }
}

const covered = [...status.keys()].filter((req) => byReq.has(req)).length;
console.log(
  `\n${covered} of ${status.size} requirements have tests; ${tests.size} tests, ${untagged.length} without a REQ tag.`,
);
if (errors.length) {
  console.error(`\n${errors.join('\n')}`);
  process.exit(1);
}
