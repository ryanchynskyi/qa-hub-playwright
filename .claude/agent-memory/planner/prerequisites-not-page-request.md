---
name: prerequisites-not-page-request
description: A missing ApiClient method or locator goes to Prerequisites; never page.request in a step
metadata:
  type: feedback
  class: layer-bypass
  origin: '2026-10-28 e3448a4 (step 9.1): plan steps called page.request directly instead of ApiClient'
  since: 2026-10-28
---

`page.request` in a step skips the typed, schema-checked `ApiClient`.

**Why:** step 9.1, raw requests in the plan bypassed the contract checks.
**How to apply:** list the missing method or locator under "Prerequisites".
