# Phase 2: feedback, bug reports and admin access

## Corrections by the main session (win over the text below)

Checked against the app source ($APP_DIR, b31ff01). Prerequisites are done: `ApiClient` methods and
schemas, `uniqueText`, `pngFile`, `textFile`, fixtures `adminToken`, `admin` (AdminPage), `bugDialog`,
`feedbackDialog`, `replyOffer`, ProfilePage feedback locators. Read them first; the Prerequisites
section below is out of date. The API tests are written by the main session.

- `adminPage` now has its own browser context, so `page` stays a guest or `authedPage` in the same
  test. Prepare data with `api` and `adminToken`, look at it with `admin`.
- Tags: 1.1, 1.2 @REQ-FB-01; 1.3, 1.4
  @REQ-FB-02; 1.5, 1.6 @REQ-FB-03; 1.7, 1.8 @REQ-FB-04; 2.1, 2.2 @REQ-FB-05; 2.3, 2.4 @REQ-FB-06; 2.5
  to 2.8, 2.11 @REQ-FB-07; 2.9, 2.10 @REQ-FB-08; 3.1, 3.2 @REQ-ADM-01; 3.3, 3.4 @REQ-ADM-04.
- Scenarios 1.7, 1.8 and Ambiguity 3: wrong as written. `isImageFile` reads the file's MIME type
  (`apps/web/src/lib/bug-image.ts`): `image_type` is the type, not the content. Replace with:
  - 1.7: `textFile()` (text/plain): `bug-error` key `image_type`, no thumbnail, the text can still be
    sent.
  - 1.8, part 1: `textFile('x.png', 'image/png')`: `bug-error` key `image_failed`, no thumbnail (the
    browser cannot decode it). Part 2: `pngFile('x.txt')`: one thumbnail, no error (the name plays no
    part), and after sending the report has 1 image. Content on the server is `bad_image`, API test.
- Scenario 1.6: `addFiles` takes 4 files in one go and refuses the extra one, so `setInputFiles` with
  4 `pngFile()` gives `image_limit` and 3 thumbnails. No synthetic events here. Add scenario 1.9 (tag
  @REQ-FB-03): `bugDialog.paste()` gives one thumbnail, `bugDialog.drop()` a second, no error; then a
  paste at 3 images gives `image_limit`. Ambiguity 4 falls away.
- Ambiguity 9: a UI report is found by id, `bugDialog.send()` returns it from the POST response. No
  text filter. Use `admin.bug(id)` and `api.adminBugReports(adminToken)`.
- Scenario 3.4 and Ambiguity 7: the page re-fetches the list after a toggle, and a separate API read
  races with parallel tests. `admin.toggleBug(id)` returns the response the page rendered: assert
  `admin-bugs-count` data-value equals its `open`, and the row's `data-state`. The poll against the API
  is dropped.
- Scenario 2.10: `profile-feedback-empty` exists (test-ids.md), assert it. Prerequisite 11 and the
  "missing test id" are wrong. A guest: `profile.goto()` first (it checks the card), then
  `profile.feedback` is hidden.
- Ambiguity 11: the sheet shows the oldest unseen reply (`useFeedbackReplyDue`).
- Stars carry the rating in `data-value`, not `data-key`: `feedbackDialog.star(n)`.
- Do not assert UI words: drop 'гість' in 3.3 and `переглянуто` in 2.7 (`data-state` proves it; a guest
  author is `author: null` in the API). `Відгук №N` in 2.3: `toContainText` with the number from
  `data-value`.
- Scenario 2.5 to 2.7: `authedPage` loads the app before the test arranges data, so call
  `page.reload()` after the reply, as in the plan.

## Application Overview

