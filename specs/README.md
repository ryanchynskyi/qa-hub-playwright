# Specs

Test plans from `playwright-test-planner`, one per block: `phase<N>-<block>.md`. The requirement
matrix and the phase plan are in [COVERAGE.md](COVERAGE.md).

## Planner brief

Copy, fill the `<…>` parts, pass as the planner's prompt:

```text
Plan the <block> block of phase <N>. Save with planner_save_plan to specs/phase<N>-<block>.md.
Start with planner_setup_page {seedFile: "tests/seed.spec.ts", project: "desktop"}; if it fails,
stop and report. (First visit: focus wizard, short dashboard, tour → seedFile
"tests/seed-new.spec.ts".) App: http://localhost:4273 (uk UI, path routes).

Requirements (rows in specs/COVERAGE.md, checklist ids in $APP_DIR/docs/regression-checklist.md):
- <REQ-ID>: <what to prove> (<checklist ids>)

Already covered, do not re-plan: <spec files and what they test>.

Rules: test ids only from $APP_DIR/docs/test-ids.md; tag each scenario @REQ-<ID>; data and
answers through the ApiClient (src/api/client.ts), never hard-coded content; note every place
where the app differs from the requirement.

<lessons footer, see below>
```

## Healer brief

```text
Fix <spec file>:<line> "<test title>" (<failure: error line, how often it fails>). Run it with
test_run / test_debug in project "desktop". App: http://localhost:4273. Fix the test or a page
object, not the app; a fix that changes what the test asserts is a question in your report, not
an edit. You have no Bash: the main session verifies with --repeat-each, so say what to repeat.

<lessons footer, see below>
```

## Lessons footer

End every planner, generator and healer brief with this, filled from that agent's
`.claude/agent-memory/<agent>/` ([docs/agent-error-loop.md](../docs/agent-error-loop.md)):

```text
Lessons from earlier runs (each is a rule with the failure it came from):
<the lines of .claude/agent-memory/<agent>/MEMORY.md, each followed by the Why / How to apply of
its file>

Do not write memory files. End your report with:
- Learned: 0–3 lessons that would have saved you time this run (a trap, the right entry file, a
  command that works here, a gap in this brief), each with the error class from
  docs/agent-error-loop.md; never what the code or docs already say.
- Errors: every error class you hit this run, also the ones a lesson above already covers.
```

## Plan layout

`Prerequisites` (methods and locators to add) → `Ambiguities` (app vs requirement, with the
source) → scenarios → `API tests` (requirements the API alone proves, for `tests/api`) → `Ideas` (checks beyond the requirements, the user decides).
