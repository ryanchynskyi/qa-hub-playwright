# Phase 2 — Social (leaderboard UI and chat)

## Corrections by the main session (win over the text below)

Checked against the app source. Prerequisites are done: `leaderboard` and `chat` fixtures,
`otherUser` and `otherPage` (a second account, name "PW Other"), `earnXp` in src/helpers/xp.ts,
`postChat(token, text, anonymous)`.

- Ambiguity 3 and scenario 1.3: `leaderboard.goto()` returns the response the page rendered. That
  is the oracle: a separate API read races with parallel tests on the shared board, and the DOM
  does not re-fetch, so `expect.poll` would not help.
- Scenario 1.5 and Ambiguity 4: an account without displayName gets a default name from its email,
  and hiding the name was removed (updateMeSchema allows only `showOnLeaderboard: true`). Only old
  accounts can have a null name, so no test can arrange it. The main session writes this scenario
  with a mocked board response: it proves the rendering, not the server rule. Generator: skip it.
- The field is `anonymous` in POST chat/messages; the response has name, anonNumber and isMine.
- Generator: UI scenarios 1.1 to 1.4 and 2.1 to 2.5. The API tests are written by the main session.

## Application Overview

Leaderboard UI (/leaderboard) and public chat (/chat), uk UI, path routes. Explored live on http://localhost:4273 (seed tests/seed.spec.ts, project desktop): guest and signed-in views, one named and one anonymous message, a ranked row. Shared-state rule: the board and chat are shared with parallel tests, so never assert the whole board or chat; find your own row by rank+XP taken from the API (`api.leaderboard('all', token).me`), and your own message by id (`api.postChat(...).id` = `data-key`) or by a unique text. One @REQ per scenario, ≤ 5 steps. Fixtures: `user` (displayName "PW Tester"), `authedPage`, `secondPage` (same user, other context).

## Prerequisites (add before generating)

- ApiClient: `postChat(token, text, anonymous = false)` — body `{ text, anonymous }`; check the real field name for "Анонімно" in the app first (not visible in the UI, only the checkbox). Extend `ChatMessage` zod schema with the author tag field only if the API returns one; the raw feed is needed to prove "no author data".
- ApiClient: `earnXp(token, catalog)` helper (today a private function in tests/api/leaderboard.spec.ts: checkAnswer with correctIndex) — move to src/helpers so UI and API specs share it. Note: only the FIRST correct answer of a question gives XP (5 XP), so "more XP" needs more distinct questions.
- ApiClient: `register` without displayName must stay possible (already is) for the "Anonymous" row.
- Page object `LeaderboardPage` (src/pages): root `leaderboard`, `leaderboard-table`, `leaderboard-period`, `leaderboard-guest-cta`, `leaderboard-login`, `leaderboard-register`, `leaderboard-me`, `leaderboard-own-row`; method `row(rank)` = `leaderboard-row` with data-key rank (child ids: `leaderboard-rank|name|anonymous|level|xp`).
- Page object `ChatPage`: root `chat`, `chat-feed`, `chat-guest-cta`, `chat-login`, `chat-register`, `chat-composer`, `chat-input`, `chat-send`, `chat-count`, `chat-anonymous`; methods `message(id)` (`chat-message` by data-key), `messageByText(text)`, `send(text, { anonymous })`.
- Fixtures `leaderboard`, `chat` registered in src/fixtures/index.ts (same pattern as `profile`).
- A guest-with-second-user context helper for the two-context scenarios: `secondPage` signs in the SAME user; for "another author" create a second user via `api.register` and log in on a new context (a `secondUserPage` fixture or helper).

## Ambiguities (app vs requirement, with source)

