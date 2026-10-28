#!/usr/bin/env node
/**
 * Test id guard (specs/COVERAGE.md, phase 0.7; REQ NFR-11): every `data-testid` the framework uses
 * in src/ and tests/ must be listed in the app's catalog, $APP_DIR/docs/test-ids.md. Catches a
 * renamed or removed id before a test run fails on it.
 *
 *   node scripts/check-test-ids.mjs
 *
 * Env (also read from .env): APP_DIR - a clone of the app repo.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

try {
  process.loadEnvFile();
} catch {
  // No .env: everything comes from the real environment.
}

const catalogFile = resolve(process.env.APP_DIR ?? '', 'docs/test-ids.md');
if (!process.env.APP_DIR || !existsSync(catalogFile)) {
  console.error(`[test-ids] ERROR: no ${catalogFile}. Set APP_DIR in .env to the app clone.`);
  process.exit(1);
}

// Ids are the backticked names in the first column of the catalog's tables.
const catalog = new Set();
for (const line of readFileSync(catalogFile, 'utf8').split('\n')) {
  const firstCell = line.startsWith('|') ? line.split('|')[1] : '';
  for (const [, id] of firstCell.matchAll(/`([a-z][a-z0-9-]*)`/g)) catalog.add(id);
}

// shortcut: literal ids only (getByTestId('x'), byTestId(scope, 'x'), data-testid="x"), comments
// included; a template like `nav-${target}` is checked by its prefix, and a byTestId scope with a
// comma inside a call is skipped. Upgrade to the TS AST if ids get built elsewhere.
const USES = [
  /getByTestId\(\s*['"`]([^'"`]+)['"`]/g,
  /byTestId\([^,()]+(?:\([^()]*\))?,\s*['"`]([^'"`]+)['"`]/g,
  /data-testid="([^"]+)"/g,
];

const missing = [];
let checked = 0;
for (const dir of ['src', 'tests']) {
  for (const name of readdirSync(dir, { recursive: true })) {
    if (!name.endsWith('.ts')) continue;
    const file = join(dir, name);
    // Whole text, not lines: Prettier may wrap a call after `getByTestId(`.
    const text = readFileSync(file, 'utf8');
    for (const re of USES) {
      for (const { 1: id, index } of text.matchAll(re)) {
        const prefix = id.split('${')[0];
        if (!prefix) continue; // fully dynamic: the helper itself (byTestId)
        checked++;
        const known = id.includes('${')
          ? [...catalog].some((c) => c.startsWith(prefix))
          : catalog.has(id);
        const line = text.slice(0, index).split('\n').length;
        if (!known) missing.push(`${file}:${line} ${id}`);
      }
    }
  }
}

if (missing.length) {
  console.error(`[test-ids] Not in ${catalogFile}:\n${missing.map((m) => `  ${m}`).join('\n')}`);
  process.exit(1);
}
console.log(`[test-ids] ${checked} uses, all in the catalog (${catalog.size} ids).`);
