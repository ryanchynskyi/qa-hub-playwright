---
name: assert-right-after-action
description: Check the state right after the action, before any navigation that may change it
metadata:
  type: feedback
  class: weak-assert
  origin: '2026-10-29 step 9.5 (AUTH-08): token checked after navigation; the next load clears it anyway, so mutation M2 (logout keeps the token) survived'
  since: 2026-10-29
---

Later navigation can repair the state the test is supposed to catch.

**Why:** the logout test stayed green on a broken logout.
**How to apply:** assert the effect of an action immediately after it, then navigate.
