---
name: use-the-named-member
description: A locator or helper that src/ already has is used as it is declared there, not rebuilt in the spec or called on the wrong object
metadata:
  type: feedback
  class: layer-bypass
  origin: '2026-11-22 phase2-courses 7.1/7.3: `page.getByRole(''alertdialog'')` instead of `coursePage.resetDialog`, and `courseStep.articleStep()` for the module export `articleStep` (TypeError at run)'
  since: 2026-11-22
---

Before writing a locator or a call, find its declaration in src/ and use that exact member or import.
**Why:** test-reviewer flagged the dialog locator outside the page object (it also never proved the test id is the alertdialog), and the main session fixed a call to a function that is not a method.
**How to apply:** for each id the Corrections name, use the page-object member (assert a role on it with `toHaveAttribute('role', …)`); import module functions (`articleStep`, `chapterAt`) from their file, never call them on a fixture.
