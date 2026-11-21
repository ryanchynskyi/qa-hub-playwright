# Phase 2, plan block: interview and preparation plan (part 1, no server clock)

## Application Overview

## Overview

Requirements PLAN-01 … PLAN-06, PLAN-09, PLAN-13 of specs/COVERAGE.md. Signed-in only. Explored live at http://localhost:4273 (uk UI, desktop viewport) with two fresh accounts. Out of scope (part 2, needs PUT /__e2e/clock): PLAN-07, 08, 10, 11, 12. The server clock is never moved. All dates are computed in the test from the user's zone (register with timeZone Europe/Kyiv, as the app does): `tomorrow` = today+1 … `week` = today+7. Never hard-code a date, a topic id, a chapter id or a card id: take them from `ApiClient.catalog()`.

Seed: `tests/seed.spec.ts` (guest, `visitor: 'returning'`). Signed-in pages come from the `authedPage` fixture (account made through the API).

### Seed for PLAN-03 (answer to the brief)

The default seed is enough. The init script of the `returning` visitor sets `qa-hub-focus=skipped` on every load, so the first-visit gate (`focus-gate`) never shows, but a signed-in user without an interview can open the same wizard from `/dash` with `focus-setup-open`, pick a set (`focus-set`), `focus-next` and reach step 2 (`focus-setup` state `step-2` with `interview-onboard`). Verified live. `visitor: 'new'` (seed-new) was NOT tried with a signed-in user, so use it only if a scenario must prove the very first visit (gate instead of the dashboard); that is not a PLAN requirement.

### Observed facts worth knowing

- The plan endpoint is `GET /me/plan` (not "plan days"). Shape (observed): `{interview:{id,date,level,chapterIds,minutesPerDay,outcome,readiness,checklist[],createdAt,askedAt}, today, perDay, cardsPerDay, todayQuestions, todayOverride, days:[{date, topicIds[], size, state:'todo'|'done'|'missed', ahead, cards:{size,rated,state}}], distribution:[{chapterId,questions,score}], coverage:{planned,pool}, leftOut:[{chapterId,score}], missed, readiness:{value,delta,on}, finish, warmup}`. `days` runs today … the last day before interview day; the last element (the «Фініш», day before the interview) has `topicIds: []`, `size: 15`, `cards.size: 0`.
- Interview tomorrow means today IS the «Фініш» day: `/dash` has `data-state="finish"`, `GET /me/plan` has one day, `checklist` (state `eve`) is shown. So the checklist (PLAN-09) is reachable without the clock: create an interview for tomorrow.
- Interview in 3 days gives days today, +1, «Фініш» (+2). With 1 topic all days carry the same topicId; for weakest-first use ≥ 2 topics (observed: manual,sql,api,network,logs gave `[manual,sql]`, `[api,network,logs]`, `[]`).
- Minutes 15/30/60 gave `perDay` 15/30/60, `todayQuestions` 15/30/60, `cardsPerDay` 3/6/12 (= size/5), `days[].cards.size` 3/6/12. The «Фініш» day is size 15 for every setting.
- API contract of interviews (observed): `POST /me/interviews {date, level, chapterIds[], minutesPerDay, replace?}` → 201 `{interview}`; date today or +8 → 400 `{error:'interview_date'}`; `chapterIds: []` → 400 bad_request; `minutesPerDay: 20` → 400 bad_request; second active without `replace` → 409 with body `{active:{…}}` (error code not read; test-ids says `interview_exists`); with `replace: true` → 201. `GET /me/interviews` → `{active, past[]}`. `PATCH /me/interviews/:id` (date, level, minutesPerDay). Unknown id → 404 not_found.
- API contract of plan cards (observed, body-less POSTs must be sent WITHOUT content-type json): `POST /me/plan/days/:date/cards/start` → 200 `{cardIds[], cards[{id,topicId,chapterId,group,question,answer,core}], ratings[]}`; repeat call returns the same `cardIds`. `POST /me/plan/days/:date/cards/:cardId {rating}` rating 0..5 (rating 9 → 400 bad_request "Too big"), re-rating → 200 `{result:{stats:{totalXp,streak,longestStreak,lastActiveDate},daily,...}}`. `POST /me/plan/days/:date/finish` with the round not started → 409 `not_answered`. Unauthenticated `GET /me/plan` → 401.
- Catalog: `GET /content/catalog` → `{topics, sections, chapters, questions[{id,sectionId,chapterId,group,level,priority}], recallCards}`. All 1165 questions of this build carry priority 1/2/3 (309/569/287).
- Quiz frame for a plan day: `/plan/day?d=<date>` shows `plan-run` (key = date) containing `quiz-frame`; the card step is `/plan/day?d=<date>&step=cards` (`plan-run` `data-kind="cards"`, `recall-card`). Finishing shows `plan-result` (`plan-result-percent`, `-summary`, `-xp`, `-ready`, `-day` state `done`, `plan-again`, `plan-review`). «Ще раз» goes to `?d=…&run=1`, progress 1 / N; the day stays `done` in `/plan` and the `plan-step` test row is `done`.