1. Tag format: test-ids.md says tag like "Anonim4821" (4 digits); the live app produced "Anonim44166" (5 digits, `data-value=44166`). Assert `/^Anonim\d+$/` and data-value = the number, not 4 digits. Source: live /chat, test-ids.md "Chat".
2. Guest CTA on the board: `leaderboard-guest-cta` is a dismissible box (button ×, heading "Тебе тут ще немає"); on an empty board it is shown with the empty message `leaderboard-empty`. I did not verify it stays after a dismissal or with many rows; the scenario asserts it after load only. testid names were taken from test-ids.md (the live snapshot has no testids; ARIA only).
3. A guest sees only the top 20; the requirement "find own row" works only if the test user's rank ≤ 20. On a busy shared board (parallel API test registers 21 players with XP!) the user may be rank > 20 and have no row for a guest. Therefore the row scenarios compare with the API's `top` (rank of an actual displayed row), not with `me`; or arrange XP high enough: answer many distinct questions. Decide in generation; prefer comparing a displayed row to `api.leaderboard('all').top[i]`.
4. "Anonymous" row text: I did not see a null-name row live. test-ids.md says `leaderboard-anonymous` replaces `leaderboard-name` for hidden users; whether an account registered without displayName gets a null name (rather than a default from the email) is NOT verified. Check in the first generator run; if the API returns a name, hide the name via the profile toggle (LB-006 territory) or drop the scenario to "Ideas".
5. COVERAGE.md says "xp-sorted ties go to the older account" (test-ids.md), only rank order is asserted here since ties are timing-dependent.
6. Anonymous label: test-ids.md: "Анонім"/"Anonymous" only when a message has no tag; with a tag it is "Anonim<N>". Live app always tags. The no-tag case cannot be produced through the UI.
7. Doc note "tagged since 2026-10-22": older seeded messages (if any on non-fresh DB) may have no tag; do not assert on foreign messages.
8. Chat DOM exposes `chat-delete` only for own messages; verified live (own message `mine` has it). Not asserted for `other` here beyond CHAT-002 (see Ideas for CHAT-009).
9. Live console shows 1 error + 1 warning on every page load as a guest (the cause was not investigated; likely the failed /auth/refresh 401 for a guest). Do not fail tests on console errors.

## Ideas (outside this block, the user decides)

- SOC-06 / CHAT-008, 009, 010: delete in two clicks (`chat-delete` idle→confirm), no delete for others, admin delete + ban (`chat-ban`, `chat-banned`).
- CHAT-005 counter/500 limit in the UI (`chat-count`, send disabled on empty), CHAT-006 Enter vs Shift+Enter, CHAT-007 6th message in 30 s shows `chat-error`; CHAT-011/012 paging, `chat-new` for someone else's message, `chat-empty`.
- LB-003 (`leaderboard-me` top/outside, 21st row `leaderboard-own-row` with `leaderboard-total`), LB-004 (`unranked` state: a signed-in user without XP), LB-005 week period, LB-006 hidden note, LB-007 empty board message (`leaderboard-empty`: seen live on the empty DB: "Поки нікого немає: набери XP першим.").
- SOC-07…09 comments.
- Language: the same board/chat in EN (tag spelling stays Latin; "(you)").
- Persisted period via `?period=week` link.
- Anonymous-message "stable tag" across sessions/logout and after the account's re-login.
- Cleanup: the exploration account pw-plan-soc-1102@example.com was deleted after use.

## Test Scenarios

### 1. Leaderboard UI

**Seed:** `tests/seed.spec.ts`

#### 1.1. @REQ-SOC-01 guest sees the board (max 20 rows) and a sign-in prompt, no own row

**File:** `tests/e2e/leaderboard.spec.ts`

**Steps:**

1. Arrange via ApiClient: `user` earns XP (checkAnswer with correctIndex of catalog.questions[0]) so the board is not empty. Open /leaderboard with the plain guest `page`. - expect: `leaderboard` and `leaderboard-title` visible; in `leaderboard-period` the chip `all` is pressed
2. Read `leaderboard-table` data-value and count `leaderboard-row`. - expect: Count equals data-value and is between 1 and 20
3. Look at the guest prompt. - expect: `leaderboard-guest-cta` visible; `leaderboard-login` href /login?next=%2Fleaderboard; `leaderboard-register` href /register?next=%2Fleaderboard
4. Look for the user's standing. - expect: `leaderboard-me` and `leaderboard-own-row` count 0; no row has data-state `me`, none has aria-current

#### 1.2. @REQ-SOC-01 the board shows at most 20 rows when more players have XP

**File:** `tests/e2e/leaderboard.spec.ts`

