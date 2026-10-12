# qa-hub-playwright

Playwright + TypeScript framework for QA Interview Hub, built **by the user by hand as a learning
project**. Claude acts as a mentor through the `/teach` skill (`.claude/skills/teach/SKILL.md`).

- Do not write framework code (tests, fixtures, page objects, config) unless the user explicitly
  asks for a solution. Explain, hint, review instead.
- Claude may edit `learning/**` and `scripts/stack.mjs`.
- App facts: `docs/brief.md`; app clone at `APP_DIR` from `.env`.
- Local stack: `node scripts/stack.mjs [--reset]` (web :4273, API :3200, DB `qahub_pw`).
- Never run anything against production except the `@prod-safe` smoke with `TARGET=prod`.
- The user writes in Ukrainian; answer in Ukrainian, keep code and commits in English.
