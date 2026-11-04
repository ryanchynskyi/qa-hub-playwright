---
name: keep-the-planned-step
description: A step the plan names (keyboard, Tab, a real path) is not replaced by a shortcut; if it cannot be done, report it
metadata:
  type: feedback
  class: plan-dropped
  origin: '2026-11-04 feedback-admin block: scenario 2.1 used star.focus() instead of reaching the star with the keyboard'
  since: 2026-11-04
---

Scenario 2.1 asked to reach a star with Tab; the spec focused it directly, so the keyboard path was never proved.

**Why:** a star taken out of the tab order would have stayed green; test-reviewer raised it as a BLOCKER, and Shift+Tab from the comment turned out to work.
**How to apply:** walk the step as the plan writes it, trying the other direction too; if it still fails, say so in the report instead of weakening it.
