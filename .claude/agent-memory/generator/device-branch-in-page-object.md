---
name: device-branch-in-page-object
description: A layout branch (phone vs the rest) lives in a page object method that takes `device`, never as an if in the test
metadata:
  type: feedback
  class: layer-bypass
  origin: '2026-11-20 plan block: 1.5 and 7.3 had `if (device === ...)` around expects; lint (no-conditional-expect, max-warnings 0) refused them and the main session moved them to InterviewPage.toTopics / Checklist.showAll'
  since: 2026-11-20
---

The two @responsive tests branched on `device` inside the test body.

**Why:** the lint gate fails on any conditional expect in `tests/`, so the specs could not be committed as written.
**How to apply:** name the missing method in the report (`XPage.method(device, …)`, as `Shell` does) and write the test as if it existed; the main session adds it to src/.