Block: bug report dialog (FB-01..04), site feedback (FB-05..08), admin access (ADM-01) and admin bug list (ADM-04). Explored live as a guest and as admin@example.test (fake Google) on http://localhost:4273 (uk, desktop, seed tests/seed.spec.ts): bug dialog (`bug-text` empty by default, `bug-submit` disabled under 5 chars, `bug-error` key `image_type` for a non-image, dialog gone after send), feedback dialog (5 star buttons "N з 5", `feedback-submit` disabled, `feedback-thanks` "Дякую! Відгук №1 надіслано." with `data-value` = number), `/admin` as guest (`admin-signin`, link `/login?next=/admin`), admin cards (`admin-feedback-item` data-key = UUID, data-value = rating, state open|done; number is in the child `admin-feedback-number` data-value; guest item shows "гість" and `admin-feedback-no-reply`; `admin-bug` data-key = integer report id, state open|done; `admin-bugs-count` data-value = open, data-total = all).

Test ids come from $APP_DIR/docs/test-ids.md only. Matrix ids (FB-0N, ADM-0N from specs/COVERAGE.md) are tags; checklist ids (BUG-0NN, FB-0NN, ADM-0NN) are in parentheses. Note the two numberings clash (matrix FB-06 = thanks/number, checklist FB-006 = rate limit).

