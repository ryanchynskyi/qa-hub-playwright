---
name: api-login-no-local-token
description: authedPage logs in through the API, so the kept token qa-hub-rt is not in localStorage; log in through the UI when a test checks it
metadata:
  type: feedback
  class: auth-state
  origin: '2026-10-29 step 9.5 (account.spec.ts, test-reviewer round 1): AUTH-08 and AUTH-18 read qa-hub-rt after an API login and proved nothing'
  since: 2026-10-29
---

The API login sets the refresh cookie but never writes the app's localStorage.

**Why:** a check of `qa-hub-rt` after `authedPage` is always empty, with or without the bug.
**How to apply:** a test about remember-me, logout or the kept token logs in with `auth.login`.
