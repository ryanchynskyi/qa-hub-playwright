# Phase 2 — plan, part 2 (server clock): PLAN-07, 08, 10, 11, 12

## Application Overview

Scope: states of the interview plan that need the server clock (PUT /api/__e2e/clock): rest and missed day (PLAN-07), «Фініш» the day before (PLAN-08), the interview day and warm-up (PLAN-10), «Як пройшла?» and the history (PLAN-11), «Які питання тобі ставили?» (PLAN-12). Explored live on http://localhost:4273 (uk, path routes) with throwaway accounts; the clock was reset with {offsetMs:0} at the end of the run (last answer: a real-time `now`).

## Conventions for every scenario

- Instants: the clock is always set to 10:00Z = 12:00 Europe/Kyiv (winter, UTC+2). D0 is a fixed base date (for example 2026-12-01); «D0+N» is N local days later at the same time. Dates in assertions are computed from D0, never typed.
- Order of setup (a trap that cost this run a failed token): (1) PUT clock; (2) register / login a NEW session (an access token minted before the jump is expired after it: /me/plan returned an error until `auth/refresh`); (3) create data through the ApiClient; (4) only then open the page. When a scenario moves the clock again (D0 → D0+1), call login again (or refresh) before the next API call.
- UI scenarios: the browser clock is separate. Install page.clock.install({time: same instant}) BEFORE the first page.goto, with the same instant as the server. Observed without it (server at 26.11, browser at 21.11): ticker «Співбесіда 28.11 · 7 днів» while the plan card said «3 дні»; on a rest day `plan-rest`, `plan-ahead-row` and `plan-task-result` were absent and the ticker streak was «0 дн.» instead of «1 дн.»; with the browser aligned they appeared. This is a coupling to document: the dashboard computes today itself (useNow), the plan notice `plan-missed` and the day blocks come from the server's `today`.
- afterEach in every scenario (and API scenario): PUT /__e2e/clock {offsetMs:0}. The offset is global for the server: see Prerequisites «clock project».
- Accounts: `api.register(uniqueEmail(..))` (timeZone Europe/Kyiv is the ApiClient default); interview data: chapterIds = all chapters of one topic taken from the catalog (two topics where a scenario checks a move between days, see 1.3) (the app e2e used 'playwright': 12 chapters, 143 questions in the pool); no hard-coded question ids; right/wrong answers through api.correctIndex / a wrong index helper (src tests already have wrongIndex).

## Prerequisites (missing in the repo today)

ApiClient (src/api/client.ts) + schemas (src/api/schemas.ts), all typed with zod:

1. `setClock(body: {offsetMs:number}|{at:string}): Promise<{now:number}>` — PUT __e2e/clock, no auth, 200 `{now}` (observed: `{at:'2026-11-25T10:00:00Z'}` → now 1795600800000; `{offsetMs:0}` back to real time). `resetClock()` = `setClock({offsetMs:0})`. Fixture `serverClock` with `set(iso)` and an automatic teardown that resets, plus `signInAfterClock` rule (login after set).
2. Plan schema must carry: `today`, `todayOverride`, `todayQuestions`, `cardsPerDay`, `days[].state` (`todo|done|missed`), `days[].ahead`, `days[].cards {size,rated,state}`, `missed {date, topicIds}|null`, `finish {cards, questions, chapterIds}|null`, `warmup {size, cards, questions, from: finish|recent, state}|null`, `readiness`.
3. `chooseTodayMinutes(token, 60)` for «Сьогодні 1 год» — the HTTP call behind `plan-missed-hour` was not captured; read it from the network log on the first run (PATCH /me/interviews/:id { minutesPerDay } is the /plan page route and also rebuilds days from today; the notice may use another one). Needed only for API-level setup; the UI scenario clicks the button.
4. `setInterviewOutcome(token, id, outcome)` — PUT /me/interviews/:id/outcome {outcome: offer|waiting|failed} (200, returns the interview). `moveInterview(token, id, {date, replace?})` — POST /me/interviews/:id/move (409 `interview_exists` without replace, per test-ids). `askedQuestions(token, id)` — GET /me/interviews/:id/questions → {picked, texts, suggested}; `saveAskedQuestions(token, id, {questionIds, texts})` — PUT same path (400 `asked_texts_limit`, 400 unknown id). `quizSearch(token, q)` — GET /quiz/search?q= (≥2 chars, max 20). `adminAsked(adminToken)` / `setAskedStatus(adminToken, id, 'open'|'done')` — GET/PATCH /admin/asked (item: id, createdAt, text, level, chapters, interviewDate, status; never a user id/name/email). `interviews()` returns `{active, past[]}` — `past[].outcome`, `askedAt`, `readiness` must be in the schema. `sectionQuestions(sectionId)` must expose the optional `asked: number|null` per question (null below 3 users).
5. Page objects/components (none exist): `src/components/finish.ts` (dash, card, start, parts, paused, note, run, phase, result, score, verdict, confused/items/theory, go, warmupCard/start/score; `playCards(ratings[])`, `playQuestions(answers[])`), `src/components/ask-card.ts` (card, title, options, readiness, move, save, later, close, error, replace dialog), `src/components/asked-card.ts` (card, options, search, results, text, save, thanks, section, later, sheet), `src/pages/interviews-page.ts` (/profile/interviews: rows, sheet `interview-result*`, `interviews-questions`, tiles), plus extend dashboard-page.ts: `plan-rest`, `plan-missed*`, `dash-day`, `plan-next`, `plan-ahead-row`. For a guest context with the tag: a fresh browser context (the quiz questions response has `Cache-Control: public, max-age=300`, see Ambiguities).
6. Clock project: tests that move the server clock must run in their own Playwright project with `workers: 1`, `fullyParallel: false`, and not at the same time as other projects (the offset is server-global: access tokens and `plan.today` of parallel tests change under them). Needs a decision on config (dependencies: run after the rest, or a separate CI job).
7. Admin context for the inbox: the existing `adminToken` / `adminPage` fixtures (googleLogin as ADMIN_EMAIL, never in prod).