NOT PLANNED: checklist FB-006 and BUG-009 (6th submission within 10 minutes gives "Забагато відгуків/репортів"): the e2e API has no rate limits (checklist: "local dev" only). Recorded, not planned. Also out of block: ADM-05/06 (ratings, bans), BUG-002 (phone sheet), BUG-006 (remove x; only used as a step in scenario 5), BUG-008, FB-001 (no auto prompt), FB-011 only as a step. Gaps recorded by the main session after the review: FB-002 (the feedback dialog's place in the nav, Escape, x and focus: proved on the bug dialog only), FB-004 paste, drop and `image_type` in the feedback dialog (the same `useImageAttachments` as the bug dialog, proved there), FB-010 "the sheet never shows on quiet routes or over an open dialog". The admin reply form: `specs/phase2-admin-reply-form.md`.

Already covered, not re-planned: tests/e2e/admin.spec.ts (ADM-02), tests/api/security.spec.ts (ADM-03 401/403 on 12 admin endpoints). Note: the checklist marks FB-007..011 and ADM-008 [x] as `e2e/feedback-reply.spec.ts` of the APP repo; that file does not exist in this repo, so scenarios 14-19 re-prove them here.

# Prerequisites (to add before generation; the generator cannot edit src/)

ApiClient (src/api/client.ts) plus zod schemas in src/api/schemas.ts. Payload shapes from the app contract (packages/shared: bugReportSchema, feedbackSchema):

1. `sendBugReport(input: {text, route, lang, viewport, images?: {mime, data(base64)}[]}, token?)` -> POST /bug-reports, 201 `{id:number}`. Returns raw APIResponse variant too (`sendBugReportRaw`) for negative cases.
2. `sendFeedback(input: {rating, text?, route, lang, viewport, images?}, token?)` -> POST /feedback, 201 `{id:uuid, number:int}`; raw variant for negatives.
3. `adminBugReports(adminToken)` -> GET /admin/bug-reports `{open,total,items[{id,text,route,status,author,images[{id,mime,size}],...}]}`; `setBugStatus(adminToken, id, 'open'|'done')` -> PATCH /admin/bug-reports/:id; `adminBugImage(token, reportId, imageId)` -> GET .../images/:imageId (raw, for 200/401/403).
4. `adminFeedback(adminToken)` -> GET /admin/feedback `{total,open,averageRating,items[{id,number,rating,text,author,reply,repliedAt,replySeenAt,canReply,status,images}]}`; `setFeedbackStatus`; `replyToFeedback(adminToken, id, reply)` -> PUT /admin/feedback/:id/reply (409 `no_author` for guest rows); `adminFeedbackImage`.
5. `myFeedback(token)` -> GET /me/feedback `{items[{number,rating,text,reply,repliedAt,seen}]}`; `markFeedbackSeen(token, number)` -> POST /me/feedback/:number/seen (204).
6. `adminToken()`: `googleLogin(api.raw, ADMIN_EMAIL)` already exists in src/helpers/google.ts; expose it as a fixture `adminToken: string` (worker-safe: a new login per test; refresh-token rotation of the shared owner account must be checked, see Ambiguities).
7. Data helpers in src/helpers/data.ts: `uniqueText(prefix)` (unique marker string for the row a test creates, length >= 5), `pngBytes()` (a valid minimal PNG buffer that the browser can decode), `textAsPng()` (text bytes, to be uploaded with name `x.png` and mimeType image/png), `pngAsTxt()` (real PNG bytes named `x.txt`).
8. Components (src/components): `BugDialog` (open via `nav-bug`, text, submit, sent, error, count, addImage, images, removeImage, `attach(files)` via `bug-file-input`.setInputFiles, `paste(file)` and `drop(file)` dispatching ClipboardEvent/DragEvent with a DataTransfer inside page.evaluate) and `FeedbackDialog` (same set plus `rate(n)`, thanks, `thanksNumber()` through numberValue). Both expose `expectClosed()`.
9. Page objects: `AdminPage` (src/pages/admin-page.ts): `feedbackItem(number)` = `byTestId(page,'admin-feedback-item').filter({has: byTestId(page,'admin-feedback-number',...)})` (the number is `data-value`, not `data-key`, so a helper that filters by attribute is needed: `locator('[data-testid="admin-feedback-item"]:has([data-testid="admin-feedback-number"][data-value="N"])')` inside the page object); `bug(id)` = `byTestId(page,'admin-bug', id)`; `bugCount`. ProfilePage: `feedbackItem(number)` = `byTestId(page,'profile-feedback-item', number)`. A `ReplyOffer` component for `feedback-reply-offer*`.
10. Fixture `regularUser` is `authedPage` (exists). No new fixture for a guest page: the default `page` is a guest.
11. Missing locator contract (ask the app owner): `profile-feedback` has no test id for the empty state (checklist FB-010 asks for one); see Ambiguities.

# Ambiguities (app vs requirement, source)

1. The row split into single ids is a guess, by row order: FB-01 = dialog opens/closes (BUG-001, plus BUG-007 as "closes by itself"), FB-02 = text 5..4000 (BUG-003), FB-03 = up to 3 images (BUG-004, 005 limit), FB-04 = non-image `image_type` by content (BUG-005, 012 is the 403 and goes to API tests under FB-04... see below), FB-05 = rating required (FB-003), FB-06 = thanks number equals admin number (FB-007), FB-07 = owner reply reaches the author (FB-004? no: FB-008, 009), FB-08 = profile "Мої відгуки" (FB-010, 011 and FB-004's guest-with-image). Checklist FB-004 (P1, guest sends rating with an image) is spread over scenarios 12 and 13. Please confirm; tags may move.
2. BUG-007 (P1) has no own matrix id. It is tagged @REQ-FB-01 (scenario 2). If the user wants it under a different id, retag.
3. "Decided by the file content, not its name or extension": the browser-side check is not documented in test-ids.md; docs say only "each is downscaled and re-encoded as WebP". The server also checks magic bytes (PNG/JPEG/WebP) with `bad_image` (400), not `image_type`. So `image_type` is a client-only code; whether a text file named `.png` is refused by sniffing bytes or by canvas decode failure is unknown. Scenarios 7-8 prove the observable behaviour only. Source: $APP_DIR/apps/api/src/lib/uploads.ts, `bug-error` row.
4. Paste/drop of images: no test id for the drop zone; the dialog itself is the target. `image_limit` on a 4th image is reachable only by paste/drop (the add button is hidden at 3). Synthetic ClipboardEvent/DragEvent may not trigger the app's handler in every browser; check in Chromium (project desktop) first. If it fails, the scenario goes to Ideas.
5. Thanks stays 3 s then the dialog closes (test-ids.md). A test must wait for the dialog to be gone with an auto-retrying `expect(...).toBeHidden()` (default 5 s timeout is enough; do not use waitForTimeout). Live exploration: the bug dialog was already closed when read right after sending.
6. Whitespace: server trims `text` (`z.string().trim().min(5)`). The UI guard on `bug-submit` (does 5 spaces + 'ab' count as 2 or 7?) is unknown. Not planned as a scenario; asked as a question in Ideas (scenario boundary for 4 non-space chars with padding spaces is cheap once the answer is known).
7. Admin counters are DB-wide: `admin-bugs-count` (open, total), `admin-feedback-open/submitted/avg` include rows of all parallel tests. Absolute or "+1 / -1" assertions are not safe. The plan therefore asserts (a) the row the scenario created, found by its id (bug) or number (feedback), and its `data-state`; (b) the counter only via `expect.poll` against the server's own `open` value from `adminBugReports()` taken after the action (consistency, not a delta). A delta check (open goes 5 -> 4) is possible only in a serial, single-worker project; recorded in Ideas. If the user wants the "counter follows" claim proven strictly, the generator needs an isolated project (`fullyParallel: false`, workers 1) for scenario 22 only.
8. Admin list shows only the newest 200 rows (LIST_MAX). The created row is the newest at creation time, so it is in the list unless 200 rows are created in parallel between the creation and the assertion: negligible; scenarios assert immediately after creation.
9. Bug reports have no number in the UI; only `admin-bug` data-key (integer id). A report sent through the UI cannot be matched by id (the UI shows no id after sending: `bug-sent` has no value). The match is through the unique text marker: `byTestId(adminPage,'admin-bug').filter({hasText: marker})`. This is a text filter on the test's own data, not on UI copy; flagged because of the "no text locators" rule. Alternative: the app could add `data-value`/id to `bug-sent`. Ask the owner.
10. The shared owner account: `adminPage` and `adminToken` log in with the same account concurrently. The fixture comment says the admin fixture is fine for read-only tests; scenarios 12, 17-19 and 22 change data (reply, toggle) but only on rows they created, so they are safe for the owner account. Concurrent logins rotate refresh tokens per session (not per account), as documented in the `authedPage` comment; if a flake appears, give those tests their own admin session via `googleLogin`.
11. Reply offer after reload: "one `feedback-reply-offer` after a reload". A user with several unseen replies gets one sheet with `data-key` = the number of the newest? Unknown (test-ids.md says key = number). Scenarios use a fresh `user` with one replied feedback to stay unambiguous.
12. Checklist ADM-002 says the regular account sees `admin-forbidden`; verified only for the guest part live (`admin-signin` with link `/login?next=/admin`). The regular-account part is from the docs.
13. Dashboard `qa-hub-tour`, wizard etc. are off in the default seed (visitor 'returning'), as the fixtures set them; nothing in this block needs a new visitor.
14. Feedback numbers are sequential and global (`Відгук №1` on a fresh DB). Never assert a number, only equality between the thanks number and the admin/profile number.

# Scenarios

Conventions: all scenarios are independent, start from a fresh browser (guest unless stated), project desktop. Every row the test creates is found by its own id/number/unique marker.

# API tests (for tests/api, requirements the API alone proves; none needs the UI)

A1 @REQ-FB-02 POST /bug-reports text boundaries: 4 chars -> 400; 5 chars -> 201 `{id}`; 4000 chars -> 201; 4001 chars -> 400; `"  ab  "` (2 non-space chars padded to 6) -> 400 (server trims). Each created id is checked in `adminBugReports` by id.
A2 @REQ-FB-03 POST /bug-reports with 3 images -> 201 and the admin item has 3 images; 4 images -> 400. Same for /feedback.
A3 @REQ-FB-04 server rejection by content: a text payload declared `image/png` -> 400 `bad_image`; a real PNG declared `image/jpeg` -> 400 `bad_image`; a non-base64 string -> 400 `bad_image`; a mime outside png/jpeg/webp (`image/gif`) -> 400 (schema); an image over 1.5 MB decoded -> 400 `image_too_large`. A real PNG, WebP and JPEG are accepted (201). (UI guard `image_type` and this server check are two defences: scenario 7 only proves the first.)
A4 @REQ-FB-04 BUG-012: a guest and a regular account get 401 / 403 on GET /admin/bug-reports, GET /admin/bug-reports/:id/images/:imageId and PATCH /admin/bug-reports/:id; admin gets 200 on the same list. Same for /admin/feedback (list, image, PATCH, PUT reply). Note: tests/api/security.spec.ts already covers 12 admin endpoints for 401/403; first read it and add only the image endpoints and PUT reply if they are not among the 12 (do not duplicate).
A5 @REQ-FB-05 POST /feedback rating boundary: 0 -> 400, 1 -> 201, 5 -> 201, 6 -> 400, 3.5 -> 400, missing -> 400; text 1000 chars -> 201, 1001 -> 400; no text -> 201 (comment optional).
A6 @REQ-FB-06 feedback `number`: two sends by the same user (token) give two strictly increasing numbers; the admin item with that number has the same `id`; guest item `author` null and `canReply` false, signed-in item has `author` = displayName and `canReply` true.
A7 @REQ-FB-07 reply rules: PUT reply on a guest row -> 409 `no_author`; empty/whitespace reply -> 400; reply of 2000 chars -> 200, 2001 -> 400; unknown/non-UUID id -> 404; a regular account -> 403; after the reply `GET /me/feedback` shows `reply` and `seen:false`; editing the reply after `markFeedbackSeen` makes it `seen:false` again; `markFeedbackSeen` twice -> 204 both times (idempotent); another user's number -> 404; an unknown number -> 404.
A8 @REQ-FB-08 `GET /me/feedback`: newest first (two sends -> higher number first); only own rows (second user sees none of them); a guest -> 401; unauthenticated /me/feedback/:n/seen -> 401.
A9 @REQ-ADM-04 PATCH /admin/bug-reports/:id: `done` -> the item is `done` and `open` of the list drops by exactly the toggled row relative to a list read in the same test only when the test is the sole writer, so assert on the item's `status`; unknown id -> 404; invalid status -> 400; toggling back to `open` returns the item to `open`. (Counters are not asserted by value: shared DB.)

# Ideas (beyond the requirements; the user decides)

I1 Retag question: BUG-007 gets its own matrix id.
I2 Strict delta of `admin-bugs-count` (open -1 on done, +1 on reopen) in a single-worker project.
I3 FB-02 padded whitespace: 4 non-space characters + spaces; waits for the answer to Ambiguity 6.
I4 BUG-004 paste and drop of a valid image (thumbnail appears), one test each, if synthetic events work (Ambiguity 4).
I5 BUG-010 admin report details: route link only for a same-site path (`//x` and a route with whitespace/control characters are plain text), thumbnail opens a new tab; the API refuses control characters in `route` (400), prove through the API.
I6 FB-005 / BUG-008 author name on the admin item for a signed-in user ("гість" otherwise); partly in scenario 12.
I7 BUG-002 phone "Ще" sheet and feedback entry on phones.
I8 The `<b>` reply is shown as literal text (scenario 17 covers it in the profile; the admin-side `admin-feedback-reply` view is not asserted).
I9 Admin FB-005 status toggle `admin-feedback-toggle` (open/done, `admin-feedback-open` follows): same parallel limits as Ambiguity 7.
I10 `feedback-error` and `bug-error` for `storage_full`, `daily_limit`, `image_too_large` need server limits not available in e2e; not plannable.

## Test Scenarios

### 1. Bug report dialog (FB-01..FB-04)

**Seed:** `tests/seed.spec.ts`

#### 1.1. Escape and the x close the bug dialog and focus returns to the opener

**File:** `tests/e2e/bug-dialog.spec.ts`

**Steps:**

1. As a guest open /dash and click `nav-bug` - expect: `bug-dialog` is visible with state `open`, `bug-submit` is disabled
2. Press Escape - expect: `bug-dialog` is hidden; focus is on `nav-bug` (toBeFocused)
3. Click `nav-bug` again, then click `bug-close` - expect: `bug-dialog` is hidden; focus is on `nav-bug` again

#### 1.2. Guest sends a bug report: bug-sent shows and the dialog closes by itself

**File:** `tests/e2e/bug-dialog.spec.ts`

**Steps:**

1. As a guest open the bug dialog and fill `bug-text` with uniqueText('bug') (>= 5 chars) - expect: `bug-submit` is enabled
2. Click `bug-submit` - expect: `bug-sent` (role=status) is visible and `bug-dialog` state becomes `sent`
3. Do not click anything; wait with an auto-retrying assertion - expect: `bug-dialog` becomes hidden on its own (about 3 s) with no click; BUG-007 P1
4. Read the admin list through ApiClient.adminBugReports(adminToken) - expect: exactly one item has the text marker, author null (guest), status `open`

#### 1.3. Send needs 5 characters: 4 keeps it disabled, 5 enables it

**File:** `tests/e2e/bug-dialog.spec.ts`

**Steps:**

1. Open the bug dialog, fill `bug-text` with 4 characters - expect: `bug-submit` is disabled; `bug-count` is absent
2. Fill 5 characters - expect: `bug-submit` is enabled
3. Fill 4 characters again - expect: `bug-submit` is disabled again (boundary works both ways)

#### 1.4. Send accepts exactly 4000 characters and the counter shows near the limit

**File:** `tests/e2e/bug-dialog.spec.ts`

**Steps:**

1. Open the bug dialog and fill `bug-text` with 3799 characters - expect: `bug-count` is absent (only within 200 of the limit)
2. Fill 3800 characters - expect: `bug-count` is visible with data-value 3800
3. Fill 4001 characters (marker at the start) - expect: `bug-text` holds 4000 characters (maxlength), `bug-count` data-value is 4000
4. Click `bug-submit` - expect: `bug-sent` shows; the report found by its marker in adminBugReports has text length 4000

#### 1.5. Up to 3 images through the file input, the add button hides at 3, x frees a slot

**File:** `tests/e2e/bug-dialog.spec.ts`

**Steps:**

1. Open the bug dialog; attach 3 PNG buffers via `bug-file-input`.setInputFiles (pngBytes()) - expect: three `bug-image` thumbnails (keys 0,1,2) are visible; `bug-add-image` is hidden
2. Click `bug-image-remove` in the thumbnail with key 1 - expect: two thumbnails remain; `bug-add-image` is visible again
3. Attach one more image, fill `bug-text` and click `bug-submit` - expect: `bug-sent` shows; the report found by its marker has 3 images in adminBugReports

#### 1.6. A 4th image by paste is refused with image_limit and the three stay

**File:** `tests/e2e/bug-dialog.spec.ts`

**Steps:**

1. Open the bug dialog, attach 3 images - expect: `bug-add-image` is hidden
2. Paste a 4th image (BugDialog.paste dispatching a ClipboardEvent with a PNG file) - expect: `bug-error` is visible with data-key `image_limit`; still 3 `bug-image`
3. Drop a 4th image the same way (BugDialog.drop) - expect: `bug-error` data-key is `image_limit`; still 3 `bug-image`

#### 1.7. A text file posing as .png is refused with image_type

**File:** `tests/e2e/bug-dialog.spec.ts`

**Steps:**

1. Open the bug dialog and attach name `x.png`, mimeType image/png, buffer = plain text bytes (textAsPng()) - expect: `bug-error` is visible with data-key `image_type` and role=alert - expect: no `bug-image` thumbnail appears
2. Fill `bug-text` with 5+ characters - expect: `bug-submit` is enabled (the refused file does not block sending)

#### 1.8. A real PNG named .txt is accepted: content decides, not the name

**File:** `tests/e2e/bug-dialog.spec.ts`

**Steps:**

1. Open the bug dialog and attach name `x.txt`, mimeType application/octet-stream, buffer = pngBytes() - expect: one `bug-image` thumbnail appears; `bug-error` is absent
2. Fill `bug-text` and click `bug-submit` - expect: `bug-sent` shows; the report has 1 image of mime image/webp or image/jpeg (re-encoded) in adminBugReports

### 2. Site feedback (FB-05..FB-08)

**Seed:** `tests/seed.spec.ts`

#### 2.1. Send stays disabled until a star is picked; a comment alone does not enable it

**File:** `tests/e2e/feedback-dialog.spec.ts`

**Steps:**

1. As a guest open `nav-feedback` - expect: `feedback-form` state `open`, `feedback-submit` is disabled, no `feedback-rating` is `selected`
2. Fill `feedback-text` with uniqueText('fb') - expect: `feedback-submit` is still disabled
3. Focus the 4th star with Tab and press Enter - expect: `feedback-rating` with key 4 has aria-pressed=true and state `selected`, `feedback-submit` is enabled
4. Select star 1 - expect: only star 1 is selected (aria-pressed true on one star); submit stays enabled

#### 2.2. Rating without a comment and with 0 images is accepted (comment is optional)

**File:** `tests/e2e/feedback-dialog.spec.ts`

**Steps:**

1. As a guest open `nav-feedback`, pick star 5, leave `feedback-text` empty - expect: `feedback-submit` is enabled
2. Click `feedback-submit` - expect: `feedback-thanks` is visible and `feedback-form` closes by itself

#### 2.3. Thanks names the number and the admin item shows the same number

**File:** `tests/e2e/feedback-dialog.spec.ts`

**Steps:**

1. As a guest open `nav-feedback`, pick star 3, fill `feedback-text` with uniqueText('fb'), attach one PNG via `feedback-file-input` - expect: one `feedback-image` thumbnail
2. Click `feedback-submit` - expect: `feedback-thanks` data-value is a number N and its text contains `Відгук №N`; the dialog closes by itself (FB-004 P1)
3. In `adminPage` reload and find the item through AdminPage.feedbackItem(N) - expect: the item is visible; its `admin-feedback-number` data-value equals N; the item data-value (rating) is 3; shows `admin-feedback-no-reply` (guest) and one `admin-feedback-image`

#### 2.4. A signed-in user sends feedback twice and gets two different numbers

**File:** `tests/e2e/feedback-dialog.spec.ts`

**Steps:**

1. With `authedPage` open `nav-feedback`, pick star 4, send; remember N1 from `feedback-thanks` data-value - expect: dialog closes by itself
2. Open `nav-feedback` again, pick star 2, send; read N2 - expect: N2 is greater than N1 (the dialog can be sent several times)
3. In `adminPage` find AdminPage.feedbackItem(N2) - expect: the item author is the user's displayName (not `гість`) and `admin-feedback-reply-input` is present (canReply), no `admin-feedback-no-reply`

#### 2.5. Owner reply produces one reply offer after a reload and Пізніше hides it until reload

**File:** `tests/e2e/feedback-reply.spec.ts`

**Steps:**

1. Fresh `user`: api.sendFeedback(user.token, rating 4) gives {id, number}; admin api.replyToFeedback(adminToken, id, uniqueText('reply')) - expect: PUT returns 200
2. Log in as the user in the browser (authedPage) and reload /dash - expect: exactly one `feedback-reply-offer` with data-key = the feedback number is visible
3. Click `feedback-reply-offer-later` - expect: the sheet is hidden
4. Reload the page - expect: `feedback-reply-offer` appears again (Пізніше hides it only until reload)

#### 2.6. Переглянути opens /profile#feedback-N with the reply and the sheet does not come back

**File:** `tests/e2e/feedback-reply.spec.ts`

**Steps:**

1. Fresh `user` with one feedback replied by the owner through the ApiClient; open /dash signed in; wait for `feedback-reply-offer` - expect: the offer is visible
2. Click `feedback-reply-offer-open` - expect: URL is /profile#feedback-N (N = the number); `profile-feedback-item` with key N is in the viewport (toBeInViewport) with state `replied`; its `profile-feedback-reply` has the reply text
3. Reload the page - expect: `feedback-reply-offer` is not shown (absent), ApiClient.myFeedback shows seen true for N

#### 2.7. Admin sees the reply as seen only after the author opened it

**File:** `tests/e2e/feedback-reply.spec.ts`

**Steps:**

1. Fresh `user` sends feedback and the owner replies through the ApiClient
2. In `adminPage` find AdminPage.feedbackItem(N) - expect: `admin-feedback-reply-seen` has state `unseen`
3. As the user (authedPage) click `feedback-reply-offer-open`, then in `adminPage` reload - expect: the same item's `admin-feedback-reply-seen` state is `seen` (text `переглянуто`)

#### 2.8. A reply with HTML is shown as plain text to the author

**File:** `tests/e2e/feedback-reply.spec.ts`

**Steps:**

1. Fresh `user` sends feedback; owner replies with the text `<b>` + uniqueText('bold') + `</b>` through the ApiClient
2. Open /profile as the user - expect: `profile-feedback-reply` of item N contains the literal characters `<b>` and `</b>` (toHaveText with the raw string) and has no `b` element child

#### 2.9. Profile Мої відгуки lists own feedback newest first with reply or waiting state

**File:** `tests/e2e/profile-feedback.spec.ts`

**Steps:**

1. Fresh `user` sends two feedback items through the ApiClient (numbers N1 < N2, ratings 5 and 2); owner replies to N1 only
2. Open /profile signed in (authedPage) - expect: `profile-feedback` is visible with two `profile-feedback-item` rows, N2 before N1 (compare the data-key order of the rows inside the section; the section holds only this user's rows, so `first` is stable in parallel)
3. Check each row - expect: N2: state `waiting`, data-value 2, `profile-feedback-waiting` visible, no reply; N1: state `replied`, data-value 5, `profile-feedback-reply` visible

#### 2.10. A user without feedback has no items and a guest has no Мої відгуки section

**File:** `tests/e2e/profile-feedback.spec.ts`

**Steps:**

1. As a guest open /profile - expect: `profile-feedback` is absent
2. With `authedPage` (fresh `user`, no feedback) open /profile - expect: no `profile-feedback-item` exists (empty state: see Ambiguity about the missing test id)

#### 2.11. Guest feedback in the admin shows no reply form

**File:** `tests/e2e/profile-feedback.spec.ts`

**Steps:**

1. api.sendFeedback(no token, rating 3) as a guest gives {number}
2. In `adminPage` find AdminPage.feedbackItem(number) - expect: `admin-feedback-no-reply` is visible; `admin-feedback-reply-input` and `admin-feedback-reply-save` are absent

### 3. Admin access and bug reports (ADM-01, ADM-04)

**Seed:** `tests/seed.spec.ts`

#### 3.1. Guest on /admin sees the sign-in prompt

**File:** `tests/e2e/admin-access.spec.ts`

**Steps:**

1. As a guest open /admin - expect: `admin-signin` is visible; `admin-signin-link` has href /login?next=/admin - expect: `admin` page root and `admin-kpis` are absent, `admin-forbidden` is absent

#### 3.2. A regular account on /admin sees admin-forbidden and no data

**File:** `tests/e2e/admin-access.spec.ts`

**Steps:**

1. With `authedPage` open /admin - expect: `admin-forbidden` is visible
2. Look for data - expect: `admin-kpis`, `admin-bugs` and `admin-feedback` are absent; `admin-signin` is absent; `nav-admin` is absent in the sidebar

#### 3.3. Admin sees a bug report created through the API, newest first, by its id

**File:** `tests/e2e/admin-bugs.spec.ts`

**Steps:**

1. api.sendBugReport as a guest with text uniqueText('bug') gives {id} - expect: 201
2. In `adminPage` reload /admin - expect: `admin-bug` with key id is visible with state `open` and shows 'гість'; text contains the marker
3. Send a second report (id2) and reload - expect: `admin-bug` key id2 appears before key id in DOM order (compare the two indexes among all `admin-bug` rows, not an absolute position)

#### 3.4. Admin toggles a bug report done and open again and the counter follows

**File:** `tests/e2e/admin-bugs.spec.ts`

**Steps:**

1. api.sendBugReport as a guest gives {id}; in `adminPage` reload and find `admin-bug` with key id - expect: state `open`; button `admin-bug-toggle` says to mark as fixed
2. Click `admin-bug-toggle` inside that row - expect: the row state becomes `done`; no `admin-bug-error`
3. Compare the counter with the server - expect: `admin-bugs-count` data-value converges (expect.poll) to ApiClient.adminBugReports().open; the row of id is `done` in the API
4. Click `admin-bug-toggle` again - expect: the row state is `open` again and the API item status is `open`
