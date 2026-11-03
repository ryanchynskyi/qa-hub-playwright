#!/usr/bin/env node
/**
 * Gate "the test is ready" (COVERAGE.md, track II-4). Run it after `test-reviewer` says ready, which
 * this script cannot see. On a pass a draft PR of the branch is marked ready for review.
 *
 *   node scripts/gate.mjs [base]            new tests: --repeat-each=3, then every mutant of the
 *                                           requirements in the changed specs must die
 *   node scripts/gate.mjs --healer [base]   healer fix: a changed assertion stops the gate, it is a
 *                                           decision for the user; then --repeat-each=3
 *
 * The base defaults to origin/main. A change outside specs (page object, fixture, config) repeats
 * the whole suite. Survivors and requirements without a mutant fail: all 5 survivors of II-2 were
 * real gaps, so the threshold is 100%; a mutant that cannot change behaviour is marked `Equivalent:`.
 * Mutants need a stopped stack and clean app code (scripts/mutate.mjs).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(import.meta.dirname, '..');

// shortcut: matches any line that mentions these (comments, toString), which only sends more
// fixes to the user; narrow it if that gets noisy.
const ASSERTION =
  /\bexpect|\.to[A-Z]\w*\(|\btest\.(skip|fixme|fail|slow)\b|@REQ-|[tT]imeout|retries/;

/** The added and removed lines of a unified diff that touch what a test asserts. */
export const assertionChanges = (diff) =>
  diff.split('\n').filter((l) => /^[+-](?![+-]{2})/.test(l) && ASSERTION.test(l));

export const reqTags = (text) => [
  ...new Set((text.match(/@REQ-[A-Z]+-\d+/g) ?? []).map((t) => t.slice(5))),
];

export const withoutMutant = (reqs, patches) =>
  reqs.filter((r) => !patches.some((p) => p.startsWith(`${r}-`)));

function stop(msg) {
  console.error(`[gate] NOT READY: ${msg}`);
  process.exit(1);
}

function main(args) {
  const healer = args.includes('--healer');
  const base = args.find((a) => !a.startsWith('--')) ?? 'origin/main';

  const git = (...a) => spawnSync('git', a, { cwd: root, encoding: 'utf8' }).stdout;
  const lines = (s) => s.split('\n').filter(Boolean);
  const from = git('merge-base', base, 'HEAD').trim();
  if (!from) stop(`no common commit with ${base}`);

  const paths = ['tests', 'src', 'playwright.config.ts'];
  const untracked = lines(git('ls-files', '-o', '--exclude-standard', '--', ...paths));
  const changed = [...lines(git('diff', '--name-only', from, '--', ...paths)), ...untracked];
  if (!changed.length) {
    console.log('[gate] no change in tests, src or the config: nothing to check');
    return;
  }
  const specs = changed.filter((f) => f.endsWith('.spec.ts') && existsSync(resolve(root, f)));

  if (healer) {
    const newFiles = untracked.map((f) =>
      readFileSync(resolve(root, f), 'utf8').replace(/^/gm, '+'),
    );
    const asserts = assertionChanges([git('diff', from, '--', ...paths), ...newFiles].join('\n'));
    if (asserts.length) {
      stop(`the fix changes what a test asserts, a decision for the user:\n${asserts.join('\n')}`);
    }
  }

  const reqs = healer
    ? []
    : reqTags(specs.map((f) => readFileSync(resolve(root, f), 'utf8')).join('\n'));
  const patches = readdirSync(resolve(root, 'specs/mutants'));
  const missing = withoutMutant(reqs, patches);
  if (missing.length) stop(`no mutant in specs/mutants for ${missing.join(', ')}`);

  const run = (script, ...a) =>
    spawnSync(process.execPath, [script, ...a], { cwd: root, stdio: 'inherit' }).status;
  const targets = changed.every((f) => specs.includes(f) || !existsSync(resolve(root, f)))
    ? specs
    : [];
  const cli = resolve(root, 'node_modules/@playwright/test/cli.js');
  if (run(cli, 'test', ...targets, '--repeat-each=3', '--retries=0', '--reporter=line') !== 0) {
    stop('red or flaky on --repeat-each=3');
  }
  if (reqs.length && run('scripts/mutate.mjs', ...reqs.map((r) => `${r}-`)) !== 0) {
    stop('a mutant survived or could not run, see the table above');
  }

  console.log('[gate] READY');
  const pr = spawnSync('gh', ['pr', 'view', '--json', 'isDraft', '-q', '.isDraft'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (pr.stdout?.trim() === 'true') {
    spawnSync('gh', ['pr', 'ready'], { cwd: root, stdio: 'inherit' });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
