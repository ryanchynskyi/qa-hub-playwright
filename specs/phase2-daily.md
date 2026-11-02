# Phase 2 — Daily tasks

## Corrections by the main session (win over the text below)

Checked against $APP_DIR packages/shared/src/engine/daily-tasks.ts. Prerequisites are done, except
the helper `tasksOf`: the API returns tasks in slot order, so it is not needed.

- A fresh account has no weak chapters and no due cards, so its set is a shuffle of ANSWER_N,
  ACCURACY, CODE_REVIEW and READ_ARTICLE, then ANSWER_N fillers. Consequences: 3 tasks always hold
  ANSWER_N or CODE_REVIEW; 4 or 5 tasks always hold all four. So no retries, no skip and no "fail
  if none" branch in scenarios 4, 5 and 8: `test.skip` here would hide a failure.
- Scenario 5 starts the set with whichever of ANSWER_N or CODE_REVIEW the guest has.
- Scenario 6 uses CODE_REVIEW (target 3): `setDailyCount(token, 5)` first, so it is always there.
- Scenarios 7 and 8 become API tests: the server rule is what they prove, and scenario 6 already
  shows the states in the UI (lesson api-first). The ACCURACY boundary is in the API tests: 10
  answered with 8 correct completes it, 10 with 7 does not, 9 of 9 does not (minAnswered 10,
  minRatio 0.8).
- Generator: UI scenarios 1 to 6 only. The API tests are written by the main session.

## Application Overview

Daily tasks block: PROG-02 (3 tasks, choice 3–5, when it takes effect; DAILY-001, DAILY-012, DAILY-013, API-P011) and PROG-03 (task types, pending → running → done, reward XP once; DAILY-004). Explored live as a guest, desktop, uk UI: /dash shows `today` "Сьогодні: 0 з 3", 3 rows (CODE_REVIEW pwfix 0/3 +35, ACCURACY 0/1 +40, ANSWER_N Networking 0/10 +30), `today-xp` +105, `today-continue` "Почати run". Choosing 4 in /profile on the untouched set gave "0 з 4": the first 3 tasks unchanged plus READ_ARTICLE 0/1 +20, `today-xp` +125. Account scenarios use the `user` and `authedPage` fixtures (own account per test, no shared data). Task content is never hard-coded: types, topics and chapters are read from the API at run time. Every scenario has ≤5 steps and one @REQ tag.

## Prerequisites (add before generating)

ApiClient (src/api/client.ts) and schemas (src/api/schemas.ts):

1. `Progress` schema lacks the daily part. Add `dailyTaskCount: number` and `daily: { date, tasks: { id, slot, type, params, target, progress, rewardXp, completedAt: number|null }[] } | null` (shape from apps/api/test/progress.test.ts and engine/daily-tasks.ts). Type is a zod enum of the 6 types.
2. `setDailyCount(token, count: number): Promise<DailyCount>` — PUT me/daily-count, returns `{ dailyTaskCount, daily }`, expects 200.
3. For negatives use `api.raw.put('me/daily-count', ...)` with `bearer(token)` (the typed method asserts 200): no new method.
4. `readArticle(token, articleId)` — POST me/articles/:id/read. Article ids come from the content API; add `articles` accessor only if the catalog lacks them (check kb/search or catalog; this is the one open lookup).
5. `finishQuiz` and `checkAnswer(..., token)` already exist (ANSWER_N, ACCURACY, CODE_REVIEW work through them).

Page objects / locators: 6. DashboardPage: `tasks` (`tasks`), `task` list (`task`), `todayState` (`today-state`), `todayXp`, `todayContinue`; helper `taskByType(type)` = `task` filtered by `[data-type=...]`; read `v`/`t` of `today` as numbers with the existing `numberValue` helper in src/helpers; `task-progress` v/t/`data-reward`. 7. ProfilePage (src/pages/profile-page.ts): `dailyCount` (`profile-daily-count`), `dailyOption(n)` (`profile-daily-option` key n), `dailyPending`, `dailyError`; method `setDailyCount(n)` that clicks and waits for `profile-daily-count` v = n. 8. Helper `tasksOf(progress)` that returns tasks sorted by slot, to compare prefix by `id`.

## Ambiguities (app vs requirement)

