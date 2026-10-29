---
name: explore-step-by-step
description: Explore with snapshot, click, press_key; never browser_run_code_unsafe
metadata:
  type: feedback
  class: unsafe-tool
  origin: '2026-10-28 e3448a4 (step 9.1): one opaque browser_run_code_unsafe script asked for approval and hung the background agent'
  since: 2026-10-28
---

One script hides what was explored and needs an approval nobody sees in a background run.

**Why:** step 9.1, the planner hung waiting for approval.
**How to apply:** every exploration step is a separate snapshot/click/press_key call.