## Ambiguities and differences from the requirement (all observed live)

A1. `plan-rest` (yellow «День уже виконано») appears only when the browser clock equals the server's (see conventions); on the server alone the rest day is visible only as `dash-day` state `done` with `aria-current="date"` and `plan-next` state `rest` («Сьогодні можна відпочити»).
A2. «Серія»: the stored stats stay `streak 1, lastActiveDate = the day the ahead round was done` (verified on D0+1 and D0+2 with nothing done on the rest day). The streak is not recomputed to 0 on day D0+2; it is not proven that /me/progress would return 0 for a plain missed day with the same gap — no negative scenario for a day that was really missed was observed. Ask the owner whether a missed (not-done-ahead) day breaks the streak on the server, then add the contrast case.
A3. After «Сьогодні 1 год» the API still returns `missed {date, topicIds}` (the notice is hidden by the UI), `todayOverride: true`, today's `size 60`, `cards.size 12`, `todayQuestions 60`; the missed day stays `missed` in `days`. The day sizes of the re-packed plan: today 60 means the missed day's work was NOT added to later days in the observed 4-day plan (days after today stayed 15). «Re-packed» is therefore observed only for the default notice text: «Час на день той самий, тож план стиснули: ... доробимо сьогодні».
A4. «Лишити 30 хв» / `plan-missed-close`: not clicked in this run (state hidden per date in storage per test-ids). The scenario below states the expected result from test-ids.md; the generator confirms it.
A5. `plan.finish` is built from the cards rated badly on the interview chapters, up to 8 (observed: 10 cards rated 1 → cards 8, questions 7; 0 rated → cards 0, questions 15), the rest are questions → always 15 items in total in these runs. With 0 card mistakes there is no `mistakes` ticker item (test-ids) — not re-verified.
A6. `plan.warmup` after a finished «Фініш»: `from: finish`, `size 5`, `cards 5`, `questions 0` although the result said «повторимо до 5 з них» (11 confused). The `recent` source (no «Фініш» done) was not reached; setup for it: skip «Фініш», clock to the interview date. Expected values not observed.
A7. Card endpoint on a finished «Фініш» day: `POST .../cards/start` → 404 `not_found` «Unknown card step» (as required). But `POST .../cards/:cardId` on the finish day after it was finished → 409 `already_finished`, not 404. Whether it is 404 before finishing was not probed.
A8. Admin inbox filter: test-ids.md says in one place filter key `asked` (step 6 table) and in the inbox table the keys are listed as `all|bug|feedback|comment`. The UI inbox was not opened in this run (needs the admin Google login); the API-level check is planned, the UI filter scenario is marked «to confirm».
A9. Quiz tag: not visible in a browser that loaded the section's questions in the last 5 minutes (observed: the app's own request returned a cached answer without `asked`, a forced reload returned `rihi38: 3`). In a new browser context it appears: «РЕАЛЬНО ПИТАЛИ · 3 РАЗИ» (`quiz-asked-tag` data-value 3, text with plural «РАЗИ») and `quiz-asked-note` «3 користувачі чули це питання на співбесідах.» The note is present while the question is shown, before and after answering. The round order is random (101 questions for «Усі питання»): the test finds the tagged question by its text taken from the API (the question with `asked`), by stepping with the option + `quiz-next` loop — a loop by design (one deterministic target), not a retry.
A10. The «Як пройшла?» card is shown for the newest past interview WITHOUT a result even when an active interview exists (observed with active interview 3 days ahead); only the ticker item `ask` disappears (ticker had interview/days/streak). Matches test-ids.
A11. After saving the result the card on the dashboard is `asked-card` (list), the `ask-card` is removed; a day-1 card says «Далі: питання →» on `ask-save` until the result is picked (button disabled until an answer), a `late` card says «Зберегти».
A12. «Перенесли» keeps the same interview id, outcome null, history unchanged (tiles «минуло» did not grow). The move range is tomorrow … +7 days (chips tomorrow / in3 / week); a past plan was not rebuilt in the observed run for the history.

## Ideas (outside the requirements, not planned)