- DAILY-001 says tasks are `pending`; the visible row label is "TODO". The state is only in the `state` attribute of `task`: assert the attribute, never the text. Source: live /dash, test-ids.md "Today card".
- `today-xp` shows the sum of task rewards only (+105 for 3, +125 for 4); the +50 all-done bonus is not included. Source: live /dash. Do not assert the bonus there (DAILY-006 is phase 3).
- Opening a KB article URL as a guest (/kb/manual/mq-2, the READ_ARTICLE target) did not advance the task on the next /dash (still 0/1). Reading seems to need more than opening the page (scroll/dwell or an explicit action) — unverified. Complete READ_ARTICLE for accounts through the API; do not make a UI test of it until the trigger is known (see Ideas).
- The guest count is stored in localStorage, but the key name is not in test-ids.md; scenarios check it through the UI (reload) only.
- `profile-daily-pending` is documented "only while today's set has started and has another size". Choosing the old size again must hide it; no doc line says that, taken from the engine (`dailyCountPending`). Mark as inferred.
- API-P011 says "started set keeps its size"; the response of PUT still reports the new `dailyTaskCount` with the old `daily`. Not a conflict, but assert both.
- The dashboard `today` only exists when a set exists; a new visitor's short dashboard hides it until the tour (DASH-020): these scenarios use the default seed (returning visitor).

## Scenarios

### 1. New guest gets 3 pending tasks (@REQ-PROG-02, DAILY-001)

Seed: tests/seed.spec.ts. File: tests/e2e/daily.spec.ts.

1. Open /dash as a fresh guest.
   - Expect `today` v=0, t=3; `today-state` state=run.
2. Count the `task` elements.
   - Expect 3, all state=pending.
3. Read key and data-type of each.
   - Expect key `<local date YYYY-MM-DD>:<slot>` with 3 different slots; data-type in the 6 allowed types.
4. Inspect `task-start`.
   - Expect exactly one with data-state=primary: the first task's; `today-continue` visible.
     Failure: any t != 3, any state != pending.

### 2. Count chosen on an untouched guest set applies at once (@REQ-PROG-02, DAILY-012)

1. Open /profile; remember the 3 task keys first (read from /dash beforehand, then back).
2. Click `profile-daily-option` key=5.
   - Expect `profile-daily-count` v=5, option 5 aria-pressed=true, `profile-daily-pending` absent.
3. Open /dash.
   - Expect `today` t=5, 5 tasks all pending, first three keys equal the remembered ones.
4. Return to /profile, choose 3, open /dash.
   - Expect `today` t=3, the same three keys (lower bound reachable; smaller count keeps the prefix, DAILY-014).

### 3. Account: the choice is saved on the server and survives reload (@REQ-PROG-02, PROF-013)

1. `authedPage` (fresh account): open /profile, click option 4.
   - Expect `profile-daily-count` v=4, no `profile-daily-error`.
2. Reload /profile.
   - Expect option 4 still pressed.
3. Open /dash.
   - Expect `today` t=4.
4. ApiClient.progress(user.token).
   - Expect `dailyTaskCount` = 4 and `daily.tasks` length 4 (UI and server agree).

### 4. Account: a started set keeps its size, the hint shows (@REQ-PROG-02, DAILY-013 first half)

1. Create `user`, read `progress.daily` (3 tasks). Start the set through the API: pick the first task whose type the API can advance (ANSWER_N/CODE_REVIEW: one `checkAnswer` with token on a question of its topic/section; READ_ARTICLE: `readArticle`). If none of the 3 can be advanced, fail with a clear message (do not skip).
   - Expect a task with progress > 0 or completedAt != null in `progress`.
2. `authedPage`: open /profile, click option 5.
   - Expect `profile-daily-count` v=5 and `profile-daily-pending` visible.
3. Open /dash.
   - Expect `today` t=3 (old size kept), same task keys.
4. Back on /profile click option 3.
   - Expect `profile-daily-pending` gone (sizes equal).

### 5. Guest: a deferred count applies on the next local day (@REQ-PROG-02, DAILY-013 second half)

Guest + `page.clock` (install before load, pin time zone).

