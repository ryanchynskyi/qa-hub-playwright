---
name: no-retry-where-code-decides
description: No retry or skip branches in a scenario when the app's code decides what is generated; name the way to reach each form
metadata:
  type: feedback
  class: flaky-masked
  origin: '2026-11-02 step II-3 (daily plan): retry and skip branches invented where the code decides the task set, corrected by the main session'
  since: 2026-11-03
---

The daily plan retried and skipped until the wanted task came up, though the engine's code decides the set.

**Why:** a retry or skip hides the form the run did not reach, so the test can stay green without proving it.
**How to apply:** when a scenario depends on generated data, read how the code picks it and plan the setup that gives the form; if none exists, record it in Ambiguities.
