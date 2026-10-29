---
name: one-requirement-scenario
description: One scenario proves one requirement in at most 5 steps; extra checks go to Ideas
metadata:
  type: feedback
  class: bloated-scenario
  origin: '2026-10-28 e3448a4 (step 9.1): scenarios mixed several requirements and extra checks, tests got long and their tags lied'
  since: 2026-10-28
---

A long scenario fails for reasons unrelated to its `@REQ-*` tag.

**Why:** step 9.1, test-reviewer could not say which requirement a scenario proved.
**How to apply:** ≤ 5 steps, one `@REQ-*`; anything beyond the requirement → "Ideas".
