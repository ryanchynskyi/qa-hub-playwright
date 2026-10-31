#!/usr/bin/env node
/**
 * Mutation run (COVERAGE.md, track II-2): proves the tests of a requirement fail when the app
 * breaks it. Each `specs/mutants/<REQ>-<n>.patch` is applied to the app clone, the stack is started
 * on it (web rebuilt), the `@REQ-<REQ>` tests run, then the patch is reverted. A red run kills the
 * mutant; a green one means the tests do not prove the requirement (`weak-assert`).
 *
 *   node scripts/mutate.mjs [filter...]    e.g. `AUTH-11`, `QUIZ`; no filter = every mutant
 *
 * A patch starts with a one-line description. A first line `Equivalent: <reason>` marks a mutant
 * that cannot change behaviour; it is reported, not run. The stack must be stopped: a running one
 * serves the unmutated app. Env (also read from .env): APP_DIR - the app clone (`npm ci` done).
 */
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { connect } from 'node:net';
import { basename, resolve } from 'node:path';

try {
  process.loadEnvFile();
} catch {
  // No .env: everything comes from the real environment.
}

const root = resolve(import.meta.dirname, '..');
const mutantsDir = resolve(root, 'specs/mutants');
const appDir = resolve(process.env.APP_DIR ?? '');
const webOrigin = 'http://localhost:4273';
const READY_TIMEOUT_MS = 300_000;

const log = (msg) => console.log(`[mutate] ${msg}`);
function fail(msg) {
  console.error(`[mutate] ERROR: ${msg}`);
  process.exit(2);
}

const git = (...args) => spawnSync('git', ['-C', appDir, ...args], { encoding: 'utf8' });

const portOpen = (port) =>
  new Promise((res) => {
    const socket = connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => res(socket.destroy() || true));
    socket.once('error', () => res(false));
  });

function kill(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    process.kill(-child.pid, 'SIGTERM');
  }
}

// Whatever happens (a crash, Ctrl+C), the app clone gets its code back and no stack is left over.
let applied = null;
let stack = null;
let built = false;
process.on('exit', () => {
  kill(stack);
  if (applied) git('apply', '-R', applied);
  // The mutated build is newer than the app's last commit, so `npm run stack` would reuse it.
  if (built) rmSync(resolve(root, '.stack/dist-pw'), { recursive: true, force: true });
});
process.on('SIGINT', () => process.exit(130));

// --- Preconditions -----------------------------------------------------------------------------

if (!process.env.APP_DIR) fail('set APP_DIR in .env to the app clone');
// Docs may be dirty (another session edits the clone's notes); code may not, or it rides along.
if (git('diff', '--quiet', 'HEAD', '--', '.', ':!*.md').status !== 0) {
  fail(
    `the app clone has uncommitted code changes (${appDir}); a mutant must start from clean code`,
  );
}
for (const port of [3200, 4273]) {
  if (await portOpen(port)) fail(`port ${port} is busy: stop the stack first`);
}

const filters = process.argv.slice(2);
const patches = readdirSync(mutantsDir)
  .filter((f) => f.endsWith('.patch'))
  .filter((f) => !filters.length || filters.some((p) => f.startsWith(p)))
  .sort();
if (!patches.length) fail(`no mutants in specs/mutants match ${filters.join(' ') || '*'}`);

// --- One mutant --------------------------------------------------------------------------------

async function waitForStack() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (stack.exitCode !== null) return false;
    if (
      await fetch(webOrigin).then(
        (r) => r.ok,
        () => false,
      )
    )
      return true;
    await new Promise((res) => setTimeout(res, 1000));
  }
  return false;
}

/** killed | survived | error */
async function runMutant(file, req) {
  const patch = resolve(mutantsDir, file);
  const apply = git('apply', patch);
  if (apply.status !== 0) {
    log(`${file}: does not apply to the app (${apply.stderr.trim()})`);
    return 'error';
  }
  applied = patch;
  built = true;
  try {
    stack = spawn(process.execPath, ['scripts/stack.mjs', '--build'], {
      cwd: root,
      stdio: 'ignore',
      detached: process.platform !== 'win32',
      windowsHide: true,
    });
    if (!(await waitForStack())) {
      log(
        `${file}: the stack did not start on the mutant (run \`npm run stack -- --build\` by hand)`,
      );
      return 'error';
    }
    const cli = resolve(root, 'node_modules/@playwright/test/cli.js');
    const tests = spawnSync(
      process.execPath,
      [cli, 'test', '--grep', `@REQ-${req}\\b`, '--retries=0', '--reporter=line'],
      { cwd: root, encoding: 'utf8' },
    );
    const output = tests.stdout + tests.stderr;
    if (/No tests found/.test(output)) {
      log(`${file}: no tests tagged @REQ-${req}`);
      return 'error';
    }
    const summary = output.match(/^\s+\d+ (failed|passed|flaky).*$/gm) ?? [];
    log(`${file}: ${summary.map((s) => s.trim()).join(', ')}`);
    return tests.status === 0 ? 'survived' : 'killed';
  } finally {
    kill(stack);
    stack = null;
    git('apply', '-R', patch);
    applied = null;
    // The next stack needs the ports back; taskkill returns before Windows frees them.
    while ((await portOpen(3200)) || (await portOpen(4273))) {
      await new Promise((res) => setTimeout(res, 500));
    }
  }
}

// --- Main --------------------------------------------------------------------------------------

const results = [];
for (const file of patches) {
  const req = basename(file, '.patch').replace(/-\d+$/, '');
  const firstLine = readFileSync(resolve(mutantsDir, file), 'utf8').split('\n', 1)[0];
  if (firstLine.startsWith('Equivalent:')) {
    results.push({ file, req, result: 'equivalent', note: firstLine.slice(11).trim() });
    continue;
  }
  log(`${file}: ${firstLine}`);
  results.push({ file, req, result: await runMutant(file, req), note: firstLine });
}

console.log('\n| Mutant | Result | Note |\n| --- | --- | --- |');
for (const r of results) console.log(`| ${r.file} | ${r.result} | ${r.note} |`);

const scored = results.filter((r) => r.result === 'killed' || r.result === 'survived');
const killed = scored.filter((r) => r.result === 'killed').length;
console.log('\n| Requirement | Killed / run |\n| --- | --- |');
for (const req of [...new Set(scored.map((r) => r.req))]) {
  const mine = scored.filter((r) => r.req === req);
  console.log(`| ${req} | ${mine.filter((r) => r.result === 'killed').length} / ${mine.length} |`);
}
if (scored.length) {
  console.log(
    `\nMutation score: ${Math.round((100 * killed) / scored.length)}% (${killed}/${scored.length})`,
  );
}

process.exitCode = results.some((r) => r.result === 'survived' || r.result === 'error') ? 1 : 0;
