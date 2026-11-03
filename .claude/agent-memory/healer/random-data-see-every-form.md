---
name: random-data-see-every-form
description: On random data one green run proves nothing; see every form the brief names, in the way it names
metadata:
  type: feedback
  class: weak-assert
  origin: '2026-11-02 step II-3 (daily, second run): one green run on random data missed the topicless ANSWER_N branch, red in 18% of runs'
  since: 2026-11-03
---

A green run on random data covers only the forms that run happened to draw.

**Why:** the topicless `ANSWER_N` branch slipped past the healer and was found later by test-reviewer as a flaky test.
**How to apply:** when the data is random, report for each form named in the brief how you saw it; if the brief names none or one was not seen, say so instead of reporting a fix.
