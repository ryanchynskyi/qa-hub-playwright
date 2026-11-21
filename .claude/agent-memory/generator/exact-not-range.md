---
name: exact-not-range
description: A "this input picks that target" claim asserts the exact state computed for that target, not a range any target satisfies
metadata:
  type: feedback
  class: weak-assert
  origin: '2026-11-21 phase2-courses 4.2: key 1 checked as `optionAt(1)` correct|wrong and at most one wrong, which also passes when the key picks another option'
  since: 2026-11-21
---

If the expect accepts every outcome the action can produce, it does not prove which target the action hit.
**Why:** test-reviewer showed an off-by-one key mapping stayed green whenever option 1 happened to be the correct one; mutant CRS-04-5 now proves the fix.
**How to apply:** read the target's key first, compute the one expected state from the API (`correctIndex`) with a table, and assert that exact value on the target and on the verdict.
