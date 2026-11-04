# Phase 2: admin reply form (FB-07)

## Application Overview

Block: the owner answers a signed-in author's feedback in the /admin form (FB-07; checklist FB-008, ADM-008). Explored live on http://localhost:4273 (uk, path routes) as admin@example.test through the fake Google; a fresh account and a feedback (№161) were created through the API. The live UI matched test-ids.md.

## Prerequisites

None. Everything exists: fixtures `api`, `user`, `page` (signed in as `user`, see generator lesson authed-page-is-page), `admin`, `adminToken`, `replyOffer`; `api.sendFeedback(rating, token)`, `api.replyToFeedback(adminToken, id, text)`, `admin.reload()`, `admin.feedbackReply(number)`.
Setup rule for both scenarios: send the feedback first (`api.sendFeedback(4, user.token)` gives {id, number}), THEN `admin.reload()`; the `admin` fixture opens /admin before the feedback exists, so without a reload the item is not guaranteed to be there. The /admin list is long (59 items seen), newest first; always address the item by number via `admin.feedbackReply(number)`. Reply texts are made in the test (unique string), never fixed content. The `admin` fixture shares one owner account across workers: the tests only touch their own item.

## Observed behaviour (live)

- New item of a signed-in author: `admin-feedback-reply-input` empty, counter "0 / 2000", `admin-feedback-reply-save` disabled. No `admin-feedback-reply` block.
- Input of 3 spaces: counter reads "3 / 2000", save stays disabled.
- After save: the form is replaced by `admin-feedback-reply` (heading "Твоя відповідь", date, `admin-feedback-reply-seen` state=unseen "ще не переглянуто", text, `admin-feedback-reply-edit`).
- Edit: the saved block STAYS visible above the form; the edit button disappears (the form shows save and `admin-feedback-reply-cancel`); input is prefilled with the saved text.
- Cancel: the form closes, the saved text is unchanged; editing again shows the saved text, not the discarded draft.
- Saving an edit: block shows the new text, seen is again unseen.
- `admin-feedback-reply-edit` is INSIDE `admin-feedback-reply`, so the block's text includes "Редагувати": assert the text with toContainText, not toHaveText.

## Ambiguities / differences from the requirement

- No difference found between the requirement and the app.
- The requirement says "after a reload" for the author's offer; the offer shows on page load, not live, so the author's page must be reloaded after the owner saves. No wait/poll: reload once, then assert the web-first way.
- Whitespace-only: the counter counts spaces (3 / 2000) but save stays disabled; the server side ("spaces do not count", 400) is already in tests/api/feedback.spec.ts.
- `admin-feedback-reply-error` (save fails) has no safe way to be provoked without mocking: out of this block.
- Gaps, not asserted: the date of a saved reply (ADM-008; no test id, `AdminFeedbackItem` has no `repliedAt`). `unseen` after an edit is only a state check here because the reply was never seen; the rule is proved in tests/api/feedback.spec.ts. The cancel check reads the rendered text, not the stored reply.
- Added after review to tests/e2e/feedback-reply.spec.ts: with two unseen replies the offer names the older feedback (test-ids.md: "the oldest feedback with a reply").

## API tests

None new. Server rules of the reply (409 no_author, 1..2000, whitespace 400 `bad_request`, 404, edit makes it unseen) are in tests/api/feedback.spec.ts. The UI guard (disabled save) is not the server check, and the server check exists there.

## Ideas (outside the requirement)

- maxlength 2000 on the textarea and the counter at the limit (typing the 2001st character).
- `admin-feedback-reply-error` through a mocked failing PUT.
- Reply on a guest item shows `admin-feedback-no-reply` (already in profile-feedback.spec.ts).
- Marking an item done (`admin-feedback-toggle`) keeps the reply block.

## Test Scenarios

### 1. Admin reply form (FB-07)

**Seed:** `tests/seed.spec.ts`

#### 1.1. @REQ-FB-07 The owner writes a reply in the form and the author receives it

**File:** `tests/e2e/admin-reply-form.spec.ts`

**Steps:**

1. Arrange: user sends feedback via api.sendFeedback(4, user.token); admin.reload(); r = admin.feedbackReply(number) - expect: The item is on the page; r.input is empty; r.save is disabled; r.block is absent
2. Fill r.input with whitespace only (3 spaces) - expect: r.save stays disabled
3. Fill r.input with a unique reply text and click r.save - expect: r.block contains the text; r.seen has state=unseen; r.input is gone
4. In the author's `page` (signed in as user): reload - expect: replyOffer.sheet is visible with key = the feedback number

#### 1.2. @REQ-FB-07 The owner edits a saved reply; cancel keeps the saved text

**File:** `tests/e2e/admin-reply-form.spec.ts`

**Steps:**

1. Arrange: sendFeedback(4, user.token), then api.replyToFeedback(adminToken, id, first text); admin.reload(); r = admin.feedbackReply(number) - expect: r.block contains the first text; r.input is absent
2. Click r.edit - expect: r.input has the first text (toHaveValue); r.save and r.cancel are visible
3. Fill r.input with a different draft and click r.cancel - expect: r.input is gone; r.block still contains the first text and not the draft
4. Click r.edit - expect: r.input has the first text again, not the discarded draft
5. Fill a second text, click r.save - expect: r.block contains the second text and not the first; r.seen has state=unseen; r.input is gone
