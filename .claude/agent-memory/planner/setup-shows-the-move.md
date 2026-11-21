---
name: setup-shows-the-move
description: A claim that something moves between days (re-pack, carry-over) needs setup data that differs between those days
metadata:
  type: feedback
  class: weak-assert
  origin: "2026-11-21 phase2-plan-clock: the convention 'chapterIds = all chapters of one topic' gave every plan day the same topic, so mutant PLAN-07-1 (no re-pack) survived 'missed topics move to today'"
  since: 2026-11-21
---

With one topic, every day's `topicIds` is the same, and a "moved to today" check holds whether the move happens or not.
**Why:** the re-pack scenario stayed green with the re-pack removed.
**How to apply:** for each "moves / re-packs / carries over" claim, plan setup data in which the source and the target day differ before the move (several small topics, a day size that ends a topic), and name in the step what the target held before.