- phone layout (tab bar, whole-screen search and thanks of `asked-card`, `asked-more`, `asked-home`) — @responsive.
- `/en/` texts of the same cards; 5 own questions stored hides `asked-text`; ASKED_MARKS_MAX / ASKED_TEXT_MAX (300) boundaries.
- Ticker items on the finish / interview-day dashboards (`mistakes`, `luck`).
- Streak contrast: a really missed day breaks the streak (needs the owner's answer, A2).
- Plan re-pack with 15/30 min after «Лишити» across several missed days.
- Timezone other than Europe/Kyiv (the app stores timeZone; `tz_cooldown`).

## Corrections by the main session

These win over the rest of the plan.

- Files: every test of this plan lives in `tests/clock/` (project `clock`: desktop, one worker,
  after all other projects). Run one file with `--no-deps`. Suite 2 →
  `tests/clock/plan-days.spec.ts` (API only: `api` fixture, no page); suite 1 →
  `plan-rest-missed.spec.ts`; suite 3 → `finish.spec.ts`; suite 4 → `interview-day.spec.ts`;
  suite 5 → `interview-outcome.spec.ts`; suite 6 → `asked.spec.ts`.
- Prerequisites 1, 2, 4, 5, 6, 7 are done; use them, do not re-create them:
  - fixture `serverClock(at)` (moves the API clock, resets it after the test); `api.login(user)`
    for a fresh token after each jump; fixture `signIn(user)` signs the page in (after the jump,
    before `page.goto`); `page.clock.install({ time: at })` before the first `goto` of a UI test.
  - ApiClient: `setPlanToday(token, 60 | null)` (the call behind «Сьогодні 1 год»: PUT
    `/me/plan/today`, prerequisite 3), `setInterviewOutcome`, `moveInterview`, `askedQuestions`,
    `saveAskedQuestions`, `askedSearch`, `adminAsked`; `Plan` has `todayOverride`, `missed`,
    `finish`, `warmup`; `Interview` has `readiness`, `askedAt`; `Question.asked`.
  - Page objects: `DashboardPage` (`planNext`, `planRest`, `planAheadRow`, `planMissed*`),
    `Finish` (finish + warm-up), `AskCard`, `AskedCard`, `InterviewsPage`, `QuizPage.askedTag` /
    `askedNote`; fixtures `finish`, `askCard`, `askedCard`, `interviews`.
- The `user` fixture registers before the clock moves: its `token` is stale after `serverClock`.
  Take `(await api.login(user)).accessToken` after every jump.
- Instants: build them from one base date in the spec (a constant far from DST changes and
  midnight, e.g. `2026-12-01T10:00:00Z`), never from the real today.
- Answers of the app owner (2026-11-21), they replace A2, A3, A6, A7, A8, A10:
  - A2: the server never writes 0 (`stats.streak` is stale by design); the lapse is computed in
    the client. Assert the streak in the UI. Last activity D0: 1 on D0+1, 0 from D0+2; with D0+1
    a rest day: 1 through D0+2, 0 from D0+3.
  - A3: «Сьогодні 1 год» = PUT /me/plan/today {minutes: 60}; only today's size changes, later
    days keep perDay, `missed` stays (the notice hides through todayOverride). «Re-packed» means
    the GET re-pack after a miss, not the button.
  - A6: the warm-up holds at most 5 (cards + questions). After «Фініш»: up to 5 cards, questions
    fill the rest. No «Фініш» (`from: recent`): the latest mistakes (cards and wrong questions,
    by recency), up to 5. No mistakes at all: `warmup` null and start → 404.
  - A7: rating on a «Фініш» day: no started round → 409 `not_answered`; card outside the round →
    404 `card`; after finish → 409 `already_finished`. Only `cards/start` is 404 (`card step`).
  - A8: `asked` is an inbox filter key (test-ids.md is stale there); 6.7 is a normal scenario.
  - A10: intended — the card shows for the newest past interview even with an active one; only
    the ticker item goes. It is hidden on the «Фініш» and interview-day dashboards.
- A4 (`plan-missed-close` / «Лишити»): generate what the plan states with a one-line comment.
- 1.1: D0 is done too (not `missed`): a missed D0 raises `plan-missed`, which contradicts the
  step's own «plan-missed absent»; the rest day alone is under test. Step 3 (browser clock not
  aligned) is dropped: the owner's A2 answer makes the client-side «today» a known design, not a
  defect to pin.
- 1.2: the streak is read from the top-bar pill (`Shell.streak`, `data-value`), not ticker text.
- 1.4: the interview is on D0+5, so D0+2 and D0+3 are regular days whose size must stay perDay.

## Test Scenarios

### 1. PLAN-07 rest day and missed day (UI + server clock)

**Seed:** `tests/seed.spec.ts`

#### 1.1. @REQ-PLAN-07 a day done ahead is a rest day on its date

**File:** `tests/e2e/plan-clock-rest.spec.ts`

**Steps:**

