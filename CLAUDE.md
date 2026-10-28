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
  here and in `test-reviewer`, not in those files. They start from `tests/seed.spec.ts`; plans go
  to `specs/`.
- Flow: planner (plan in `specs/`) → generator (spec) → `test-reviewer` → fix → commit. For red
  tests: healer, then `test-reviewer` on its diff; a healer fix that changes what a test asserts
  is a decision for the user, not a fix.
