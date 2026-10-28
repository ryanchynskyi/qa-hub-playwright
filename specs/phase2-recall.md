# Phase 2: Recall (REC-04, REC-05, REC-06)

## Application Overview

Active Recall at /recall. Explored live as a guest (uk UI, desktop, seed tests/seed.spec.ts, project desktop; setup succeeded). Flow: setup view (topic list, presets, count chips, "Почати: N карток" = recall-start) -> session (recall-progress "n / N", recall-card state front|back, recall-reveal, Space/Enter reveal, recall-rate 1..5, keys 1..5 rate) -> result view. Rating is stored in localStorage (qa-hub-guest-v1, cards.<id> {rating, reviews, dueAt, history, lastXpDate}) for a guest and via POST /me/recall/rate for an account. Session card order in "Усі теми" is not scope order (first card was Java Core), so a test must read the card id from recall-card[data-key], never assume a card. Fixtures: `page` = guest, `authedPage` + `user` = account.

## Prerequisites

Done before the generator runs (checked against the live API and a full 10-card session):

1. `src/pages/recall-page.ts`, fixture `recall`: `goto()`, `startSession()`, `currentCardId()`,
   `showAnswer(key?)` (button, `Space` or `Enter`), `rateCard(n, byKey?)` (waits for the next card,
   or for `done` after the last), locators `card`, `question`, `reveal`, `back`, `answer`, `rates`,
   `rate(n)`, `progress`, `bar` (segments), `hero`, `caughtUp`, `know`, `finish`, `done`.
   The counters use `data-value` / `data-total` (test-ids.md "v" / "t"); read them with
   `numberValue` or `toHaveAttribute`, never `data-v`.
2. `RecallCard` has `topicId`, `question`, `answer`, `core`. `question` is plain text and equals
   the UI front; `answer` is markdown (backticks), so compare the UI answer with
   `toContainText` on a fragment without markup, or with the first plain words, not equality.
3. `ApiClient.rateCard(token, cardId, rating)` → `RateResult` `{result: {xpGained, grants}, at,
card: {id, state}}`, `state` = `CardState` `{rating, reviews, dueAt, history, lastXpDate}`.
   Live: rating 1 → `dueAt = at`, +3 XP; then 5 the same day → 0 XP, `dueAt - at` = exactly
   14 × 86400000, `history` [1, 5]. Errors: rating 0, 2.5, "3", missing → 400 `bad_request`;
   unknown card → 404 `not_found`; no token → 401 `unauthorized`. Negative tests use `api.raw`.
4. `Progress` is unchanged (GET /me/progress has `cards`, add it only if a test reads it).
5. `GuestState.cards` is `Record<string, CardState>` for `readGuest` (read with `expect.poll`).

## Ambiguities

1. "Card n of N": the UI shows "1 / 10" (recall-progress, `data-v`=n, `data-t`=N), not the words "Card n of N". Tests assert v/t, not text. Source: live UI, test-ids.md (recall-progress).
2. Rating 1 and the counter: after rating a card 1 in a 10-card session the counter becomes "2 / 11" (N grows by one) and the bar gets 11 segments; the card is put back three places later (position n+3; Recall.tsx `rate()`: `at = i + 4`), and only once per session (`requeued`). Corrected after the generator run: the planner first wrote "appended at the end", the live run showed it at 5 / 11. The requirement says only "comes back in the same session"; the N+1 behaviour is app behaviour and the scenario asserts N = 11. Source: live UI.
3. Rating labels: UI hints are 1 "Не знаю", 2 "Слабко", 3 "Частково", 4 "Добре", 5 "Як на співбесіді". The setup hint says "1 і нижче повертається в цій же сесії, 2 через 1 день, 3 через 3 дні, 4 через тиждень, 5 через два тижні". So the requirement's intervals 1/3/7/14 map to ratings 2/3/4/5; rating 1 = 0 days (due at once). Source: shared engine RECALL_INTERVAL_DAYS = [0,1,3,7,14]; setup page text.
4. "XP at most once per card per local day": the engine (packages/shared engine/items.ts) grants XP when the card is new or due AND `lastXpDate` is not today. So a card rated 1 (due at once) and rated again the same day gives 0 XP the second time. The requirement wording ("a card that is not due gives 0") covers only the not-due case; the same-day case is a separate rule. "Local day" uses the account `timeZone` (set at register, default in ApiClient Europe/Kyiv).
5. Server clock cannot be controlled from a test: `rate()` uses the server's `now()`. So an API test cannot prove "XP again the next local day" or "card due after N days". It proves only: dueAt - at = interval * 86400000 (the response gives both the server time `at` and `dueAt`), and same-day behaviour. Next-day XP can be proved only for a guest (client-side engine) with `page.clock`; see Ideas.
6. XP assertions: the daily task REVIEW_DUE (and level/streak bonuses) can add extra grants to `result.xpGained`. Assert on the `xpLog` entries with `reason: 'recall'` and `refId` = card id (and on `xpGained` only for a user whose first rating is the only action), not on total XP deltas of a used account. Verify against a real response before fixing the exact numbers; the numbers in the requirement (+3, +5) are from XP_RULES.recallDue / recallDueGood.
7. Console: every page load logs a 401 for /api/auth/refresh as a guest; not an app bug, ignore it in console checks.
8. The "Коментарі" tab appears beside "Відповідь" on the back of the card; out of scope.

