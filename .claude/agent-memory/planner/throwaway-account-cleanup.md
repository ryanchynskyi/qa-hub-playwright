---
name: throwaway-account-cleanup
description: A page navigation drops window variables; keep the throwaway account's email and token where they survive, delete it before the report
metadata:
  type: feedback
  class: test-data-leak
  origin: "2026-11-21 phase2-courses: the second throwaway account stayed in qahub_pw, its email and token lived in window.* and were lost on goto"
  since: 2026-11-21
---

Variables set with `browser_evaluate` (`window.__token`, the email) are gone after any navigation, and `DELETE /api/me` needs both the token and `confirmEmail`.
**Why:** the planner could not delete its second account; the main session had to find it in the DB.
**How to apply:** right after register, write the email to `localStorage` (it survives goto); get a fresh token with `POST /api/auth/refresh` (the refresh cookie survives); delete every account you created before the final report and list any you could not.
