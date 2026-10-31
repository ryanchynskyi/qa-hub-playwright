---
name: ui-guard-not-server-check
description: A disabled button does not prove the server check; plan an API negative test for each server rejection
metadata:
  type: feedback
  class: weak-assert
  origin: '2026-10-31 mutant AUTH-18-1: plan 9.5 had only the disabled delete button, DELETE /me without the email check stayed green'
  since: 2026-10-31
---

The UI guard and the server check are two defences; a test of one does not prove the other.

**Why:** the account could be deleted with any confirm email and no test noticed.
**How to apply:** for every rejection the requirement names (error code), add a negative case to "API tests".