## Scenarios

### 1. Card front shows the question and hides the answer

**Tags:** @REQ-REC-04. **Needs:** guest (`page`).
**Seed:** tests/seed.spec.ts (project desktop).
**Steps:**

1. Open /recall and click `recall-start` (default 10 cards, topic "Усі теми").
2. Read `recall-card[data-key]` and look up that card in `api.recallCards()`.
   **Expected:**

- `recall-card` has `data-state=front`; `recall-front` text equals the API `question` of that card.
- `recall-reveal` is visible; `recall-back`, `recall-answer` and `recall-rates` are not visible; the API `answer` text is not in the DOM.
- `recall-progress` has `data-v=1`, `data-t=10`.

### 2. Reveal by button shows the model answer and rating buttons 1 to 5

**Tags:** @REQ-REC-04. **Needs:** guest (`page`).
**Steps:**

1. Open /recall, click `recall-start`, remember the card id.
2. Click `recall-reveal`.
   **Expected:**

- `recall-card` has `data-state=back`; `recall-answer` text equals the API `answer` of that card; `recall-front` still shows the question.
- `recall-rate` has exactly 5 buttons with `data-key` 1..5, all enabled; `recall-reveal` is gone.
- `recall-progress` is still `data-v=1`.

### 3. Space and Enter reveal the answer (parametrised)

**Tags:** @REQ-REC-04. **Needs:** guest (`page`).
**Steps:**

1. Open /recall, click `recall-start`.
2. Press the key (run twice: `Space`, then `Enter`) without focusing any element.
   **Expected:**

- `recall-card` has `data-state=back`, `recall-rates` is visible with 5 buttons.
- Negative variant (same test, extra step): on the back, pressing Space again does not change the card or the counter (`data-state=back`, `data-v` unchanged).

### 4. Rating moves to the next card and the counter updates

**Tags:** @REQ-REC-05. **Needs:** guest (`page`).
**Steps:**

1. Open /recall, click `recall-start`, remember card id A (`data-key`).
2. Reveal and click `recall-rate` key 4.
   **Expected:**

- `recall-progress` is `data-v=2`, `data-t=10`; `recall-card` has `data-state=front` and a `data-key` different from A.
- The first segment of `recall-bar` has state `ok` (rating 4-5), the second is `current`.
- Guest store (readGuest): `cards[A].rating` = 4, `reviews` = 1.
- Variant with the keyboard (`rateWithKey(3)` after Space): first segment `warn`, counter 2 / 10. Put it in the same file as a second test, not in the same body.

### 5. A card rated 1 comes back in the same session

**Tags:** @REQ-REC-05. **Needs:** guest (`page`).
**Steps:**

1. Open /recall, click `recall-start`, remember card id A, reveal, rate 1.
2. Rate the next three cards 5 (reveal + rate).
   **Expected:**

- After step 1: `recall-progress` is `data-v=2`, `data-t=11` (N grows by one), the first bar segment is `bad`, and the bar has 11 segments.
- At position 5 / 11 `recall-card[data-key]` equals A and `data-state=front`.
- (If 10 reveal-and-rate rounds are too slow for the 5-step limit, loop in a helper `rateThrough(page, n)`; the scenario still proves one requirement.)

### 6. Rating 1 does not mark the card "known" (UI side of the 1 vs 2 difference)

**Tags:** @REQ-REC-05. **Needs:** guest (`page`). Optional; keep only if scenario 5 is judged too weak.
**Steps:**

1. Open /recall, start, reveal, rate 1 on card A, click `recall-finish`.
2. Open /recall again (same scope).
   **Expected:**

- `recall-hero` (due cards) is shown with `data-v` >= 1 because A is due at once; `recall-caught-up` is not shown.

### 7. A signed-in user's rating is saved on the server and survives a reload

**Tags:** @REQ-REC-05. **Needs:** account (`authedPage` + `user`).
**Steps:**

1. Open /recall, click `recall-start`, remember card A, reveal, rate 5.
2. Reload the page, open /recall.
   **Expected:**

