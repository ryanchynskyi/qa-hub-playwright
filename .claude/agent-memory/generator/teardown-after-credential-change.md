---
name: teardown-after-credential-change
description: A test that changes the password or unlinks it must delete the account itself in try/finally
metadata:
  type: feedback
  class: test-data-leak
  origin: '2026-10-29 step 9.5 (AUTH-09, AUTH-16, test-reviewer round 1): the user fixture teardown logs in with the old password and fails, accounts stay in the DB'
  since: 2026-10-29
---

The `user` fixture deletes the account with the credentials it created.

**Why:** after a password change the teardown cannot log in, accounts pile up in `qahub_pw`.
**How to apply:** `try/finally` with a login by the new credentials (or `googleLogin`) and `deleteAccount`, as in `sessions.spec.ts`.
