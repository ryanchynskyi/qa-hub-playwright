---
name: absence-needs-anchor
description: A toHaveCount(0) check comes after an assertion that the state it belongs to has rendered
metadata:
  type: feedback
  class: weak-assert
  origin: '2026-11-20 plan block: interview.spec 2.4 and plan-onboarding 3.2 asserted an element absent right after a fill / a step change'
  since: 2026-11-20
---

An absence check passes at once if it runs before the element would have rendered.

**Why:** «було N» and the onboarding date summary were checked absent before the dialog or step 2 had drawn, so the tests would stay green if they showed up a moment later.
**How to apply:** first assert something present in the same state (`interview.days` value, `interview.onboard` visible), then `toHaveCount(0)`.
