#!/usr/bin/env node
/**
 * Local stack for this framework (docs/brief.md §2.1): Postgres, the app's e2e API on :3200 and
 * the built web app on :4273, with a database of its own (qahub_pw). Plain Node, works on Windows.
 *
 *   node scripts/stack.mjs [--reset] [--no-db] [--no-build] [--build]
 *
 *   --reset     drop the framework database first; the API recreates, migrates and seeds it
 *   --no-db     do not start the embedded Postgres (an external server is used, e.g. in CI)
 *   --no-build  reuse the existing web build as is
 *   --build     rebuild the web app even if the build looks fresh
 *
 * Env (also read from .env): APP_DIR - a clone of the app repo after `npm ci` there (required);
 * DB_URL - full URL of the framework database on an external server (implies --no-db).
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { connect } from 'node:net';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

try {
  process.loadEnvFile();
} catch {
  // No .env: everything comes from the real environment.
}

const API_PORT = 3200;
const WEB_PORT = 4273;
const DB_PORT = 5433;
const DB_NAME = 'qahub_pw';
const READY_TIMEOUT_MS = 180_000;

const args = new Set(process.argv.slice(2));
const flags = {
  reset: args.has('--reset'),
  noDb: args.has('--no-db') || Boolean(process.env.DB_URL),
  noBuild: args.has('--no-build'),
  forceBuild: args.has('--build'),
};

const children = [];
let shuttingDown = false;

const log = (msg) => console.log(`[stack] ${msg}`);

function fail(msg) {
  console.error(`[stack] ERROR: ${msg}`);
  shutdown(1);
}

// --- Paths and URLs ----------------------------------------------------------------------------

const appDir = process.env.APP_DIR ? resolve(process.env.APP_DIR) : '';
if (!appDir || !existsSync(resolve(appDir, 'apps/api/scripts/e2e-server.ts'))) {
  fail('APP_DIR must point to a clone of qa-interview-tests (after `npm ci`). Set it in .env.');
}
const apiDir = resolve(appDir, 'apps/api');
const webDir = resolve(appDir, 'apps/web');
const viteBin = resolve(appDir, 'node_modules/vite/bin/vite.js');
const prismaBin = resolve(appDir, 'node_modules/prisma/build/index.js');
// The build lives in this repo, not in the app clone, so the app's git status stays clean.
const distDir = resolve(import.meta.dirname, '../.stack/dist-pw');

const dbUrl = process.env.DB_URL ?? `postgresql://postgres:postgres@localhost:${DB_PORT}/${DB_NAME}`;
const dbTarget = new URL(dbUrl);
const dbName = dbTarget.pathname.slice(1);
const adminUrl = Object.assign(new URL(dbUrl), { pathname: '/postgres' }).toString();
const apiOrigin = `http://127.0.0.1:${API_PORT}`;
const webOrigin = `http://localhost:${WEB_PORT}`;

// The stack drops and seeds this database, so it must never point at a shared or remote one.
if (dbName !== DB_NAME) fail(`DB_URL must name the "${DB_NAME}" database, got "${dbName}"`);
if (!['localhost', '127.0.0.1'].includes(dbTarget.hostname)) {
  fail(`DB_URL must point to a local Postgres, got host "${dbTarget.hostname}"`);
}

// --- Process helpers ---------------------------------------------------------------------------

/**
 * Starts `node <args>` (never through npm or a shell: on Windows those leave orphans behind that
 * keep ports and Prisma's DLL locked). Output is prefixed with the name. A `service` that exits on
 * its own takes the whole stack down; a one-off task just resolves `done` with its exit code.
 */
function run(name, nodeArgs, { cwd, env = {}, service = false }) {
  const child = spawn(process.execPath, nodeArgs, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    // On POSIX a process group lets shutdown() kill grandchildren too; Windows uses taskkill /T.
    detached: process.platform !== 'win32',
    windowsHide: true,
  });
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on('line', (line) => console.log(`[${name}] ${line}`));
  }
  const done = new Promise((res) => child.on('exit', (code) => res(code ?? 1)));
  if (service) {
    children.push(child);
    child.on('exit', (code, signal) => {
      if (!shuttingDown) fail(`${name} exited unexpectedly (${signal ?? `code ${code}`})`);
    });
  }
  return { child, done };
}

function kill(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach(kill);
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => children.forEach(kill));

// --- Readiness helpers -------------------------------------------------------------------------

