---
name: title-is-a-claim
description: Every effect the test title or the requirement names has its own expect, also the ones the UI does not show
metadata:
  type: feedback
  class: weak-assert
  origin: '2026-11-20 plan block: 3.1/3.2 «Done … saves the focus» never checked the saved focus, 3.1 never checked the interview chapters'
  since: 2026-11-20
---

Both onboarding tests were titled «saves the focus» and asserted only the interview side.

**Why:** «Готово» could have saved nothing for the focus and both tests would stay green; test-reviewer raised it.
**How to apply:** before writing, list the effects in the title and in the requirement; each gets an expect (API read, `readStorage` for device-local state such as `qa-hub-focus`).
