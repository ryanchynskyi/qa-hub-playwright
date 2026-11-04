---
name: tag-every-scenario
description: Every scenario in the saved plan names its own @REQ tag, not only a mapping in Ambiguities
metadata:
  type: feedback
  class: brief-misapply
  origin: '2026-11-04 feedback-admin plan: scenarios saved without tags, added by the main session'
  since: 2026-11-04
---

The feedback-admin plan kept the requirement split in one Ambiguity and left the scenarios untagged.

**Why:** the generator takes tags from the scenario, so the main session had to write the whole mapping by hand.
**How to apply:** put `@REQ-<ID>` in the title or the first line of every scenario when saving the plan.
