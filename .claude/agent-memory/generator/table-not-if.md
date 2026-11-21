---
name: table-not-if
description: Lint forbids if/conditional expects in tests; a loop over days carries each day's expected values in its table
metadata:
  type: feedback
  class: brief-misapply
  origin: "2026-11-21 phase2-plan-clock 1.2: `if (n === 1) install else setSystemTime` and `if (n < 3) expect(...)` failed `playwright/no-conditional-in-test` (max-warnings 0)"
  since: 2026-11-21
---

`npm run check` runs eslint with `--max-warnings=0`, and `playwright/no-conditional-*` is on.
**Why:** the main session rewrote the loop before the spec could run.
**How to apply:** put per-iteration expectations in the loop's table (`[n, streak, missed]`), do one-time setup before the loop, never `if` around an action or an expect.