**Steps:**

1. Arrange via ApiClient: register 21 players with XP (as tests/api/leaderboard.spec.ts does; delete them in teardown). Open /leaderboard as a guest. - expect: Board loaded
2. Count `leaderboard-row`. - expect: Exactly 20 rows (boundary: 20 shown, the 21st player is not); `leaderboard-table` data-value = 20; no `leaderboard-own-row` for a guest

#### 1.3. @REQ-SOC-02 a row shows rank, name, level and XP

**File:** `tests/e2e/leaderboard.spec.ts`

**Steps:**

1. Arrange via ApiClient: `user` earns XP; read `api.leaderboard('all')` and take its first row (`top[0]`) as the oracle. Open /leaderboard as a guest. - expect: Board loaded
2. Take `leaderboard-row` with data-key = 1. - expect: `leaderboard-rank`, `leaderboard-name` (or `leaderboard-anonymous`), `leaderboard-level`, `leaderboard-xp` all visible
3. Compare the cells with the API row. - expect: rank data-value 1; `leaderboard-xp` data-value = API xp; `leaderboard-level` data-value = API level (text 'LVL <level>'); name text = API name, or `leaderboard-anonymous` when the API name is null. Leaderboard may change between the two reads: if parallel tests add XP, compare the row with the rank-matched API row from the same moment via expect.poll

#### 1.4. @REQ-SOC-02 rows are sorted by XP descending with consecutive ranks

**File:** `tests/e2e/leaderboard.spec.ts`

**Steps:**

1. Arrange via ApiClient: user A answers 2 distinct questions correctly, user B 1 (each distinct question first-correct = XP). Open /leaderboard as a guest. - expect: Board loaded, ≥ 2 rows
2. Collect data-value of every `leaderboard-xp` and `leaderboard-rank` in DOM order. - expect: XP list equals itself sorted descending; ranks equal 1..N in order (relation only, no specific rows)

#### 1.5. @REQ-SOC-02 a user with no name shows as Anonymous

**File:** `tests/e2e/leaderboard.spec.ts`

**Steps:**

1. Arrange via ApiClient: register without displayName (see Ambiguity 4), earn XP, read `api.leaderboard('all', token).me`. Delete the account in teardown. - expect: API me.name is null; if not, stop and move the scenario to Ideas
2. Open /leaderboard as a guest and find the row with data-key = me.rank and data-value = me.xp (if me.rank > 20 the guest cannot see it: see Ambiguity 3). - expect: The row contains `leaderboard-anonymous` and no `leaderboard-name`

### 2. Chat UI

**Seed:** `tests/seed.spec.ts`

#### 2.1. @REQ-SOC-03 guest reads messages and sees a sign-in prompt instead of the composer

**File:** `tests/e2e/chat.spec.ts`

**Steps:**

1. Arrange via ApiClient: `user` posts a unique text (`api.postChat`) and keeps the returned id. Open /chat as a guest. - expect: `chat` has state `ready`
2. Find `chat-message` with data-key = the id. - expect: Visible, state `other`, `chat-message-text` equals the text, no `chat-delete` inside
3. Look at the bottom of the room. - expect: `chat-guest-cta` visible; `chat-login` href /login?next=%2Fchat; `chat-register` href /register?next=%2Fchat; `chat-composer`, `chat-input`, `chat-send`, `chat-anonymous` count 0

#### 2.2. @REQ-SOC-03 user posts a message: mine with name and (ти); another context sees it as other

**File:** `tests/e2e/chat.spec.ts`

**Steps:**

1. Open /chat in `authedPage` (user 'PW Tester') and in a second context signed in as another user (Prerequisites). - expect: Both show `chat` state `ready`
2. In the first page fill `chat-input` with a unique text and click `chat-send`. - expect: `chat-input` is empty afterwards
3. Find the message by its unique text in the first page. - expect: state `mine`; `chat-message-author` state `named`, text 'PW Tester (ти)'; `chat-delete` present
4. In the second context wait up to 10 s (polling is every 5 s) for a `chat-message` with the same text. - expect: It appears with state `other`; author text 'PW Tester' without '(ти)'; no `chat-delete`

