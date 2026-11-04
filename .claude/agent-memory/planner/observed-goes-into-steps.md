---
name: observed-goes-into-steps
description: A behaviour worth proving goes into a scenario's expect, and an expect must be able to fail
metadata:
  type: feedback
  class: weak-assert
  origin: '2026-11-04 step II-3 (admin reply form): the re-edit prefill stayed in Observed behaviour, "no request is sent" had nothing clicked; test-reviewer raised both'
  since: 2026-11-04
---

The plan noted that editing again shows the saved text, but only under Observed behaviour, so the spec did not check it; another expect could not fail.

**Why:** the generator follows the steps; deleting the app's `setDraft` would have stayed green, and the "no request" clause on a disabled button proved nothing.
**How to apply:** move every observed behaviour you want proved into a step's expect; for each expect, name what app change would turn it red.