- GET /me/progress (via `api.progress(user.token)`) has an xpLog entry `reason: 'recall'`, `refId` = A.
- After the reload the recall scope shows `recall-hero` is absent or does not count A as due (A is due in 14 days); `recall-pool` has `data-later=1`, `data-due=0`. (`recall-know` stays 0%: one card of 310 rounds down.)
- Why UI + account: it proves that the UI sends the rating to the server, which the guest scenarios cannot.

## API tests

For `tests/api/recall.spec.ts`. Needs: account per test (`user` fixture, a fresh account each time, so every card is new). Card id from `api.recallCards()`; use distinct cards per test where a test needs a "new" card.

### A. REC-06 XP of a new card

**Tags:** @REQ-REC-06.

1. Register (fixture), take cards C1..C4 from `recallCards()`.
2. Rate C1 with 3, C2 with 4, C3 with 5, C4 with 1 (each: `rateCard`).
   **Expected:** xpLog `recall` entries: C1 = 3, C2 = 5, C3 = 5, C4 = 3 (rating <= 3 gives +3, 4-5 gives +5). Use `test.step` or a table-driven loop `[rating, xp]`: 1/3, 2/3, 3/3, 4/5, 5/5 on five different cards.

### B. REC-06 intervals 1/3/7/14 days

**Tags:** @REQ-REC-06.

1. For each rating 2, 3, 4, 5 rate a new card.
   **Expected:** `state.dueAt - at` equals 1, 3, 7, 14 x 86400000 ms (allow exact equality: the engine uses one `now`; if it fails by a small amount, compare in whole days). Rating 1: `dueAt - at` = 0 (due at once). `state.reviews` = 1, `state.rating` = rating, `state.history` = [rating].

### C. REC-06 a not-due card gives 0 XP

**Tags:** @REQ-REC-06.

1. Rate card C 5 (due in 14 days).
2. Rate C again with 5.
   **Expected:** second `xpGained` = 0 (also with 3 and 1 on the repeat); no second `recall` entry for C in xpLog; `reviews` = 2, `history` = [5, 5], the new dueAt is recomputed from the new rating (14 days again).

### D. REC-06 XP at most once per card per local day (card rated 1 and again the same day)

**Tags:** @REQ-REC-06.

1. Rate card C with 1 (+3 XP, due at once).
2. Rate C again with 5.
   **Expected:** the second call gives 0 XP (`lastXpDate` already today); xpLog has one `recall` entry for C; total recall XP of C = 3. The "next day gives XP again" half is impossible via API (server clock); see Ideas.

### E. REC-06 negative: bad input and unknown card

**Tags:** @REQ-REC-06.
Using `api.raw` (status and body, not the typed method): rating 0, 6, 2.5, "3", missing rating -> 400; unknown cardId -> 404 (`notFound('card')`); no token -> 401. xpLog and totalXp unchanged after the failures. Verify the actual status codes against the live API before writing (zod errors might map to 400 or 422).

### F. REC-06 the state is in GET /me/progress

**Tags:** @REQ-REC-06.
After A, `progress.stats.totalXp` is the sum of the recall grants plus any daily-task bonus (assert `>=`, or read only the xpLog `recall` entries). Needs the `Progress.cards` extension (Prerequisites 4) only if the dueAt is asserted from there.

## Ideas

Beyond the requirements; the user decides.

- Guest REC-06 with `page.clock`: install the clock (`page.clock.install({time})`), rate card A with 5, `readGuest` -> `dueAt` = now + 14 days; fast-forward 14 days (`page.clock.fastForward`), reopen /recall: the hero shows A as due (`recall-hero` v >= 1) and rating gives +5 XP again (next local day). It also covers the "local day" rule that the server cannot be tested for. The guest engine is the same shared code, so it duplicates the API only partly.
- `recall-last` tag ("нова" -> "остання N") after the card appears again; `recall-bar` segment states ok/warn/bad for 4-5 / 3 / 1-2.
- Result view after the last card: `recall-done-count`, `recall-avg`, `recall-xp-gain`, `recall-low-row` (cards rated <= 3), `recall-redo`. That is REC-07 or later, not in this block.
- `recall-finish` stops the session and returns to the setup view; unsaved cards are not lost.
- Rating button `disabled` while saving (`recall-rate` disabled on a slow response with route delay); `recall-error` (`role=alert`) when POST /me/recall/rate fails for an account (route mock 500) and the card does not advance.
- Keys 1-5 with the front shown do nothing; Space on the front while the focus is in the comments tab input must not reveal.
- Phone viewport: `recall-reveal` and `recall-rates` are in a sticky bar (project phone).
- Rating 1 returns a card only once per session: rate A 1 again at 5 / 11 and check N stays 11 (infinite loop guard).
- Order of cards in a session (due first with the lowest rating, then new, then the rest) is stated in the `recall-pool` aria-label; the "Усі теми" session here started with a non-first topic, so the order needs a separate requirement.

## Test Scenarios
