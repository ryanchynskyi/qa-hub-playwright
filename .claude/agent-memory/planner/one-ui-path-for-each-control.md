---
name: one-ui-path-for-each-control
description: Arranging data through the API is fine, but a control the requirement names needs one scenario that uses it in the UI
metadata:
  type: feedback
  class: plan-dropped
  origin: '2026-11-04 feedback-admin plan: every reply arranged through the API, the admin reply form never used'
  since: 2026-11-04
---

All reply scenarios called `replyToFeedback`, so the form the checklist names (FB-008, ADM-008) had no test.

**Why:** a broken Save button in /admin would have left the whole block green; test-reviewer raised it as a BLOCKER.
**How to apply:** for each form or button named by the requirement, check that at least one scenario clicks it; the other scenarios may keep the API shortcut.
