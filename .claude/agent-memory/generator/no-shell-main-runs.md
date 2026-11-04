---
name: no-shell-main-runs
description: The generator has no shell; it reports what it did not run, the main session runs the specs right after it
metadata:
  type: feedback
  class: brief-misapply
  origin: '2026-11-04 feedback-admin block: specs written unrun, 2 of 25 red on the first run by the main session'
  since: 2026-11-04
---

The generator's tools cannot run `npm run check`, `tsc` or the spec files.

**Why:** in the feedback-admin block the agent could only report the specs as partly verified; the first real run was by the main session and found 2 red tests.
**How to apply:** do not try to run them or claim they pass; say which scenarios you walked in the browser and which you did not.
