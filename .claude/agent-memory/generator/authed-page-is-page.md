---
name: authed-page-is-page
description: authedPage is the test's own page; a guest and a signed-in user in one test need secondPage or otherPage
metadata:
  type: feedback
  class: auth-state
  origin: '2026-11-04 feedback-admin block: scenario 2.10 needed a guest and a signed-in user in one test'
  since: 2026-11-04
---

`authedPage` signs in on the same `page` that page objects from fixtures use, so that page cannot also be a guest.

**Why:** scenario 2.10 planned both states in one test, which the fixture cannot give.
**How to apply:** keep `page` as the guest and use `secondPage` or `otherPage` with `new XPage(...)` for the signed-in side.
