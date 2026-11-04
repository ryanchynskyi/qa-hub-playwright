---
name: no-ui-words
description: Assert values and states, not UI copy, and follow the plan's Corrections section even where the scenario text says otherwise
metadata:
  type: feedback
  class: brief-misapply
  origin: '2026-11-04 feedback-admin block: 2.3 asserted `Відгук №N` though Corrections said toContainText with the number'
  since: 2026-11-04
---

The Corrections section asked for the number only; the spec kept the Ukrainian words from the scenario below it.

**Why:** a copy edit in the app would turn the test red with the requirement intact, and the correction had already ruled this out.
**How to apply:** read Corrections before each scenario; in a text assertion use only data the test made (a number, a marker).