### Differences between the app and the requirements (record every one)

1. PLAN-06: «404 on Фініш»: observed **409 plan_not_today** for `cards/start` on the «Фініш» date. 404 `not_found` ("Unknown plan day") comes only for a date outside the plan (a past date or beyond the last day).
2. PLAN-06: «409 plan_not_today for a past day»: a past date is **404 not_found** (not in the plan). So plan_not_today for a past day is not reachable without the clock; recorded in Ambiguities.
3. PLAN-04: «Як працює план» hidden after «Зрозуміло»: confirmed; stored in localStorage `qa-hub-plan-how-v1=1`, so it is per browser, not per account.
4. PLAN-04: `plan-tasks-opt` does not change anything visible in the day list of `/plan`: it only sets the daily count (same as `profile-daily-count`), `plan-tasks` `data-value` follows. A reload keeps it (observed 5 after reload).
5. PLAN-13: no unclassified question exists in the data, so "no priority field" is not observable (see Ambiguities).
6. PLAN-04: the dash day blocks (`dash-day`) list today … «Фініш» only; the interview day itself is not a block (`dash-days` v = 3 for a 3-day interview; `/plan` shows the interview as `plan-interview` tile on desktop).

### Prerequisites (missing in the framework; add before generating)

ApiClient (src/api/client.ts; paths relative, no leading slash; add zod schemas in the schema file, strict where a field must be absent):