#### 2.3. @REQ-SOC-05 anonymous message gets a stable tag

**File:** `tests/e2e/chat.spec.ts`

**Steps:**

1. Open /chat in `authedPage`. Check `chat-anonymous` is unchecked by default, tick it, send two unique messages (under 5 in 30 s). - expect: Default is unchecked
2. Read `chat-message-author` of both messages. - expect: state `anonymous`; text matches /^Anonim\d+ \(ти\)$/; both have the same data-value equal to the number in the text

#### 2.4. @REQ-SOC-05 another author gets another tag and no author data is in the DOM

**File:** `tests/e2e/chat.spec.ts`

**Steps:**

1. Arrange: user 1 (authedPage) and user 2 (second context) each send one anonymous message through the UI with a unique text. - expect: Both sent
2. In user 2's context, find user 1's message (state `other`) after polling. - expect: Author text matches /^Anonim\d+$/ without '(ти)'; its data-value differs from user 2's own tag
3. Read outerHTML of user 1's `chat-message` in user 2's context. - expect: It does not contain user 1's displayName, email or id; the author part is only 'Anonim<N>'

#### 2.5. @REQ-SOC-04 HTML and script in a message are shown literally, never rendered

**File:** `tests/e2e/chat.spec.ts`

**Steps:**

1. Open /chat in `authedPage` and record page.on('dialog'). Send a unique payload: `<img src=x onerror="alert('T')"><b>T</b><script>alert('T')</script>` with T unique. - expect: The message appears
2. Read `chat-message-text` of that message. - expect: textContent equals the payload exactly; locator('img, b, script') inside it has count 0; no dialog fired
3. Reload /chat and look at the same message (now loaded from the API). - expect: Same literal text, no child elements, no dialog

#### 2.6. @REQ-SOC-03 a message that lands just before my own post still arrives by polling

**File:** `tests/e2e/chat.spec.ts`

**Steps:**

1. Open /chat in `authedPage` and fail the polls (`chat.pausePolling()`). - expect: `chat` has state `ready`
2. `otherUser` posts through the API, then the user posts through the UI. - expect: Own message visible, the other one not yet
3. Let the polls through. - expect: Within 10 s the other message appears; own message count stays 1

#### 2.7. @REQ-SOC-03 my own post coming back in a poll is not announced as a new message

**File:** `tests/e2e/chat.spec.ts`

**Steps:**

1. Open /chat in `authedPage`, filter polls to `isMine` messages (the room is shared with parallel tests), fail the polls, post two unique messages and scroll away from the bottom of the feed. - expect: Both messages visible
2. Let the polls through and wait for two: the second proves the first, which carries both messages back, was handled. - expect: `chat-new` count 0; each message count 1
3. The same user posts through the API (a message this page did not send). - expect: `chat-new` visible within 10 s

### 3. API tests (tests/api)

**Seed:** `tests/seed.spec.ts`

#### 3.1. @REQ-SOC-02 a user without XP is not on the board; a guest has no `me`

**File:** `tests/api/leaderboard.spec.ts`

**Steps:**

1. Register a user without XP. GET leaderboard('all', token) and leaderboard('all') without a token. - expect: `me` is null in both; every row isMe=false

#### 3.2. @REQ-SOC-05 anonymous tag is stable per author, differs between authors, no author ids

**File:** `tests/api/chat.spec.ts`

**Steps:**

1. Needs `postChat(token, text, anonymous)`. Two users each post two anonymous messages; read the raw GET chat/messages. - expect: Per author the tag is equal, between authors different; raw JSON has no userId/authorId/email keys and does not contain the author's email or displayName on anonymous messages

#### 3.3. @REQ-SOC-03 chat API: guests read, writes need a token, text length 1..500

**File:** `tests/api/chat.spec.ts`

**Steps:**

1. Raw POST chat/messages: without token; 501 chars; empty; whitespace-only; exactly 500 chars. GET chat/messages without token. - expect: No token → 401; 501 → 400; empty/whitespace → 400; 500 → 201; GET → 200 (verify actual codes while generating and write them in the test; the 6th message in 30 s is CHAT-007, in Ideas)