1. Set the server clock to D0 12:00 Kyiv, register a user, create an interview on D0+4 (15 min, one topic's chapters). Through the API start the day D0+1 (POST /me/plan/days/D0+1/start), answer every returned question correctly and finish it (ahead). Then set the server clock to D0+1 12:00, log in again, install page.clock at the same instant and open /dash. - expect: `dash` data-state is `plan`; `plan-rest` is visible with «День уже виконано» (turns red if the rest state is not shown for a day done ahead)
2. Read the day blocks. - expect: `dash-day` D0+1 has state `done` and `aria-current=date`; `dash-day` D0 state `missed` (nothing was done on D0); D0+2 `todo`; the last block is the Фініш on D0+3 (turns red if the done day is shown as todo) - expect: `plan-next` data-state is `rest`, its text offers «Сьогодні можна відпочити» and names the next day - expect: `plan-task-result` is visible: «✓ Тест … 15 / 15» - expect: `plan-ahead-row` with data-key D0+2 offers to take the next day ahead - expect: `plan-missed` is absent
3. Compare with the browser clock NOT aligned (negative control, one extra navigation in a context without page.clock). - expect: `plan-rest` is absent and the ticker streak shows 0 — documents the useNow coupling (A1); this step may be dropped if the owner says it is a known limitation

#### 1.2. @REQ-PLAN-07 the streak survives a rest day

**File:** `tests/api/plan-clock.spec.ts`

**Steps:**

1. Clock D0, register, interview D0+4, finish day D0+1 ahead through the API (as above). Read /me/progress. - expect: stats.streak is 1 and lastActiveDate is D0 (the ahead round counts for today; this is the already-covered 0→1, re-read only as the baseline)
2. Set the clock to D0+1, log in, read /me/progress and /me/plan. Then clock D0+2, log in, read both again; do not answer anything on D0+1 or D0+2. - expect: on D0+1: stats.streak is still 1; plan.days[D0+1].state is `done`, plan.missed is null - expect: on D0+2: stats.streak is still 1 (the rest day did not break it; turns red if a done-ahead day is counted as a gap), plan.days[D0+1].state still `done`, plan.missed is null (the rest day is not a missed day)

#### 1.3. @REQ-PLAN-07 a missed day shows the «Учора без плану» notice and re-packs the plan

**File:** `tests/e2e/plan-clock-missed.spec.ts`

**Steps:**

1. Clock D0, register, interview on D0+3 (30 min) over the chapters of two topics, so D0 and D0+1 get one topic each (one topic gives every day the same topics and the re-pack check holds without a re-pack). Clock D0+1 12:00, log in, page.clock the same instant, open /dash. - expect: `plan-missed` is visible with data-key D0 and the text «Учора без плану … Нічого страшного. Час на день той самий, тож план стиснули» (turns red if the notice is not shown for an untouched day) - expect: `plan-missed-hour` («Сьогодні 1 год») and `plan-missed-keep` («Лишити 30 хв») are visible; `plan-missed-close` (X) is visible
2. Read the day blocks and the API plan. - expect: `dash-day` D0 state `missed`, D0+1 `todo` with `aria-current=date` and 30 questions, the Фініш block on D0+2 - expect: API: plan.today = D0+1; plan.missed.date = D0; plan.days[D0].state = `missed` (the missed day STAYS in plan.days); plan.todayOverride false, plan.todayQuestions 30 - expect: API: plan.missed.topicIds = D0's topics; on D0 the day D0+1 held none of them, now it holds them all (turns red if the plan is not re-packed)

#### 1.4. @REQ-PLAN-07 «Сьогодні 1 год» makes today's round 60 questions

**File:** `tests/e2e/plan-clock-missed.spec.ts`

**Steps:**

1. Same setup as the missed-day scenario; click `plan-missed-hour`. - expect: `plan-missed` disappears; `plan-missed-error` never shows (turns red if the button fails or leaves the notice up) - expect: today's `dash-day` text shows «60 питань»
2. Read the plan through the API and start today's round. - expect: plan.todayOverride true, plan.todayQuestions 60, plan.days[today].size 60 and cards.size 12 (double of 6) - expect: POST /me/plan/days/today/start returns 60 questionIds - expect: the missed day is still `missed` in plan.days; the later days keep their size (A3) - expect: the interview's saved minutesPerDay stays 30 (read GET /me/interviews: not observed, confirm and record the actual value)

#### 1.5. @REQ-PLAN-07 «Лишити» only hides the notice

**File:** `tests/e2e/plan-clock-missed.spec.ts`

**Steps:**

1. Same setup as the missed-day scenario; click `plan-missed-keep`. - expect: `plan-missed` disappears at once
2. Reload the dashboard (same server and browser clock). - expect: `plan-missed` stays hidden (hidden per date in browser storage); to confirm the storage key, read localStorage after the click (turns red if the notice returns on reload)
3. Read the API plan. - expect: plan.todayOverride false, plan.todayQuestions 30, today's day size 30 (nothing was re-sized; turns red if «Лишити» also sends a minutes change) - expect: plan.days[D0].state is still `missed`

### 2. PLAN-07 / PLAN-08 API tests (server clock)

**Seed:** `tests/seed.spec.ts`

#### 2.1. @REQ-PLAN-07 a past plan date is 409 plan_not_today and stays in plan.days

**File:** `tests/api/plan-clock.spec.ts`

**Steps:**

1. Clock D0, register, interview D0+3. Clock D0+1, log in. POST start, cards/start and finish for D0 (a past plan date, state `missed`), using `raw` to read the status. - expect: each answers 409 with body error `plan_not_today` (message «This plan day can't be done now»); observed for all three verbs - expect: GET /me/plan: the date D0 is still present in days with state `missed` - expect: a date outside the plan (D0+10) is 404 `not_found` («Unknown plan day») — already covered by part 1, listed only to keep the two codes apart

#### 2.2. @REQ-PLAN-08 «Фініш» and warm-up on any date other than their own are 409

**File:** `tests/api/plan-clock.spec.ts`

**Steps:**

1. Clock D0, register, interview D0+2 (so D0 is a regular day, D0+1 is «Фініш»). Clock D0+1, log in. POST start and finish for the interview date D0+2 (the warm-up date, ahead) and for D0 (past). - expect: both dates answer 409 `plan_not_today` for start and for finish (turns red if a warm-up can be started or finished ahead)
2. Clock D0+2 (interview day), log in. POST start and finish for D0+1 (the finish date, now past). - expect: 409 `plan_not_today` for both; plan.warmup is non-null and plan.finish is null on the interview day

#### 2.3. @REQ-PLAN-08 card-step endpoints on a finish or warm-up day are 404

**File:** `tests/api/plan-clock.spec.ts`

**Steps:**

1. Clock D0, interview D0+2; clock D0+1 (finish day), log in. POST /me/plan/days/D0+1/cards/start. - expect: 404 `not_found` «Unknown card step» (turns red if a finish day gets a card step)
2. Clock D0+2 (interview day), log in. POST /me/plan/days/D0+2/cards/start. - expect: 404 `not_found` «Unknown card step»
3. After the finish round is done (see the PLAN-08 round scenario), POST /me/plan/days/D0+1/cards/<any card id> with {rating:3}. - expect: observed 409 `already_finished` rather than 404 (A7): record both codes; confirm the code BEFORE the round is finished

#### 2.4. @REQ-PLAN-08 the Фініш content: up to 8 mistake cards, then questions, 15 in all

**File:** `tests/api/plan-clock.spec.ts`

**Steps:**

1. Clock D0, register, interview D0+2 on the chapters of one topic. Rate 0, 3 and 10 recall cards of those chapters with rating 1 (api.rateCard) — one account per case — then clock D0+1, log in, read plan.finish. - expect: 0 mistake cards: finish.cards 0, finish.questions 15 - expect: 3 mistake cards: finish.cards 3, finish.questions 12 - expect: 10 mistake cards: finish.cards 8, finish.questions 7 (the cap is 8; turns red if the cap moves); cards + questions is 15 in every case - expect: finish.chapterIds is non-empty and is a subset of the interview's chapters

### 3. PLAN-08 «Фініш» the day before the interview (UI + server clock)

**Seed:** `tests/seed.spec.ts`

#### 3.1. @REQ-PLAN-08 the day before the interview the dashboard is in the `finish` state without daily tasks

**File:** `tests/e2e/plan-clock-finish.spec.ts`

**Steps:**

1. Clock D0, register, interview D0+2, rate 10 cards of its chapters with rating 1. Clock D0+1 12:00, log in, page.clock the same instant, open /dash. - expect: `dash` data-state is `finish` (turns red if the day before is shown as a normal plan day) - expect: `finish-card` data-state `todo`, `finish-parts` data-cards 8 and data-questions 7; text «Фініш · 15 хв … 8 карток з помилками + 7 питань»; `finish-paused` («на паузі») and `finish-note` («Напередодні … нових тем не даємо») are visible
2. Look for the usual plan elements. - expect: no `dash-day` blocks, no `plan-missed`, no daily-task list (count of `dash-task` is 0) - expect: `checklist` data-state `eve`, data-value 0, six items as on the app: «Перечитати вакансію», «Розповідь про себе за 2 хв», … - expect: ticker item keys are `interview`, `when`, `finish`, `mistakes` (test-ids)

#### 3.2. @REQ-PLAN-08 the round runs cards first, then questions

**File:** `tests/e2e/plan-clock-finish.spec.ts`

**Steps:**

1. Setup as above; click `finish-start`. - expect: URL is /plan/day?d=D0+1; `plan-run` data-kind `finish`, data-key D0+1 - expect: `finish-phase` state `cards`, value 1, total 8; `quiz-progress` value 1, total 15 (cards and questions are counted together)
2. Reveal and rate the 8 cards (two with 5, six with 3). - expect: after the 8th card `finish-phase` state is `questions`, value 1, total 7 and `quiz-progress` shows 9 / 15 (turns red if questions come before cards or the counter restarts)
3. Answer the 7 questions (take the right choice from api.correctIndex for 2, wrong for 5). - expect: the round ends on the result page: `finish-result` data-kind `finish` is visible

#### 3.3. @REQ-PLAN-08 the result shows right/total, what is still unclear and leads to the checklist

**File:** `tests/e2e/plan-clock-finish.spec.ts`

**Steps:**

1. Finish the round as above (2 cards rated 5, 6 cards rated 3, 2 questions right, 5 wrong). - expect: `finish-score` data-value 4, data-total 15 (right = cards rated 5 + correct questions; turns red if right is counted differently) - expect: `finish-verdict` state `mixed` with a text that names the number of unclear items and «повторимо до 5 з них завтра»; an all-right run gives state `ok` (extra setup if wanted, warm-up scenario covers `ok`)
2. Read the list under the score. - expect: `finish-confused` data-value 11 (6 cards + 5 questions); `finish-confused-item` rows show the cards first (state `card`) then the questions (state `question`) - expect: every row has a `finish-theory` link whose data-key is a chapter id
3. Click `checklist-go` («До чекліста · 0 з 6»). - expect: data-value 0, data-total 6 before the click; the URL becomes /dash and `dash` is in state `finish` with `checklist` data-state `eve`

#### 3.4. @REQ-PLAN-08 the done card stays «пройдено» and the round can be repeated

**File:** `tests/e2e/plan-clock-finish.spec.ts`

**Steps:**

1. After the result, press `checklist-go`. - expect: `finish-card` data-state `done`; text «Фініш · пройдено 4/15»; `finish-score` data-value 4, data-total 15; the action reads «Ще раз →» (turns red if the card goes back to todo or the score is lost)
2. Reload the page (re-install page.clock, same server instant). - expect: the card is still `done` with the same score (the state is server-side, not local)

### 4. PLAN-10 the interview day (UI + server clock)

**Seed:** `tests/seed.spec.ts`

#### 4.1. @REQ-PLAN-10 the interview day shows the `day` dashboard with the warm-up from what was unclear

**File:** `tests/e2e/plan-clock-day.spec.ts`

**Steps:**

1. Clock D0, register, interview D0+2, 10 cards rated 1. Clock D0+1, log in, play the Фініш through the API/UI so that it is finished. Clock D0+2 12:00, log in, page.clock the same instant, open /dash. - expect: `dash` data-state is `day`; `dash-day-date` text contains the interview date DD.MM and «сьогодні»; text «Удачі на співбесіді» - expect: `warmup-card` data-state `todo`, data-from `finish`, data-cards 5, data-questions 0 (observed: «Розминка · 5 хв — 5 карток з учора»; turns red if the warm-up is built from something else) - expect: `checklist` data-state `day`, data-value 0, three rows with «усі ›» - expect: no `dash-day`, no `finish-card`; ticker texts «Співбесіда сьогодні», «Серія N дн.», «Удачі»

#### 4.2. @REQ-PLAN-10 the warm-up round, its result and the redo

**File:** `tests/e2e/plan-clock-day.spec.ts`

**Steps:**

1. Setup as above; click `warmup-start`. - expect: URL /plan/day?d=<interview date>; `plan-run` data-kind `warmup`; the round has 5 cards
2. Reveal and rate every card 5. - expect: `finish-result` data-kind `warmup`; `finish-score` 5/5; `finish-verdict` state `ok` with «Усе на місці. Удачі на співбесіді.»; `checklist-go` data-value 0 total 6
3. Click `checklist-go`. - expect: `dash` data-state `day`; `warmup-card` data-state `done`; `warmup-score` data-value 5, data-total 5; the button reads «Ще раз →»
4. Click `warmup-start` again (redo). - expect: a new round starts: `plan-run` data-kind `warmup` is visible (turns red if a done warm-up cannot be repeated)

#### 4.3. @REQ-PLAN-10 the warm-up source falls back to recent answers when no Фініш was done

**File:** `tests/e2e/plan-clock-day.spec.ts`

**Steps:**

1. Clock D0, register, interview D0+2, answer some questions wrongly through the API (so recent mistakes exist), skip the Фініш. Clock D0+2, log in, read plan.warmup and open /dash with page.clock. - expect: plan.warmup.from is `recent` and `warmup-card` data-from `recent` — NOT observed in this run (A6); the generator records the real size/cards/questions and, if `recent` cannot be reached, moves it to Ambiguities instead of skipping

#### 4.4. @REQ-PLAN-10 the day after the interview the usual dashboard returns

**File:** `tests/e2e/plan-clock-day.spec.ts`

**Steps:**

1. Setup as the interview-day scenario with the warm-up done. Clock D0+3 12:00, log in, page.clock the same instant, open /dash. - expect: `dash` has no data-state `finish` or `day` (observed: no state attribute value, the full dashboard with no active interview); `warmup-card`, `finish-card`, `dash-day` are all absent (turns red if the interview-day screen lingers) - expect: the «Як пройшла?» `ask-card` with data-state `day1` is shown (see PLAN-11); `dash-add-date` is not asserted here

### 5. PLAN-11 «Як пройшла?», move, history, profile tiles (UI + server clock)

**Seed:** `tests/seed.spec.ts`

#### 5.1. @REQ-PLAN-11 the day after the interview the card is `day1` and one answer saves to the history

**File:** `tests/e2e/interview-ask.spec.ts`

**Steps:**

1. Clock D0, register, interview D0+1. Clock D0+2 12:00 (the day after), log in, page.clock the same instant, open /dash. - expect: `ask-card` data-state `day1`, data-value D0+1; `ask-title` «Співбесіда вчора · DD.MM»; text «Запиши, поки пам'ятаєш» - expect: `ask-option` data-key offer, waiting, failed, moved — four radios, none checked; `ask-save` is disabled and reads «Далі: питання →» (A11); `ask-later` («Пізніше») and `ask-close` are visible; ticker item `ask` is present
2. Pick `ask-option[data-key=waiting]`, click `ask-save`. - expect: `ask-card` is removed; `asked-card` data-state `list` appears (PLAN-12) - expect: GET /me/interviews: past[0].outcome is `waiting`; `/profile/interviews` row for D0+1 has data-state `waiting`

#### 5.2. @REQ-PLAN-11 days 2 to 7 show the `late` card, after day 7 there is none

**File:** `tests/e2e/interview-ask.spec.ts`

**Steps:**

1. One account per instant (or reuse one with the clock moved forward): interview on D0+1; clock D0+3 (day 2). Open /dash. - expect: `ask-card` data-state `late`; title «Співбесіда DD.MM · 2 дні тому»; `ask-readiness` is visible with data-value = the readiness on that date; `ask-save` reads «Зберегти», `ask-later` «Відповім пізніше»
2. Clock D0+8 (day 7) and open /dash. - expect: `ask-card` is still `late` («7 днів тому»; turns red if the window ends at day 6)
3. Clock D0+9 (day 8) and open /dash, then /profile/interviews. - expect: `ask-card` is absent and ticker item `ask` is absent (turns red if the window is longer than 7 days) - expect: the history row for the date stays with data-state `none`

#### 5.3. @REQ-PLAN-11 «Пізніше» and × hide the card until tomorrow

**File:** `tests/e2e/interview-ask.spec.ts`

**Steps:**

1. Setup a `late` card (day 2). Click `ask-later`. - expect: `ask-card` disappears; localStorage `qa-hub-ask-later-v1` holds {id: interview id, date: today} (observed shape)
2. Reload the same day. - expect: the card stays hidden
3. Clock +1 day, log in, new page.clock, open /dash. - expect: `ask-card` is back (the hide lasts until the next day)
4. Click `ask-close` (×) instead of `ask-later` in a second run of the same setup. - expect: same result: hidden today, back tomorrow (one UI path for each control)

#### 5.4. @REQ-PLAN-11 «Перенесли» moves the same interview and writes nothing to the history

**File:** `tests/e2e/interview-ask.spec.ts`

**Steps:**

1. Setup a `late` card with no other active interview. Pick `ask-option[data-key=moved]`. - expect: `ask-move` appears with `interview-chip` tomorrow / in3 / week and `interview-date` empty; `ask-save` reads «Зберегти дату» and is disabled; `ask-readiness` is hidden
2. Click `interview-chip[data-key=in3]`, then `ask-save`. - expect: `ask-card` is removed - expect: GET /me/interviews: active.id equals the id of the moved interview, active.date is today+3, active.outcome is null; past is empty (turns red if the move creates a second interview or stores an outcome) - expect: the profile tile `interview-tile` past has data-value 0 and `/profile/interviews` shows no row for it - expect: the dashboard is `dash` data-state `plan` for the new date

#### 5.5. @REQ-PLAN-11 a move onto an existing active interview asks `interview-replace`

**File:** `tests/e2e/interview-ask.spec.ts`

**Steps:**

1. Interview A on D0+1 (so A is past on D0+3); on D0+3 create interview B on D0+5 through the API; open /dash with page.clock D0+3. Pick `moved`, chip in3, click `ask-save`. - expect: dialog `interview-replace` shows `interview-replace-was` data-value D0+5 and `interview-replace-next` data-value D0+6 (today+3), text «Замінити співбесіду?»
2. Click `interview-replace-keep` («лишити DD.MM»). - expect: the dialog closes; active is still B (D0+5); A still has outcome null; `ask-card` is still visible; nothing moved (turns red if keep moves anyway)
3. Repeat, click `interview-replace-confirm` («Замінити») — expected per test-ids, not observed. - expect: A takes the new date and becomes the active interview, B is gone; the history still has no row for A; `ask-card` is removed

#### 5.6. @REQ-PLAN-11 /profile/interviews lists newest first and a row changes the result

**File:** `tests/e2e/interview-history.spec.ts`

**Steps:**

1. Three past interviews through the API and clock jumps (D0+1 answered `offer`, D0+4 unanswered, D0+9 answered `waiting`; one interview at a time because only one can be active); open /profile/interviews. - expect: `interviews-list` has `interview-row` elements ordered by date descending (data-value) (turns red if the order is oldest first); states `offer|waiting|none`; `interview-row-readiness` data-value is the stored readiness
2. Click the `waiting` row, choose `interview-result-option[data-key=offer]`, click `interview-result-save`. - expect: `interview-result` sheet opens first with `aria-checked=true` on `waiting`; it closes after saving; the row data-state becomes `offer`; the tiles `offer` +1 and `waiting` −1 (observed 0/1 → 1/0)

#### 5.7. @REQ-PLAN-11 the profile «Співбесіди» tiles follow the results

**File:** `tests/e2e/interview-history.spec.ts`

**Steps:**

1. Open /profile after one `waiting` past interview. - expect: `interview-tile` past 1, offer 0, waiting 1, failed 0 (texts «1 минуло», «0 офер», «1 чекаю», «0 не вийшло»); `interview-history-link` «Усі →»
2. Click `interview-history-link`. - expect: URL /profile/interviews; the same four tiles; `interviews-next` data-state `none` when no active interview

#### 5.8. @REQ-PLAN-11 a guest on /profile/interviews is sent to the login

**File:** `tests/e2e/interview-history.spec.ts`

**Steps:**

1. In a guest context open /profile/interviews. - expect: URL is /login?next=%2Fprofile%2Finterviews (not the history; turns red if the guard is missing)

#### 5.9. @REQ-PLAN-11 outcome and move API rejections

**File:** `tests/api/interview-outcome.spec.ts`

**Steps:**

1. PUT /me/interviews/:id/outcome with an invalid value, with an ACTIVE (not yet past) interview, with a foreign interview id; POST /me/interviews/:id/move with a date outside tomorrow … +7 and onto an existing active interview without `replace`. - expect: invalid value → 400; active interview → rejected (test-ids: «past interviews only»); foreign id → 404; out-of-range date → 400 `interview_date`; clash → 409 `interview_exists`; with `replace:true` → 200 and the other interview is gone. Exact statuses were NOT probed in this run: the generator records the real ones and flags any difference
2. Set an outcome, then move the same interview. - expect: the move leaves `outcome` unchanged and adds nothing to `past` (a move is never a result)

### 6. PLAN-12 «Які питання тобі ставили?» (UI + API)

**Seed:** `tests/seed.spec.ts`

#### 6.1. @REQ-PLAN-12 after the result the asked-card offers suggestions, search and one own question

**File:** `tests/e2e/interview-asked.spec.ts`

**Steps:**

1. Setup: past interview on D0+1, clock D0+2, outcome saved through the UI as in PLAN-11 (or api.setInterviewOutcome); open /dash. - expect: `asked-card` data-state `list`, data-value D0+1; text «Які питання тобі ставили?»; 4 `asked-option` suggestions (state `off`) taken from the interview's chapters; `asked-save` data-value 0 and disabled; `asked-later` visible; `asked-text` present
2. Check the first suggestion. - expect: its state becomes `on`; `asked-save` data-value 1 («Зберегти · 1»)
3. Type «ab»… use `asked-search` with a 2+ char term from a known question (e.g. the first word of a bank question title), pick a result; then fill `asked-text` with one own question. - expect: `asked-result` rows appear (a short query of 1 char finds nothing / no request; `asked-none` for a term with no hit); marking a result increments `asked-save` data-value; a non-empty own text counts as one more (observed 1 mark + 1 own = «Зберегти · 2»)
4. Click `asked-save`. - expect: `asked-card` data-state `thanks`; `asked-thanks-count` data-value 2; `asked-thanks-text` mentions the number of questions from the bank counted (observed «1 питання з бази враховано»); `asked-section` rows with data-key = a section id (observed `playwright`, value 101) - expect: API GET /me/interviews/:id/questions: picked has the marked ids, texts has the own question

#### 6.2. @REQ-PLAN-12 «Пізніше» hides the asked-card until tomorrow

**File:** `tests/e2e/interview-asked.spec.ts`

**Steps:**

1. Setup as above; click `asked-later`. - expect: `asked-card` disappears and stays hidden after a reload the same day
2. Clock +1 day (day 2 after the interview), log in, page.clock, open /dash. - expect: `asked-card` is back with data-state `list` (until day 7 after the interview; not repeated here, covered by the `ask-card` window scenario)

#### 6.3. @REQ-PLAN-12 the history sheet row «Питання» edits the marks

**File:** `tests/e2e/interview-asked.spec.ts`

**Steps:**

1. Setup with 1 mark + 1 own text saved (via the API). Open /profile/interviews, click the row. - expect: `interviews-questions` data-value 2 («Питання відмічено 2 ›»)
2. Click `interviews-questions`; uncheck the mark; click `asked-save`. - expect: `asked-sheet` is shown with the marked option `on`, `asked-stored` data-value 1 (read-only stored own question); after saving, the back link `interviews-questions-back` returns to the result sheet and `interviews-questions` data-value is 1 (turns red if the edit is not saved)

#### 6.4. @REQ-PLAN-12 a question marked by 3 users shows the quiz tag, also to guests

**File:** `tests/e2e/interview-asked.spec.ts`

**Steps:**

1. Clock D0; register 3 throwaway accounts, one interview each on D0+1 (chapters of one topic). Clock D0+2; log each in again; PUT outcome `offer` and PUT /questions with the SAME question id (taken from the first account's suggested list) for each. - expect: GET /sections/<section>/questions has `asked` 3 for that id and null for every other (fresh request)
2. Open /quiz/<section> in a NEW guest context (no quiz cache: the response is `max-age=300`, A9), pick «Усі питання» (101 questions, random order) and step with an option + `quiz-next` loop until `quiz-question-text` equals the tagged question's text. - expect: `quiz-asked-tag` data-value 3 with the text «РЕАЛЬНО ПИТАЛИ · 3 РАЗИ»; `quiz-asked-note` text «3 користувачі чули це питання на співбесідах.» (turns red if guests do not get the tag) - expect: every other question in the round has no `quiz-asked-tag`

#### 6.5. @REQ-PLAN-12 two users are not enough for the tag

**File:** `tests/api/interview-asked.spec.ts`

**Steps:**

1. Same setup with only 2 accounts marking the same question; read GET /sections/<section>/questions (no cache). - expect: `asked` is null for that question (threshold 3, turns red if the threshold is 2)
2. A third account marks it. - expect: `asked` is 3

#### 6.6. @REQ-PLAN-12 an own question reaches the admin inbox without a name

**File:** `tests/api/interview-asked.spec.ts`

**Steps:**

1. A user saves an own question with a unique text (`texts:[unique]`) on a past interview. As the admin (`adminToken`) GET /admin/asked and find the item by text. - expect: the item has status `open`, level, chapters (Ukrainian titles) and interviewDate, and NO user id, name or email key (assert the key set; turns red if identity leaks) - expect: a signed-out or non-admin call is 401/403 (not probed: record the real code)
2. PATCH /admin/asked/:id {status:'done'}, then GET again. - expect: the item is `done`; the inbox is database-wide so find by unique text

#### 6.7. @REQ-PLAN-12 the admin inbox filter `asked` shows the own question (to confirm)

**File:** `tests/e2e/interview-asked.spec.ts`

**Steps:**

1. As the owner (`adminPage`), open /admin?tab=inbox and click `admin-inbox-filter` data-key `asked`; search the unique text. - expect: an `admin-asked` row with data-state `open` is shown and no author is displayed; `admin-asked-toggle` switches it to `done` (not opened in this run, test-ids lists the filter keys inconsistently, A8; if the chip does not exist, report it as a difference)

#### 6.8. @REQ-PLAN-12 asked-question API rejections

**File:** `tests/api/interview-asked.spec.ts`

**Steps:**

1. PUT /me/interviews/:id/questions with an unknown question id; with more own texts than the stored+new limit (ASKED_TEXTS_MAX); with a text of 301 chars; with duplicated ids. - expect: unknown id → 400; over the limit → 400 `asked_texts_limit` (the typed code from the shared schema); 301 chars → 400; duplicates are dropped (one mark). Statuses other than the documented `asked_texts_limit` were not probed in this run
