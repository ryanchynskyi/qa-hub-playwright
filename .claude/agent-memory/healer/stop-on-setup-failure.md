---
name: stop-on-setup-failure
description: If test_run dies in global-setup, stop and report the failure; do not edit anything you could not run
metadata:
  type: feedback
  class: env-not-ready
  origin: '2026-11-04 step II-3 (feedback-reply): API 503, DB down; the healer edited a page object and a spec without one run'
  since: 2026-11-04
---

A failure in global-setup says nothing about the test, and an edit made after it is a guess.

**Why:** the feedback-reply fix was written with no run and no look at the DOM; it was right only by luck and the main session had to verify it from scratch.
**How to apply:** when `test_run` stops before any test starts (global-setup, webServer, HTTP 503), make no edits; report the error and wait for the main session to bring the stack back.
