# Specs

Test plans from `playwright-test-planner`, one per block: `phase<N>-<block>.md`. The requirement
matrix and the phase plan are in [COVERAGE.md](COVERAGE.md).

## Planner brief

Copy, fill the `<…>` parts, pass as the planner's prompt:

```text
Plan the <block> block of phase <N>. Save with planner_save_plan to specs/phase<N>-<block>.md.
Start with planner_setup_page {seedFile: "tests/seed.spec.ts", project: "desktop"}; if it fails,
stop and report. (First visit: guest home, first run, focus wizard, short dashboard, tour → seedFile
"tests/seed-new.spec.ts".) App: http://localhost:4273 (uk UI, path routes).

Requirements (rows in specs/COVERAGE.md, checklist ids in $APP_DIR/docs/regression-checklist.md):
- <REQ-ID>: <what to prove> (<checklist ids>)

Already covered, do not re-plan: <spec files and what they test>.

Rules: test ids only from $APP_DIR/docs/test-ids.md; tag each scenario @REQ-<ID>; data and
answers through the ApiClient (src/api/client.ts), never hard-coded content; note every place
where the app differs from the requirement.

<lessons footer, see below>
```

## Generator brief

```text
Generate the Playwright tests of specs/phase<N>-<block>.md into <spec files>, using
generator_write_test. Read the whole plan first: its section "Corrections by the main session"
wins over the rest. Generate <scenario numbers> only. Start with generator_setup_page
{seedFile: "tests/seed.spec.ts", project: "desktop"}; if it fails, stop and report.
App: http://localhost:4273 (uk UI, path routes).

Rules: use the existing fixtures and page objects (src/fixtures/index.ts, src/pages); read them
first. No page.request, no CSS or text locators, no waitForTimeout, no test.skip, no retries. Test
data through the `api` fixture (src/api/client.ts); never hard-code content. One @REQ tag per test,
as the plan says. You cannot edit src/: if a locator or a method is missing, say so in the report
and do not work around it inline. generator_setup_page opens the guest seed: for a signed-in walk
register a throwaway account through fetch in the page (POST /api/auth/register with `timeZone:
'Europe/Kyiv'` and the password `correct-horse-battery`, else 400), then goto; delete it (DELETE
me) at the end.
A test of the kept token (`qa-hub-rt`: remember-me, logout) signs in through the UI
(`auth.login`): the API login sets the refresh cookie but never writes localStorage.
`generator_write_test` takes a repo-relative path (`tests/clock/x.spec.ts`), not an absolute one.
Server-clock plans: `adminToken` / `adminPage` are minted in real time before the test body, so
reset the server clock (`api.setClock({ offsetMs: 0 })`) before the owner's steps. The `dash` state (plan/finish/day) and the plan blocks follow the server's
today; the client computes the rest (ask-card, streak, plan-rest), so tests still align page.clock.
Your browser tools cannot set the browser clock: walk what the server decides (API, `dash`
state), write the client-clock steps from the plan and test-ids, and list them as not walked.

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
