---
name: walk-steps-read-log
description: Walk every step in the real browser and call generator_read_log before writing the test
metadata:
  type: feedback
  class: brief-misapply
  origin: '2026-11-02 step II-3 (social UI scenarios): no real walk of the steps, generator_read_log unused; run partial and redone'
  since: 2026-11-03
---

The social spec was written without walking the steps in the browser and without reading the log.

**Why:** the code came from no real run; test-reviewer then found the feed tag not asserted and the main session redid part of the work.
**How to apply:** for each scenario, do the steps with the browser tools, then call `generator_read_log`, then `generator_write_test`. A session that exists only inside fixtures (the owner on `/admin`) cannot be walked: say so in the report and write from the plan's observed behaviour; the main session runs that spec first.
