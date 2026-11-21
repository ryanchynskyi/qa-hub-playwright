---
name: survivor-would-show
description: A "gone / replaced / deleted" claim needs setup in which the survivor would be visible in what the test reads
metadata:
  type: feedback
  class: weak-assert
  origin: "2026-11-21 phase2-plan-clock 5.9: A moved with replace to day 3 while B was on day 4; GET /me/interviews returns the earliest active, so a surviving B would still show A as active"
  since: 2026-11-21
---

If what the test reads would look the same with the old item still there, the deletion is not proven.
**Why:** test-reviewer found the replace check could not fail; the main session moved A after B.
**How to apply:** before asserting an item is gone, ask what the read returns if it survived (the first active, the newest row); pick dates or order so the survivor would win that read.
