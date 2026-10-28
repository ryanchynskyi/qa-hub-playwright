#!/usr/bin/env node
/**
 * Context budget of one chat (CLAUDE.md, "Context budget").
 *
 *   UserPromptSubmit: when the context passes WARN_AT tokens, tell Claude to write the handoff
 *                     and offer a new chat.
 *   SessionStart:     put .claude/handoff.md (the previous chat's summary) into the new chat.
 *
 * Context size = input tokens of the last model call (fresh + cache read + cache write), read
 * from the session transcript.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LIMIT = 150_000;
const WARN_AT = 120_000;
const HANDOFF = join(process.env.CLAUDE_PROJECT_DIR ?? '.', '.claude', 'handoff.md');

const input = JSON.parse(readFileSync(0, 'utf8'));

function contextTokens(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return 0;
  const lines = readFileSync(transcriptPath, 'utf8').trimEnd().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"usage"')) continue;
    const usage = JSON.parse(lines[i]).message?.usage;
    if (!usage) continue;
    return (
      usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens
    );
  }
  return 0;
}

function emit(hookEventName, additionalContext, systemMessage) {
  process.stdout.write(
    JSON.stringify({ systemMessage, hookSpecificOutput: { hookEventName, additionalContext } }),
  );
}

if (input.hook_event_name === 'SessionStart') {
  if (input.source === 'startup' && existsSync(HANDOFF)) {
    emit(
      'SessionStart',
      `Handoff from the previous chat (.claude/handoff.md):\n\n${readFileSync(HANDOFF, 'utf8')}`,
      'Loaded .claude/handoff.md from the previous chat.',
    );
  }
} else {
  const tokens = contextTokens(input.transcript_path);
  if (tokens >= WARN_AT) {
    const k = Math.round(tokens / 1000);
    emit(
      'UserPromptSubmit',
      `Context budget: this chat is at ~${k}k of the ${LIMIT / 1000}k limit. Finish the current ` +
        'step, write .claude/handoff.md (CLAUDE.md, "Context budget"), and propose continuing ' +
        'in a new chat. Do not start a new step in this one.',
      `Context ~${k}k / ${LIMIT / 1000}k: time to hand off to a new chat.`,
    );
  }
}
