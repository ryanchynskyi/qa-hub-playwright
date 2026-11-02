#!/usr/bin/env node
/**
 * Runs a Playwright agent on a phase-2 block in its own git worktree (COVERAGE.md, track II-3).
 * Subagents of one session share one MCP server: one browser, one root, files land in the main
 * repo. A separate `claude -p` per worktree gets a server of its own, rooted in that worktree.
 *
 *   node scripts/block.mjs <block> <planner|generator|healer> <brief-file>
 *   node scripts/block.mjs --remove <block>
 *
 * The worktree is ../qa-hub-wt/<block> on branch phase2-<block>, from origin/main. The log goes to
 * .stack/blocks/<block>-<agent>.log. The local stack must be running; blocks share it.
 * Env (also read from .env): APP_DIR - the app clone; CLAUDE_BIN - the claude executable, by default
 * `claude` from PATH, or the one bundled with the VS Code extension.
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

try {
  process.loadEnvFile();
} catch {
  // No .env: everything comes from the real environment.
}

const root = resolve(import.meta.dirname, '..');

const log = (msg) => console.log(`[block] ${msg}`);
function fail(msg) {
  console.error(`[block] ERROR: ${msg}`);
  process.exit(2);
}

function git(...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  if (result.status !== 0) fail(`git ${args.join(' ')}: ${result.stderr.trim()}`);
  return result.stdout;
}

/** Junctions need no admin rights on Windows. Unlink it first: only the link goes, not the target. */
function removeWorktree(dir) {
  if (existsSync(resolve(dir, 'node_modules'))) unlinkSync(resolve(dir, 'node_modules'));
  git('worktree', 'remove', '--force', dir);
  log(`removed ${dir}; the branch stays`);
}

function createWorktree(dir, branch) {
  git('fetch', '-q', 'origin', 'main');
  git('worktree', 'add', '-q', '-b', branch, dir, 'origin/main');
  symlinkSync(resolve(root, 'node_modules'), resolve(dir, 'node_modules'), 'junction');
  copyFileSync(resolve(root, '.env'), resolve(dir, '.env'));
  log(`created ${dir} on ${branch}`);
}

function claudeBin() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  if (spawnSync('claude', ['--version']).status === 0) return 'claude';
  const extensions = resolve(homedir(), '.vscode/extensions');
  const found = existsSync(extensions)
    ? readdirSync(extensions)
        .filter((name) => name.startsWith('anthropic.claude-code-'))
        .sort()
        .map((name) => resolve(extensions, name, 'resources/native-binary/claude.exe'))
        .filter(existsSync)
    : [];
  return found.at(-1) ?? fail('claude not found; set CLAUDE_BIN');
}

/** The agent's own MCP tools, passed explicitly: project allow rules do not apply in a new worktree. */
function agentTools(agent) {
  const file = readFileSync(resolve(root, `.claude/agents/${agent}.md`), 'utf8');
  return file
    .match(/^tools: (.*)$/m)[1]
    .split(',')
    .map((tool) => tool.trim())
    .filter((tool) => tool.startsWith('mcp__playwright-test__'))
    .filter((tool) => tool !== 'mcp__playwright-test__browser_run_code_unsafe')
    .join(',');
}

const [first, second, briefFile] = process.argv.slice(2);

if (first === '--remove') {
  if (!second) fail('usage: block.mjs --remove <block>');
  removeWorktree(resolve(root, '../qa-hub-wt', second));
  process.exit(0);
}

if (!first || !['planner', 'generator', 'healer'].includes(second) || !briefFile) {
  fail('usage: block.mjs <block> <planner|generator|healer> <brief-file>');
}
if (!process.env.APP_DIR) fail('set APP_DIR in .env to the app clone');

const dir = resolve(root, '../qa-hub-wt', first);
if (!existsSync(dir)) createWorktree(dir, `phase2-${first}`);

const agent = `playwright-test-${second}`;
const logDir = resolve(root, '.stack/blocks');
mkdirSync(logDir, { recursive: true });
const logFile = resolve(logDir, `${first}-${second}.log`);

log(`${agent} in ${dir}, log: ${logFile}`);
// The brief goes through stdin: --allowedTools and --add-dir would take a trailing prompt as a value.
const result = spawnSync(
  claudeBin(),
  [
    '-p',
    '--allowedTools',
    agentTools(agent),
    '--add-dir',
    process.env.APP_DIR,
    '--agent',
    agent,
    '--mcp-config',
    '.mcp.json',
    '--strict-mcp-config',
  ],
  {
    cwd: dir,
    stdio: [openSync(resolve(briefFile), 'r'), openSync(logFile, 'w'), openSync(logFile, 'a')],
  },
);
if (result.error) fail(result.error.message);
log(`${agent} finished with ${result.status}`);
process.exit(result.status ?? 1);
