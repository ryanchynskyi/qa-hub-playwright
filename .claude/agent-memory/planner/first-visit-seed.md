---
name: first-visit-seed
description: First-visit features (focus wizard, short dashboard, tour) need seedFile tests/seed-new.spec.ts
metadata:
  type: feedback
  class: wrong-seed
  origin: '2026-10-28 d7c8472 (step 9.3): the default seed marks focus and tour as done on every load, so the first visit could not be explored'
  since: 2026-10-28
---

The default seed (`visitor: 'returning'`) writes the focus and tour keys before each load.

**Why:** step 9.3, the onboarding was unreachable from the default seed.
**How to apply:** the block is about a new visitor → `seedFile: "tests/seed-new.spec.ts"`.
