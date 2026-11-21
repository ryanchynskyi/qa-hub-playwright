---
name: copy-key-lists
description: A list of keys or ids in an expect is copied whole from test-ids.md (or the walk), never retyped from memory
metadata:
  type: feedback
  class: brief-misapply
  origin: "2026-11-21 phase2-plan-clock 3.1: the plan listed the «Фініш» ticker keys as interview, when, finish, mistakes; test-ids lists streak too, the test went red on a true app state"
  since: 2026-11-21
---

A retyped key list loses an item, and an exact-count expect turns red on a correct app.
**Why:** the main session had to fix the plan and the test (5 keys, not 4).
**How to apply:** when a step lists keys, ids or items in order, copy them from test-ids.md or the snapshot of the walk and say which; if the two differ, write both in Ambiguities.
