---
name: api-first
description: A UI scenario only for what the user sees; what the API alone proves goes to "API tests"
metadata:
  type: feedback
  class: pyramid-level
  origin: '2026-10-28 a7d0876: UI scenarios planned for rules the API alone proves'
  since: 2026-10-28
---

API tests are faster and more stable than UI for the same claim (test pyramid).

**Why:** UI scenarios duplicated server rules already provable through the API.
**How to apply:** for each requirement ask "does the user have to see it?"; no → "API tests".
