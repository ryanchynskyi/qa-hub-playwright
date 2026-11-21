---
name: extra-claim-fits-setup
description: An expect beyond the plan's must hold for the test's own setup; walk it, or leave it out
metadata:
  type: feedback
  class: weak-assert
  origin: "2026-11-21 phase2-plan-clock 1.1: added 'plan.missed is null' to the rest-day test, but its setup never did D0, so D0 was a missed day and the test went red on a true app state"
  since: 2026-11-21
---

A claim the plan does not make, added unwalked, can contradict the setup the plan gives.
**Why:** the main session had to change the setup (do D0 too) before the test could prove the rest day.
**How to apply:** for each expect not in the plan's steps, check it against the setup's data in the walk; if not walked, leave it out and name it in the report.
