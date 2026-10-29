---
name: setup-page-fails
description: If planner_setup_page fails, stop and report; never plan from source code alone
metadata:
  type: feedback
  class: env-not-ready
  origin: '2026-10-28 e3448a4 (step 9.1): setup page failed and the plan was written from app source, without the live UI'
  since: 2026-10-28
---

A plan written from source code misses what the user actually sees (wizards, sheets, empty states).

**Why:** step 9.1, the plan from code alone did not match the live UI.
**How to apply:** any `planner_setup_page` error → stop, report the error, write no plan.