- `createInterview(token, {date, level, chapterIds, minutesPerDay, replace?}) → {interview}` (POST me/interviews); a `raw` variant for negatives (400 interview_date, 400 bad_request, 409 with `active`).
- `interviews(token) → {active, past}` (GET me/interviews).
- `updateInterview(token, id, patch)` (PATCH me/interviews/:id; date, level, minutesPerDay).
- `plan(token) → Plan` (GET me/plan; shape above).
- `startPlanCards(token, date) → {cardIds, cards, ratings}` (POST me/plan/days/:date/cards/start; no body, no json content-type).
- `ratePlanCard(token, date, cardId, rating)` (POST me/plan/days/:date/cards/:cardId {rating}).
- `finishPlanDay(token, date)` (POST me/plan/days/:date/finish), raw for the 409.
- `startPlanDay(token, date)` (POST me/plan/days/:date/start) only if a test needs to start the test round by API (PLAN-06 last scenario).
- `setChecklist` is NOT needed: the UI saves it; read it back from `plan(token).interview.checklist` (observed `["vacancy","stories"]` after two ticks).
- helper `dateInZone(offsetDays, timeZone)` (pure function, not in ApiClient) for tomorrow … +8.
- helper to make a topic weak: answer questions of one topic wrongly through `checkAnswer(questionId, wrongIndex, token)` (use `correctIndex()` to pick a wrong option) so that weakest-first order is deterministic.
  Locators / page objects (names only, ids exist in test-ids.md): `InterviewPage` (interview-page, -date, -chip, -minutes, -level, -topic, -total, -save, -date-error, -replace*, -step, -next, -back), `ProfileInterviewBlock` (interview-upcoming*, -change-open, -change*, -topics-edit), `PlanPage` (plan-page, plan-minutes-opt, plan-tasks-opt, plan-day, plan-step, plan-days), `PlanRun` (plan-run + the existing quiz frame component, plan-result*), `DashPlan` (dash, dash-days, dash-day, dash-plan-how, dash-plan-how-ok, dash-add-date, ticker-item), `Checklist` (checklist, checklist-item, checklist-toggle, checklist-tips, checklist-sheet*, checklist-all). The existing quiz frame page object can answer a question; for a full round loop it as the existing quiz tests do.
  Fixtures: an `interview` factory fixture (creates the interview through `createInterview`, with the user's token, and returns it); the user fixture already deletes the account afterwards (interview goes with it).

### Ambiguities

- PLAN-06 «409 plan_not_today for a past day if reachable»: not reachable (404 not_found). Leave for part 2 (clock), do not add a scenario here.
- PLAN-06 «404 with no cards / on the warm-up»: the «Фініш» date gave 409, not 404. A day with no cards (`cards.size` 0) other than «Фініш» was not reached (every regular day had cards). The warm-up exists only on interview day (clock). The generator should assert the observed 409 plan_not_today for «Фініш» and ask the user whether 404 or 409 is intended.
- PLAN-06 «streak unchanged»: the response of the rating carries `stats.streak`; streak depends on earlier activity of the same account. Compare `stats` before and after (read `streak`/`longestStreak`/`lastActiveDate` from the first rating response and the second), and `days[].state` from `GET /me/plan`, not an absolute number. Use a fresh account without a quiz round on the same day.
- PLAN-13 «unclassified questions have no priority field»: all 1165 questions are classified in this build, so that branch cannot be proven. A test can only prove "every question carries priority in {1,2,3}" and that no question carries `priority: null`; the second half stays unproven until a fixture with an unclassified question exists. Ask the user.
- PLAN-01/02/03 phone layout (three steps `?step=`, reload on step 2/3 returns to step 1; bottom-sheet replace): the browser tool of this run has no viewport resize, so the phone layout was NOT explored. Scenarios P1-P3 are written from test-ids.md and must be verified by the generator on the phone project before they are kept.
- PLAN-09 phone «усі ›»: same limit; desktop shows all six rows at once, so «усі ›» (`checklist-all`) is not present or not needed on desktop; the scenario must run on the phone project.
- A guest on `/plan`, `/plan/day`, `/profile/interview` was not opened in the browser (the session was signed in); the redirect `next` values come from test-ids.md: `/login?next=%2Fplan`, `/login?next=%2Fprofile%2Finterview`.
- Wording: «Фініш» is "ФІНІШ" in the row of `/plan` (day title «Повтор помилок») and `dash-day` text; `plan-day` for it has no `data-today`.
- Level on the interview form is "preselected from the saved focus level, else middle"; a fresh API account has no focus, so middle.

### Ideas (outside the requirements; not scenarios here)

- `plan-minutes-opt` disabled while saving; `plan-settings-error` when PATCH fails (needs route mocking).
- `plan-dist-more` expands the hidden rows; the «Відкладаємо» list (`leftOut`) for 15 min on a big interview.
- `interview-section-search` filtering and `interview-search-note`.
- Enter on the desktop form triggers save.
- Interview with `en` UI language.
- Tour/ticker after a replace; `dash-weak-row` ordering.

## Corrections by the main session

These win over the rest of the plan.

- **Files.** One spec per area, flat, like the rest of the suite (no `tests/e2e/plan/` folder):
  `tests/e2e/interview.spec.ts` (1.1, 1.2, 1.4, 2.1, 2.2, 2.4, 2.5),
  `tests/e2e/plan-onboarding.spec.ts` (3.1–3.4), `tests/e2e/plan.spec.ts` (4.1–4.7),
  `tests/e2e/checklist.spec.ts` (7.1, 7.2). API scenarios (1.3, 2.3, 5.x, 6.x, 8.1) are written by
  the main session into `tests/api/interviews.spec.ts`, `tests/api/plan.spec.ts` and
  `tests/api/content.spec.ts`; the generator does not generate them.
- **Prerequisites exist** (do not re-add): `ApiClient.createInterview / interviews /
updateInterview / plan / startPlanDay / startPlanCards / ratePlanCard / finishPlanDay`;
  `localDate(days)` in `src/helpers/data.ts` (calendar date in Europe/Kyiv, the zone of test
  accounts and of the browser); fixtures `interview` (`InterviewPage`: the form, the profile
  «Наступна» block, the «Змінити дату» dialog and the onboarding date block), `plan` (`PlanPage`:
  `/plan`, `plan-run`, `plan-result*`), `checklist` (`Checklist`), and plan-mode locators on
  `dashboard` (`days`, `day(date)`, `planHow`, `planHowOk`, `addDate`, `addDateLink`,
  `tickerItems`). There is **no interview factory fixture**: arrange with
  `api.createInterview(user.token, {date: localDate(n), level, chapterIds, minutesPerDay})`,
  chapter ids from the `catalog` fixture (`catalog.chapters.filter(c => c.topicId === id)`). The
  quiz frame of a plan day is answered with the `quiz` fixture (`answerCorrectly`, `goNext`).
- **409 body** (2.3): `{error: "interview_exists", active: {…}}` (verified).
- **PLAN-06 404 vs 409 is not a difference** (verified in the code and live): «Фініш» on its own
  date (interview tomorrow) has no card step → `cards/start` 404 `not_found`; «Фініш» ahead (a later
  date) cannot be done yet → 409 `plan_not_today`. The plan probed only the second. A past date is
  outside `days` → 404; 409 for a past day needs missed days in the plan (part 2, clock).
- **Streak** (6.1): rating the first card of a fresh account moves `streak` 0 → 1 (recall activity
  counts). Compare stats between the first and the second rating, never with the state before.
- **PLAN-13** (8.1): the `Catalog` schema now types `priority` as 1 | 2 | 3 or absent, so every
  `api.catalog()` call already refuses null, 0 or 4. The «absent on unclassified» half stays
  unproven (no such question in the data); question to the user.
- **Phone** (1.5, 3.5, 7.3): not in the first generator run. 3.5 is dropped (the step-2 block is the
  same component as on desktop, 3.1 covers it). 1.5 and 7.3 come in a second run walked on the
  `phone` project; tablet/phone run only `@responsive` tests and a desktop-skipping test needs the
  user's OK (`specs/allowed-skips.txt`), so they are written for every layout: the desktop branch
  asserts the one-page form / all six rows, the phone branch the three steps / «усі ›».
- **Guest redirects** (1.4, 4.7) and everything marked «not explored» above: walk them first and
  assert what the app does; a difference from test-ids.md goes into the report, not around it.
- **Results of the runs** (main session, after test-reviewer): 4.7 `/plan/day?d=…` sends a guest to
  `/login?next=%2Fplan` (the day is dropped from `next`). 1.5 and 7.3 are `@responsive`; the
  layout branch lives in `InterviewPage.toTopics(device)` / `Checklist.showAll(device)`, tablet
  takes the desktop layout. Streak (6.1) and PLAN-13 «absent» are open questions in COVERAGE.md.

## Test Scenarios

### 1. PLAN-01 add an interview

**Seed:** `tests/seed.spec.ts`

#### 1.1. @REQ-PLAN-01 a valid interview opens the plan and shows on the profile

**File:** `tests/e2e/plan/interview-add.spec.ts`

**Steps:**

1. Sign in as a fresh user (authedPage). Open /profile/interview. Click the interview-chip with data-key=in3 (date = today+3), click interview-minutes data-key=60, click the interview-level data-key=senior, tick the checkbox of one topic taken from ApiClient.catalog() (interview-topic data-key=<topicId>). - expect: interview-until reads the days line and interview-days data-value is 3 - expect: interview-save is enabled and interview-total data-value equals the chapters of the topic (red if the save stays disabled after a valid pick)
2. Click interview-save. - expect: URL becomes /plan - expect: plan-days data-value is 3 and plan-minutes data-value is 60 (red if the saved minutes are not applied) - expect: plan-interview data-key is the picked date and data-value is senior (desktop)
3. Open /profile. - expect: interview-upcoming data-state is set and data-value is the picked date - expect: interview-upcoming-days data-value is 3 (red if days left is computed in another zone)
4. GET interviews through ApiClient.interviews(token). - expect: active.date, level senior, minutesPerDay 60 and chapterIds equal the picked ones; past is empty

#### 1.2. @REQ-PLAN-01 the boundary dates tomorrow and today+7 are accepted, today and today+8 refused in the form

**File:** `tests/e2e/plan/interview-date-range.spec.ts`

**Steps:**

1. Open /profile/interview and pick one topic. Fill interview-date with today (dateInZone(0)). - expect: interview-date-error is visible (alert; text «Дата співбесіди: від завтра до тижня вперед.» is not asserted, only visibility) - expect: interview-save is disabled (red if the min bound moved to today)
2. Fill interview-date with today+8. - expect: interview-date-error is visible and interview-save is disabled (red if the max bound grew to +8)
3. Fill interview-date with tomorrow, then with today+7. - expect: interview-date-error is absent each time - expect: interview-save is enabled each time, interview-days data-value is 1 then 7

#### 1.3. @REQ-PLAN-01 the server refuses an interview dated today or today+8 and an empty or invalid body (API)

**File:** `tests/api/interview-create.spec.ts`

**Steps:**

1. With a fresh user token and a chapterId from the catalog, POST /me/interviews with date today, then with date today+8 (raw client). - expect: both are 400 with error interview_date (red if the server stops validating the range and relies on the form)
2. POST with chapterIds [] and, separately, minutesPerDay 20. - expect: each is 400 bad_request - expect: GET /me/interviews still has active null (nothing was saved by a refused call)
3. POST with date tomorrow, then with date today+7. - expect: each is 201 and returns interview.date equal to the sent date (boundaries accepted; delete by replace between the two with replace:true)

#### 1.4. @REQ-PLAN-01 a guest opening the interview route is sent to the login with next

**File:** `tests/e2e/plan/interview-guest.spec.ts`

**Steps:**

1. As a guest (default page) open /profile/interview. - expect: URL is /login?next=%2Fprofile%2Finterview (red if the route is open for guests) - expect: interview-page is not present

#### 1.5. @REQ-PLAN-01 phone: the form is three steps and a reload on step 2 or 3 returns to step 1 (verify on phone project, not explored)

**File:** `tests/e2e/plan/interview-phone.spec.ts`

**Steps:**

1. On the phone project open /profile/interview. Fill the date with tomorrow and press interview-next. - expect: URL has ?step=2 and interview-step data-value is 2 (level step)
2. Press interview-next, then reload the page on ?step=3. - expect: after the reload the URL has ?step=1 (or none) and interview-step data-value is 1, the date field is empty (state is not kept)
3. Pick a topic, finish the three steps, press interview-save. - expect: app opens /plan; interview-back on step 2 goes to step 1, on step 1 it links to /profile

### 2. PLAN-02 one active interview

**Seed:** `tests/seed.spec.ts`

#### 2.1. @REQ-PLAN-02 a second interview asks before replacing and «лишити» keeps the old one

**File:** `tests/e2e/plan/interview-replace-keep.spec.ts`

**Steps:**

1. Arrange an active interview (A, date today+5) through ApiClient.createInterview. Open /profile/interview and notice interview-replaces. - expect: interview-replaces data-value is date A (desktop)
2. Pick date today+2 (B), a topic, press interview-save. - expect: interview-replace is visible; interview-replace-was data-value is A, interview-replace-next data-value is B
3. Click interview-replace-keep. - expect: the dialog closes, URL stays /profile/interview - expect: ApiClient.interviews(token).active.id and date are still A's (red if «лишити» saved B)

#### 2.2. @REQ-PLAN-02 «Замінити» saves the new interview and the old one is no longer active

**File:** `tests/e2e/plan/interview-replace-confirm.spec.ts`

**Steps:**

1. Same arrange: active A. Fill the form with B and press interview-save, then interview-replace-confirm. - expect: URL becomes /plan, plan-days data-value is days to B
2. Read ApiClient.interviews(token). - expect: active.date is B, active.id differs from A (red if the replace only edits the old row)

#### 2.3. @REQ-PLAN-02 the API refuses a second active interview without replace and accepts it with replace (API)

**File:** `tests/api/interview-replace.spec.ts`

**Steps:**

1. Create A, then POST a second interview without replace (raw). - expect: status 409 and the body has active equal to A (red if the server silently replaces; the UI dialog is not the check)
2. POST the same with replace:true. - expect: 201, interviews().active is the new one

#### 2.4. @REQ-PLAN-02 «Змінити дату» changes date and level and shows «було N» only when the date differs

**File:** `tests/e2e/plan/interview-change.spec.ts`

**Steps:**

1. Arrange A (today+3, middle). On /profile click interview-change-open. Fill the dialog's interview-date with A's own date. - expect: interview-days-was is absent (red if «було» shows for an unchanged date)
2. Fill the date with today+5, click interview-change-level data-key=senior. - expect: interview-days data-value is 5 and interview-days-was data-value is 3
3. Click interview-change-save, reload /profile. - expect: interview-upcoming data-value is today+5 and interview-upcoming-days data-value is 5 - expect: ApiClient.interviews(token).active.level is senior and chapterIds are unchanged

#### 2.5. @REQ-PLAN-02 the topics link opens the edit form prefilled and saves with PATCH

**File:** `tests/e2e/plan/interview-edit-topics.spec.ts`

**Steps:**

1. Arrange A with two chapters of one topic (ids from the catalog). On /profile click interview-change-open, then interview-topics-edit. - expect: URL is /profile/interview?edit=1; interview-form data-state is edit; interview-date data-value is A's date; interview-total data-value is 2
2. Untick one chapter (interview-section) and press interview-save. - expect: URL becomes /plan - expect: ApiClient.interviews(token).active has the same id as A and 1 chapterId (red if edit created a second interview or ignored the change)

### 3. PLAN-03 onboarding and the add-date tile

**Seed:** `tests/seed.spec.ts`

#### 3.1. @REQ-PLAN-03 «Готово» with a date saves the focus and an interview

**File:** `tests/e2e/plan/onboarding-with-date.spec.ts`

**Steps:**

1. Signed in user without interview. On /dash click focus-setup-open, choose a focus-set from the catalog, click focus-next. - expect: focus-setup data-state is step-2 and interview-onboard is visible
2. Click the interview-chip data-key=in3 and interview-minutes data-key=15; click focus-level data-key=senior. - expect: interview-onboard-sum data-value is the date today+3
3. Click focus-save. - expect: dash data-state becomes plan - expect: ApiClient.interviews(token).active has date today+3, minutesPerDay 15, level senior (red if «Готово» saves only the focus)

#### 3.2. @REQ-PLAN-03 «Готово» without a date saves only the focus

**File:** `tests/e2e/plan/onboarding-no-date.spec.ts`

**Steps:**

1. Same start; reach step 2 and press focus-save without picking a date. - expect: interview-onboard-sum is absent while no date is valid
2. Check the result. - expect: ApiClient.interviews(token).active is null (red if an empty date creates an interview) - expect: dash data-state is not plan; dash-add-date is visible

#### 3.3. @REQ-PLAN-03 with an active interview step 2 has no date block

**File:** `tests/e2e/plan/onboarding-has-interview.spec.ts`

**Steps:**

1. Arrange an active interview via the API; open /dash and click focus-setup-open, pick a set, focus-next. - expect: focus-setup data-state is step-2 - expect: interview-onboard is absent (red if the date block is offered again) - expect: focus-level and focus-save are present

#### 3.4. @REQ-PLAN-03 the add-date tile leads to the form and is gone after adding; never for a guest

**File:** `tests/e2e/plan/add-date-tile.spec.ts`

**Steps:**

1. Signed in without interview on /dash (full dashboard). Click dash-add-date-link. - expect: dash-add-date was visible; URL is /profile/interview
2. Add an interview through the form (valid date, one topic) and open /dash. - expect: dash-add-date is absent (red if the tile stays after adding) and dash data-state is plan
3. As a guest open /dash (separate context). - expect: dash-add-date is absent for the guest

#### 3.5. @REQ-PLAN-03 phone: the onboarding date block keeps working (verify on phone project, not explored)

**File:** `tests/e2e/plan/onboarding-phone.spec.ts`

**Steps:**

1. On the phone project run the step-2 route above with in3 and focus-save. - expect: an interview is saved (interviews().active.date is today+3)

### 4. PLAN-04 dashboard plan state and /plan

**Seed:** `tests/seed.spec.ts`

#### 4.1. @REQ-PLAN-04 the dashboard in plan state: days and ticker

**File:** `tests/e2e/plan/dash-plan-state.spec.ts`

**Steps:**

1. Arrange an interview for today+3 (middle, one topic). Open /dash. - expect: dash data-state is plan - expect: the first ticker-item has data-key interview and the second days - expect: dash-days data-value is 3 - expect: dash-day entries are todo, today's has aria-current=date, the last one is the «Фініш» date (plan-days/ApiClient.plan agree)

#### 4.2. @REQ-PLAN-04 /plan lists the days with today first and «ФІНІШ» last

**File:** `tests/e2e/plan/plan-days.spec.ts`

**Steps:**

1. Same arrange. Open /plan. - expect: plan-day items follow ApiClient.plan(token).days order (date keys equal) - expect: the first plan-day has data-today true; the last plan-day has no cards link and its text has the «ФІНІШ» label - expect: plan-interview data-key is the interview date, outside plan-day-list

#### 4.3. @REQ-PLAN-04 «Як працює план» is hidden for good after «Зрозуміло»

**File:** `tests/e2e/plan/dash-plan-how.spec.ts`

**Steps:**

1. Arrange the interview, open /dash. - expect: dash-plan-how is visible
2. Click dash-plan-how-ok, then reload /dash. - expect: dash-plan-how is absent before and after the reload (red if only React state hides it)

#### 4.4. @REQ-PLAN-04 minutes per day rebuild the days and survive a reload

**File:** `tests/e2e/plan/plan-minutes.spec.ts`

**Steps:**

1. Arrange a 3-day interview with minutesPerDay 60 and a big topic. Open /plan and click plan-minutes-opt data-key=15. - expect: plan-minutes data-value is 15 and plan-minutes-opt 15 has data-state on - expect: the today plan-day data-value is 15 (was 60; red if the days are not rebuilt)
2. Reload /plan and read ApiClient.plan(token). - expect: plan-minutes data-value is still 15; plan.perDay is 15; interviews().active.minutesPerDay is 15

#### 4.5. @REQ-PLAN-04 tasks per day persist across a reload

**File:** `tests/e2e/plan/plan-tasks.spec.ts`

**Steps:**

1. Arrange an interview. Open /plan and click plan-tasks-opt data-key=5. - expect: plan-tasks data-value is 5 and the 5 option has data-state on; plan-bonus is visible on desktop
2. Reload /plan. - expect: plan-tasks data-value is 5 (red if the setting is only in memory)

#### 4.6. @REQ-PLAN-04 a day opens its round in the quiz frame, the result closes it and «Ще раз» runs again

**File:** `tests/e2e/plan/plan-run-day.spec.ts`

**Steps:**

1. Arrange a 3-day interview with minutesPerDay 15 (round of 15). On /plan click the Тест row (plan-step data-key=test) of today. - expect: URL is /plan/day?d=<today>; plan-run data-key is the date; quiz-progress reads 1 / 15
2. Answer all questions through the quiz frame (correct answers via ApiClient.correctIndex for a deterministic score, quiz-next after each). - expect: plan-result is attached; plan-result-percent and plan-result-summary agree with the answers; plan-result-day data-state is done
3. Click plan-again. - expect: URL has run=1, plan-run is attached, quiz-progress is 1 / 15
4. Open /plan without finishing the second run. - expect: the today plan-day and plan-step test have data-state done (red if «Ще раз» reopened the day)

#### 4.7. @REQ-PLAN-04 a guest on /plan or /plan/day goes to the login

**File:** `tests/e2e/plan/plan-guest.spec.ts`

**Steps:**

1. As a guest open /plan, then /plan/day?d=<today>. - expect: each URL ends at /login?next=%2Fplan (as the brief states; the second may carry the day in next: record what is observed) - expect: plan-page is absent

### 5. PLAN-05 plan days (API)

**Seed:** `tests/seed.spec.ts`

#### 5.1. @REQ-PLAN-05 day size follows the interview minutes and «Фініш» is 15

**File:** `tests/api/plan-size.spec.ts`

**Steps:**

1. For each of 15, 30, 60: fresh user, createInterview with date today+3, one big topic's chapters, minutesPerDay m; GET me/plan. - expect: days[0].size equals m and plan.perDay equals m - expect: the last day has size 15 for every m (red if the Фініш size follows the minutes)
2. Read cardsPerDay and each day's cards.size. - expect: cardsPerDay equals m/5 (3, 6, 12); every regular day's cards.size is ≤ cardsPerDay; the Фініш day's cards.size is 0

#### 5.2. @REQ-PLAN-05 topicIds are topic ids weakest first and empty on «Фініш»

**File:** `tests/api/plan-topics.spec.ts`

**Steps:**

1. Arrange a 3-day interview over 3 topics from the catalog (chapters of each). Make topic T2 the weakest by answering several of its questions wrongly (ApiClient.checkAnswer with a wrong index and the token). GET me/plan. - expect: days[0].topicIds[0] is T2 (weakest first; red if the order is the catalog order) - expect: every id in topicIds is a topic id of the catalog; the last day's topicIds is []

### 6. PLAN-06 plan cards (API)

**Seed:** `tests/seed.spec.ts`

#### 6.1. @REQ-PLAN-06 the card step is picked once and re-rating is allowed

**File:** `tests/api/plan-cards.spec.ts`

**Steps:**

1. Arrange a 3-day interview. POST cards/start for today twice. - expect: both answers have the same cardIds and the same ratings (red if the cards are re-picked) - expect: cardIds.length equals plan.days[0].cards.size
2. POST cards/:cardId {rating:5} for the first card, then {rating:2}. - expect: both 200; GET me/plan days[0].cards.rated is 1 and cards/start now returns ratings[0] 2 (re-rating wins) - expect: days[].state values and stats.streak/longestStreak/lastActiveDate are the same before and after the ratings (see Ambiguities)

#### 6.2. @REQ-PLAN-06 rating works after the test round of the day too

**File:** `tests/api/plan-cards-after-test.spec.ts`

**Steps:**

1. Arrange, start the day (startPlanDay), answer all its questions through checkAnswer, finishPlanDay. - expect: plan.days[0].state is done
2. cards/start, rate a card, then rate it again with another value. - expect: both ratings 200 and the day stays done (red if a done day refuses cards)

#### 6.3. @REQ-PLAN-06 cards/start refuses an unknown day and the «Фініш» day

**File:** `tests/api/plan-cards-negative.spec.ts`

**Steps:**

1. 3-day interview; POST cards/start for the «Фініш» date (the last day), for yesterday and for today+30. - expect: «Фініш»: observed 409 plan_not_today (requirement says 404: see Differences); yesterday and today+30: 404 not_found - expect: a malformed date 'abc' is 400 bad_request; no token is 401
2. POST a rating with rating 9 on a real card. - expect: 400 bad_request (red if the range is not validated)

#### 6.4. @REQ-PLAN-06 a card step started alone cannot finish the day: 409 not_answered until the test is started

**File:** `tests/api/plan-finish-not-answered.spec.ts`

**Steps:**

1. Arrange; cards/start and rate all cards; POST finish for today without starting the test. - expect: 409 with error not_answered (red if a rated card step finishes the day) - expect: plan.days[0].state is still todo
2. startPlanDay, answer all questions through checkAnswer, POST finish. - expect: 200; plan.days[0].state is done

### 7. PLAN-09 checklist «Перед співбесідою»

**Seed:** `tests/seed.spec.ts`

#### 7.1. @REQ-PLAN-09 a tick saves at once and survives a reload

**File:** `tests/e2e/plan/checklist-tick.spec.ts`

**Steps:**

1. Arrange an interview for TOMORROW (today is then the «Фініш» day, no clock needed). Open /dash. - expect: dash data-state is finish; checklist data-state is eve and data-value is 0 with data-total 6 (desktop shows all six rows)
2. Click checklist-toggle data-key=vacancy. - expect: checklist-item vacancy data-state is done and checklist data-value is 1 at once (optimistic) - expect: ApiClient.plan(token).interview.checklist contains vacancy (the save reached the server)
3. Reload /dash. - expect: the vacancy row is still done and checklist data-value is 1; unticking it (toggle again) returns the server list to empty

#### 7.2. @REQ-PLAN-09 the «›» rows open the tips sheet and «Позначити зробленим» ticks the item

**File:** `tests/e2e/plan/checklist-tips.spec.ts`

**Steps:**

1. Same arrange. Click checklist-tips data-key=stories. - expect: checklist-sheet data-key is stories; checklist-sheet-tip data-value is a number > 0; only stories, questions and company have checklist-tips
2. Click checklist-sheet-done. - expect: the sheet closes; checklist-item stories data-state is done - expect: plan(token).interview.checklist contains stories after a reload (red if «Позначити зробленим» does not save)
3. Open the sheet of another row and click checklist-sheet-later («Закрити»). - expect: the sheet closes and that row stays todo

#### 7.3. @REQ-PLAN-09 phone: «усі ›» expands the list in place (verify on phone project, not explored)

**File:** `tests/e2e/plan/checklist-phone.spec.ts`

**Steps:**

1. On the phone project open /dash with the tomorrow interview. Count visible checklist-item rows, click checklist-all. - expect: more rows are visible than before (test-ids: first four before, all six after) and the URL did not change (red if «усі ›» navigates away)

### 8. PLAN-13 catalog priorities (API)

**Seed:** `tests/seed.spec.ts`

#### 8.1. @REQ-PLAN-13 classified questions carry priority 1 to 3

**File:** `tests/api/catalog-priority.spec.ts`

**Steps:**

1. GET content/catalog through ApiClient.catalog() (raw for the field presence). - expect: every question that has the field has priority in {1,2,3} (an integer, never null or 0 or 4) - expect: at least one question per priority value exists (observed 309/569/287) - expect: for an unclassified question the field must be absent: not provable here, see Ambiguities