1. As a guest, start the set (answer one question of the ANSWER_N task's section in the quiz UI, correct index from `api.correctIndex`; if no ANSWER_N task is present, skip with a clear annotation) and open /profile.
2. Click option 5.
   - Expect `profile-daily-pending` visible; /dash `today` t=3.
3. Advance the clock past local midnight and reload /dash.
   - Expect `today` t=5, all 5 tasks with date = the new local date, previous keys gone.
     Risk: the guest clock path is the one the checklist marks `page.clock`; if flaky, move to Ideas and keep scenario 4.

### 6. Progress: pending → running → done, reward added once (@REQ-PROG-03, DAILY-004)

1. Create `user`; read the set; choose a task with target > 1 that the API can do (ANSWER_N or CODE_REVIEW; types are read from data, not assumed). `authedPage` opens /dash.
   - Expect that `task` state=pending, `task-progress` v=0, t=target, data-reward = reward from the API.
2. Do target-1 correct answers through the API (`checkAnswer` with token), reload /dash.
   - Expect state=running, v=target-1; `today` v=0; ApiClient xpLog has no `daily_task` entry yet.
3. Do the last answer, reload /dash.
   - Expect state=done, v=t, `task-start` absent for it, `today` v=1.
4. ApiClient.progress.
   - Expect exactly one xpLog entry with reason `daily_task`, refId = the task id, amount = data-reward.
     Failure: state skips running, XP missing or doubled.

### 7. Reward is paid once even if the work continues (@REQ-PROG-03, DAILY-004 boundary)

1. Same setup as 6 up to the done task (use the quickest task: lowest target).
2. Do 2 more matching answers through the API (correct ones; progress is capped at target).
   - Expect via API: `progress` = target, still one `daily_task` entry for that refId.
3. Reload /dash.
   - Expect `task-progress` v=t (not above target), state=done, `data-reward` unchanged; total XP changed only by answer XP, not by another reward.

### 8. ACCURACY and READ_ARTICLE types complete from one action (@REQ-PROG-03)

1. Create `user`, `setDailyCount(5)` so more types appear. Pick whichever of ACCURACY / READ_ARTICLE the set contains (annotate which; when neither appears, regenerate with a fresh `user`, up to 3 tries, then fail).
2. ACCURACY: answer ≥ the task's `params.minAnswered` questions of one section correctly through the API and call `finishQuiz` (ratio ≥ params.minRatio). READ_ARTICLE: `readArticle` for an article in params.chapterId.
   - Expect via API: that task completedAt != null, progress = target.
3. `authedPage` opens /dash.
   - Expect that `task` state=done and v=t; `today` v=1.
4. Boundary (ACCURACY only): second user, same count of answers but below minRatio, `finishQuiz`.
   - Expect task still not done (state pending or running per progress).

## API tests (tests/api/daily.spec.ts, @REQ-PROG-02 / @REQ-PROG-03)

Faster and enough for server rules; each needs a fresh `user`.

- API-1 (API-P005 half): `GET me/progress` on a new user returns `dailyTaskCount` = 3, `daily.tasks` length 3, each task progress 0, completedAt null, `date` = user's local date, ids `<date>:<slot>`.
- API-2: `PUT me/daily-count` accepts 3, 4, 5 (200, response `dailyTaskCount` = n and `daily.tasks` length n); `GET me/progress` agrees. Boundaries by data table.
- API-3 (negative, validation): 2, 6, 0, -1, 4.5, "4", null, missing body field → 400 each (error body, `dailyTaskCount` unchanged at 3).
- API-4 (negative, auth): no token → 401; garbage token → 401; the count stays unchanged.
- API-5: untouched set regenerates at once; larger set starts with the same tasks (compare `id`/`type`/`params`); going back to 3 returns the original 3 tasks.
- API-6: started set keeps its tasks and size: `PUT 5` after one task progressed returns `dailyTaskCount` 5 and `daily` equal to the started set; `GET me/progress` equal. The count that is stored is the new one (it is used from the next day; the next-day half belongs to the UI scenario 5 because the server clock cannot be moved from here).
- API-7 (PROG-03): a task advanced by a matching answer gets `progress` +1; an unrelated answer (other topic for ANSWER_N) leaves it; a skipped answer is not counted; at target `completedAt` is set and xpLog has one `daily_task` entry with refId = task id and amount = `rewardXp`.
- API-8 (PROG-03 once): after completion, further matching answers keep progress = target and xpLog has still one `daily_task` entry for that task. Repeated `finishQuiz`/`readArticle` calls the same.
- API-9 (PROG-03 per type): reward by type matches the table (ANSWER_N 30, ACCURACY 40, REVIEW_DUE 30, READ_ARTICLE 20, CODE_REVIEW 35, WEAK_SPOT 40) for every task type that appears in sets across several users; types missing from every set are not asserted.
- API-10: two different users get independent sets and progress (one user's completion does not change the other's).

## Ideas (beyond these requirements; the user decides)

- DAILY-002 (types + n/target + reward text per row), DAILY-003 (`task-start` destination per type), DAILY-005 (toast), DAILY-006 (+50 all-done once, `today-state`=pass), DAILY-007…011 (streak, deterministic set after reload, midnight reset, countdown): phase 3.
- DAILY-015: `today-continue` text "Почати run" → "Продовжити run" and its target; absent when all done.
- What exactly completes READ_ARTICLE in the UI (open vs scroll vs time): clarify, then add a UI test.
- Concurrency: two `PUT me/daily-count` at once on one account (route has a rate limit of 120/min).
- Guest vs account: the same chosen count after import into an account (IMP area).
- Time-zone effect on the set date for an account registered with a non-Kyiv `timeZone`.

## Test Scenarios

### 1. Daily tasks (UI)

**Seed:** `tests/seed.spec.ts`

#### 1.1. New guest gets 3 pending tasks

**File:** `tests/e2e/daily.spec.ts`

**Steps:**

1. Open /dash as a fresh guest; read `today`, `today-state`, all `task` attributes, `task-start` - expect: `today` v=0 t=3, today-state=run - expect: 3 tasks, all state=pending, keys <date>:<slot>, data-type in the 6 types - expect: Exactly one task-start has data-state=primary

#### 1.2. Count chosen on an untouched guest set applies at once

**File:** `tests/e2e/daily.spec.ts`

**Steps:**

1. Profile: choose 5, then open /dash, then choose 3 again - expect: `today` t=5 with first three keys unchanged; no `profile-daily-pending` - expect: Back at 3: same original keys

#### 1.3. Account: choice saved on the server and survives reload

**File:** `tests/e2e/daily.spec.ts`

**Steps:**

1. authedPage: profile option 4, reload, /dash, compare with API progress - expect: Option 4 pressed after reload, `today` t=4 - expect: API dailyTaskCount=4 and 4 tasks

#### 1.4. Account: started set keeps its size and shows the hint

**File:** `tests/e2e/daily.spec.ts`

**Steps:**

1. Start the set via API, choose 5 in profile, open /dash, choose 3 again - expect: `profile-daily-pending` visible after 5; `today` t=3 - expect: Hint gone after choosing 3

#### 1.5. Guest: deferred count applies on the next local day

**File:** `tests/e2e/daily.spec.ts`

**Steps:**

1. Guest starts the set, chooses 5, advance page.clock past local midnight, reload /dash - expect: Before: pending hint, t=3 - expect: After: t=5 with the new date in the keys

#### 1.6. Task goes pending → running → done, reward added once

**File:** `tests/e2e/daily.spec.ts`

**Steps:**

1. Account: advance one task by API answers (target-1, then last), reload /dash between - expect: pending v=0 → running v=target-1 → done v=t - expect: One `daily_task` xpLog entry, amount = data-reward

#### 1.7. Reward is not paid twice after completion

**File:** `tests/e2e/daily.spec.ts`

**Steps:**

1. Complete a task, then do 2 more matching answers, reload /dash - expect: Progress capped at target, state=done - expect: Still one `daily_task` entry

#### 1.8. ACCURACY and READ_ARTICLE complete from one action

**File:** `tests/e2e/daily.spec.ts`

**Steps:**

1. Account with count 5; finish the ACCURACY run or read the article via API; open /dash - expect: Task state=done v=t - expect: Below-ratio run does not complete ACCURACY

### 2. Daily tasks (API)

**Seed:** `tests/seed.spec.ts`

#### 2.1. New user defaults to 3 tasks

**File:** `tests/api/daily.spec.ts`

**Steps:**

1. GET me/progress for a new user - expect: dailyTaskCount=3, 3 tasks, progress 0, completedAt null

#### 2.2. PUT me/daily-count accepts 3, 4, 5

**File:** `tests/api/daily.spec.ts`

**Steps:**

1. PUT 3/4/5 then GET progress - expect: 200, daily.tasks length = n, progress agrees

#### 2.3. PUT me/daily-count rejects invalid values

**File:** `tests/api/daily.spec.ts`

**Steps:**

1. PUT 2, 6, 0, -1, 4.5, '4', null, no field - expect: 400 each; dailyTaskCount stays 3

#### 2.4. PUT me/daily-count requires a session

**File:** `tests/api/daily.spec.ts`

**Steps:**

1. PUT with no token and a bad token - expect: 401; count unchanged

#### 2.5. Untouched set regenerates, smaller set is a prefix

**File:** `tests/api/daily.spec.ts`

**Steps:**

1. PUT 5 then 3 - expect: First 3 tasks equal; back at 3 equals the original

#### 2.6. Started set keeps tasks and size

**File:** `tests/api/daily.spec.ts`

**Steps:**

1. Advance one task, PUT 5 - expect: Response daily equals the started set, dailyTaskCount=5

#### 2.7. Task progress, completion and single reward

**File:** `tests/api/daily.spec.ts`

**Steps:**

1. Matching, unrelated and skipped answers; complete; keep answering - expect: +1 only for matching; completedAt at target - expect: One daily_task xpLog entry = rewardXp

#### 2.8. Reward by task type

**File:** `tests/api/daily.spec.ts`

**Steps:**

1. Read rewardXp for every type seen across several users - expect: ANSWER_N 30, ACCURACY 40, REVIEW_DUE 30, READ_ARTICLE 20, CODE_REVIEW 35, WEAK_SPOT 40

#### 2.9. Users have independent sets

**File:** `tests/api/daily.spec.ts`

**Steps:**

1. Two users; complete a task for one - expect: The other's progress is unchanged
