# qa-hub-playwright

Playwright + TypeScript framework for QA Interview Hub. Since 2026-10-13 the framework is built
and maintained by Claude; the user (Middle QA) learns from it through the course in `learning/`
and the `/teach` skill (`.claude/skills/teach/SKILL.md`).

- Claude maintains the framework (`src/`, `tests/`, config, CI) and `learning/**`. Practice tasks
  in the modules are the user's: in a `study/*` branch, hint and review instead of solving, unless
  the user asks for the solution.
- When the framework changes, update the module text and `learning/INTERVIEW.md` that describe it.
- App facts: `$APP_DIR/docs/test-ids.md` and the app itself (path routes, `/en/…`). `docs/brief.md`
  is partly outdated (hash routes, github.io); where they differ, test-ids.md wins.
- Local stack: `npm run stack` / `npm run stack:reset` (web :4273, API :3200, tests use
  `:4273/api/`, DB `qahub_pw`). `npm test` starts it through `webServer` if it is not running.
- Before committing framework changes: `npm run check` and the affected tests with
  `--repeat-each=3`.
- Never run anything against production except the `@prod-safe` set with `TARGET=prod`.
- The user writes in Ukrainian; answer in Ukrainian, keep code and commits in English.
