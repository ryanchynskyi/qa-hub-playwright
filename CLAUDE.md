# qa-hub-playwright

Playwright + TypeScript framework for QA Interview Hub, built by Claude with the Playwright test
agents (see Agents). The user (Middle QA) drives the agents and must be able to explain the
workflow; `docs/WORKFLOW.md` is that explanation.

- When the framework, CI or the agent flow changes, update `docs/WORKFLOW.md` in the same change.
- App facts: `$APP_DIR/docs/test-ids.md` and the app itself (path routes, `/en/…`). `docs/brief.md`
  is partly outdated (hash routes, github.io); where they differ, test-ids.md wins.
- Local stack: `npm run stack` / `npm run stack:reset` (web :4273, API :3200, tests use
  `:4273/api/`, DB `qahub_pw`). `npm test` starts it through `webServer` if it is not running.
- Before committing framework changes: `npm run check` and the affected tests with
  `--repeat-each=3`.
- Never run anything against production except the `@prod-safe` set with `TARGET=prod`.
- The user writes in Ukrainian; answer in Ukrainian, keep code and commits in English.

## Agents

- `.claude/agents/playwright-test-{planner,generator,healer}.md` and `.mcp.json` come from
  `npx playwright init-agents --loop=claude`; re-running it overwrites them, so project rules live
  here, in `test-reviewer` and in `.claude/agent-memory/`, not in those files. They start from
  `tests/seed.spec.ts`; plans go to `specs/`.
- Their `*_setup_page` tools need `project: "desktop"`: without it they take the first project
  (`api`), which does not include the seed, and fail with "seed test not found".
- Brief every planner, generator and healer run from `specs/README.md`, ending with the lessons
  footer: that agent's `.claude/agent-memory/<agent>/MEMORY.md` and the files it lists. Agents
  never write memory; you do (`docs/agent-error-loop.md`):
  - after verifying every agent run (`test-reviewer` too), append one line to
    `.claude/agent-memory/runs.jsonl`; `errors` include classes a lesson already covers;
  - a run is partial/blocked, you redo its work, `test-reviewer` traces a finding back to it, or
    a mutant survives its test → propose a lesson (`class`/`origin`/`since`, a line in that
    agent's `MEMORY.md`); the user approves it before it is written;
  - after each phase-2 block, review the log by the rules in `docs/agent-error-loop.md`.
- Flow: planner (plan in `specs/`) → generator (spec) → `test-reviewer` → fix → commit. For red
  tests: healer, then `test-reviewer` on its diff; a healer fix that changes what a test asserts
  is a decision for the user, not a fix.

## ub-mode (Uncle Bob)

`.claude/skills/ub-mode/SKILL.md` is a verbatim copy of `unclebob/ub-mode` at `57a8bdd`; update
it by re-copying, never edit it. `/ub-mode` turns it on. Where it differs from this project, this
project wins:

- Commit and Push: a branch and a PR; merge only with a green `e2e` check. `main` is protected,
  nothing is pushed to it directly.
- Crapper, Dryer, Mutator: not installed here; skip those steps and say so. Adding them is a
  separate decision for the user.
- TDD on tests: "see it fail" means break the app's behaviour (or the assertion) once and watch
  the test go red, then restore it.
- Keep a Log: report the decisions and their reasons, not every tool call.

## Context budget

One chat stays under 150k tokens of context. `.claude/hooks/context-guard.mjs` warns from 120k
(UserPromptSubmit) and loads `.claude/handoff.md` into a new chat (SessionStart). On the warning:
finish the current step, write the handoff, propose a new chat, start nothing new.

`.claude/handoff.md` (gitignored, overwritten each time), short, in Ukrainian:

- where we are: plan step, branch, open PR and its CI state, uncommitted changes;
- decisions made in this chat and why (anything not yet in docs, memory or git);
- the next action, concrete enough to start without re-reading the old chat;
- open questions waiting for the user.
