---
name: probe-api-from-browser
description: Server rejections and response shapes come from fetch in browser_evaluate, not from source
metadata:
  type: feedback
  class: brief-gap
  origin: '2026-11-20 phase2-plan: negative API cases are invisible in the UI'
  since: 2026-11-20
---

The UI never shows most server rejections (400/404/409 codes), and reading source is not exploring.

**Why:** phase2-plan: the planner found the real codes (409 `plan_not_today` on «Фініш», 404 for a past day) only by calling the API from the page.
**How to apply:** log in, then `fetch('/api/…', { credentials: 'include' })` in `browser_evaluate`; a body-less POST carries no `content-type: application/json`. Take snapshots with `depth`, probe test ids with `browser_evaluate`.