/** True if something accepts TCP connections on the port (IPv4 or IPv6 loopback). */
async function isPortOpen(port) {
  const tryHost = (host) =>
    new Promise((res) => {
      const socket = connect({ port, host });
      socket.once('connect', () => {
        socket.destroy();
        res(true);
      });
      socket.once('error', () => res(false));
    });
  return (await tryHost('127.0.0.1')) || (await tryHost('::1'));
}

const httpOk = (url) => fetch(url).then((r) => r.ok, () => false);

async function waitFor(what, check, timeoutMs = READY_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (!(await check())) {
    if (Date.now() > deadline) fail(`timed out after ${timeoutMs / 1000}s waiting for ${what}`);
    await new Promise((res) => setTimeout(res, 500));
  }
}

// --- Steps -------------------------------------------------------------------------------------

async function ensureDatabaseServer() {
  if (flags.noDb) return log('database: external server (--no-db / DB_URL)');
  if (await isPortOpen(DB_PORT)) return log(`database: Postgres already listens on :${DB_PORT}`);

  // Detached on purpose: the server is shared with the app's own e2e and the Cypress stack, so
  // it keeps running after this stack stops.
  log(`database: starting the embedded Postgres on :${DB_PORT}`);
  const db = spawn(process.execPath, ['--import', 'tsx', 'scripts/dev-db.ts'], {
    cwd: apiDir,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  db.unref();
  await waitFor(`Postgres on :${DB_PORT}`, () => isPortOpen(DB_PORT));
  log(`database: Postgres is up (pid ${db.pid}; it keeps running, stop it via taskkill /pid ${db.pid} /T /F)`);
}

function resetDatabase() {
  log(`reset: dropping database "${dbName}"`);
  const result = spawnSync(
    process.execPath,
    [prismaBin, 'db', 'execute', '--url', adminUrl, '--stdin'],
    { cwd: apiDir, input: `DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE);`, encoding: 'utf8' },
  );
  if (result.status !== 0) fail(`reset failed:\n${result.stderr || result.stdout}`);
}

/** The build is fresh when it is newer than the app's last commit. */
function buildIsFresh() {
  const index = resolve(distDir, 'index.html');
  if (!existsSync(index)) return false;
  const git = spawnSync('git', ['-C', appDir, 'log', '-1', '--format=%ct'], { encoding: 'utf8' });
  const lastCommitMs = Number(git.stdout.trim()) * 1000;
  return lastCommitMs > 0 && statSync(index).mtimeMs > lastCommitMs;
}

function buildWeb() {
  if (flags.noBuild) {
    log('web build: skipped (--no-build)');
    return Promise.resolve(0);
  }
  if (!flags.forceBuild && buildIsFresh()) {
    log('web build: up to date (newer than the app\'s last commit; --build forces it)');
    return Promise.resolve(0);
  }
  log(`web build: building into ${distDir}`);
  return run('build', [viteBin, 'build', '--outDir', distDir, '--emptyOutDir'], {
    cwd: webDir,
    // Build-time flag for test-only hooks, e.g. the shorter feedback-form threshold.
    env: { VITE_E2E_HOOKS: '1' },
  }).done;
}

// --- Main --------------------------------------------------------------------------------------

for (const port of [API_PORT, WEB_PORT]) {
  if (await isPortOpen(port)) {
    fail(`port ${port} is busy. Is the stack already running? Stop it first (or let Playwright reuse it).`);
  }
}

await ensureDatabaseServer();
if (flags.reset) resetDatabase();

// The build and the API (migrate + seed) are independent, so they run in parallel.
const build = buildWeb();
run('api', ['--import', 'tsx', 'scripts/e2e-server.ts'], {
  cwd: apiDir,
  env: { E2E_DATABASE_URL: dbUrl, PORT: String(API_PORT), WEB_ORIGIN: webOrigin },
  service: true,
});

if ((await build) !== 0) fail('web build failed');
if (!existsSync(resolve(distDir, 'index.html'))) fail(`no web build in ${distDir}; drop --no-build`);
await waitFor(`${apiOrigin}/health`, () => httpOk(`${apiOrigin}/health`));
log('api: ready');

// The web starts last, so "web answers" means the whole stack is ready. Playwright's webServer
// only polls one URL, and this makes that one URL enough.
run('web', [viteBin, 'preview', '--port', String(WEB_PORT), '--strictPort', '--outDir', distDir], {
  cwd: webDir,
  env: { API_PROXY_TARGET: apiOrigin },
  service: true,
});
await waitFor(webOrigin, () => httpOk(webOrigin));

log('ready:');
log(`  web  ${webOrigin}`);
log(`  api  ${apiOrigin}  (or ${webOrigin}/api)`);
log(`  db   ${dbUrl}`);
log('Ctrl+C stops the API and web (Postgres keeps running).');
