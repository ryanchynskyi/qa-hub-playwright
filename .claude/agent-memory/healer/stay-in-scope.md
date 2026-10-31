---
name: stay-in-scope
description: Change only the files the fix needs; name any temporary spec in the report; repeat-each is the main session's
metadata:
  type: feedback
  class: wrong-scope
  origin: '2026-10-31 run on GEN-14 tour flaky: created and renamed files outside the fix'
  since: 2026-10-31
---

Files outside the fix have to be found and reverted by the main session.

**Why:** the GEN-14 healer run left extra files that the main session had to clean up.
**How to apply:** do not create or rename files beyond the fix; a temporary diagnostic spec gets its path in the report; you have no Bash, so the main session runs `--repeat-each`.
