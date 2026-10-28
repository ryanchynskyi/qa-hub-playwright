# Specs

Test plans from `playwright-test-planner`, one per block: `phase<N>-<block>.md`. The requirement
matrix and the phase plan are in [COVERAGE.md](COVERAGE.md).

## Planner brief

Copy, fill the `<…>` parts, pass as the planner's prompt:

```text
Plan the <block> block of phase <N>. Save with planner_save_plan to specs/phase<N>-<block>.md.
Start with planner_setup_page {seedFile: "tests/seed.spec.ts", project: "desktop"}; if it fails,
stop and report. App: http://localhost:4273 (uk UI, path routes).

Requirements (rows in specs/COVERAGE.md, checklist ids in $APP_DIR/docs/regression-checklist.md):
- <REQ-ID>: <what to prove> (<checklist ids>)

Already covered, do not re-plan: <spec files and what they test>.

Rules (CLAUDE.md, "Agents"): explore the live UI step by step, no browser_run_code_unsafe;
test ids only from $APP_DIR/docs/test-ids.md; one scenario = one requirement, at most 5 steps,
tagged @REQ-<ID>; data and answers through the ApiClient (src/api/client.ts), never hard-coded
content; extra checks go to "Ideas", missing methods or locators to "Prerequisites"; API first:
a UI scenario only for what the user sees, a requirement the API alone proves goes to "API
tests"; note every place where the app differs from the requirement.
```

## Plan layout

`Prerequisites` (methods and locators to add) → `Ambiguities` (app vs requirement, with the
source) → scenarios → `API tests` (requirements the API alone proves, for `tests/api`) → `Ideas` (checks beyond the requirements, the user decides).
