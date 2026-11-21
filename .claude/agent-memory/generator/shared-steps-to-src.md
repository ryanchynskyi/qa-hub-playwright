---
name: shared-steps-to-src
description: A locator or a flow helper the spec needs goes into the page object/component, not inline or copied between spec files
metadata:
  type: feedback
  class: layer-bypass
  origin: "2026-11-21 phase2-plan-clock suites 3-4: inline page.getByTestId('dash-day-date') and the same playRound/playFinish/playWarmup copied into two spec files"
  since: 2026-11-21
---

Inline locators and copied flows drift apart and hide what the page object offers.
**Why:** the main session moved `dash-day-date` to `DashboardPage.dayDate` and the rounds to `Finish.play`.
**How to apply:** a test id not in a page object, or a flow two specs need, goes to the report as "add to src/: <name>"; write the spec as if it exists only when the main session asked you to.
