#!/usr/bin/env node
/**
 * PreToolUse guard for the agents' browser (mcp__playwright-test__*): no call may name a
 * production host. src/config/env.ts guards the test runner; the MCP browser navigates wherever an
 * agent tells it, so this hook is its guard. The whole tool input is checked, so a URL inside
 * `evaluate` code (fetch, location) is caught too. Exit 2 blocks the call and tells the agent why.
 */
import { readFileSync } from 'node:fs';

// Production web, API and the old github.io copy of the app.
const PROD = /qa-interview\.com|onrender\.com|ryanchynskyi\.github\.io/i;

const input = JSON.parse(readFileSync(0, 'utf8'));
const hit = JSON.stringify(input.tool_input ?? {}).match(PROD);
if (hit) {
  console.error(
    `Blocked: ${input.tool_name} names the production host "${hit[0]}". Agents work only on the ` +
      'local stack (http://localhost:4273); production is for the @prod-safe set with TARGET=prod.',
  );
  process.exit(2);
}
