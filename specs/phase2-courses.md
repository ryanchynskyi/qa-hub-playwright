# Phase 2 – Courses (CRS-01…06, 08)

## Application Overview

Courses `/course`, `/course/playwright`, step screens under `/course/playwright/<chapter>/…`. Walked live on http://localhost:4273 (uk UI) with the seed tests/seed.spec.ts (project desktop): guest and two throwaway signed-in accounts. Ids come from test-ids.md "Courses"; every number, chapter id, question id and card id in a test comes from the API at run time (see Prerequisites "course shape").

## Prerequisites (src/api/client.ts and helpers do not have these yet)

Probed shapes (real requests, signed in, all from the page):

1. `courseProgress(token)`: `GET /api/me/progress` already exists as `progress()`. Its body has `courses: { [slug]: { questions: { [questionId]: { lastResult: 0|1, skipped: boolean } }, cards: { [cardId]: timestampMs }, articlesRead: { [articleId]: timestampMs } } }`. A new account has `courses: {}`; a course key appears on the first scoped write. Check that the zod `Progress` schema keeps `courses` (it is not stripped), else add it.
2. `resetCourse(token, slug)`: `POST /api/me/courses/<slug>/reset`, NO body and NO content-type (a `content-type: application/json` with an empty body gives 400 even for a valid slug). 204 empty body for `playwright` and `api` (also when the course is empty, twice in a row). Unknown slug (`nope`, `Playwright`): 400 `{"error":"bad_request","message":"body: Invalid option: expected one of \"playwright\"|\"api\""}`. No token: 401. Expose a raw variant that returns the response so the API tests can assert 400/401 with `expectError`.
3. `checkAnswer(questionId, choice, token, first, course?)`: `POST /api/quiz/check {questionId, choice, course?: 'playwright'|'api'}`. The UI sends `{"questionId":"6wu6zh","choice":1,"course":"playwright","lang":"uk"}`. With a token and `course` the answer lands in `progress.courses[course].questions` AND in the global `questions`; `choice: null` with a token records a SKIP (`outcome:"skipped"`, course row `{lastResult:0, skipped:true}`), so learn the correct index with no token (guest call, records nothing). Unknown `course` (`nope`): 400 `{"error":"bad_request","message":"course: Invalid option: expected one of \"playwright\"|\"api\""}`.
4. `rateCard(token, cardId, rating, course?)`: `POST /api/me/recall/rate {cardId, rating, course?}`; scoped rating writes `courses.playwright.cards[cardId]` and the global `cards`. Unknown course: the same 400.
5. `readArticle(token, articleId, course?)`: today it posts with no body. With a course it is `POST /api/me/articles/<id>/read` with JSON `{course:'playwright'}`; unscoped keeps the current body-less call. Unknown course: the same 400. Article ids are `<chapterId>:<index>` (`pw-bcp:0`); `chapter(chapterId).articles[].id` lists them, the UI route `/article/<n>` is the 1-based position.
6. Course shape helper (test util, built from `catalog()` and `questions()`): course chapters = `catalog.chapters` with `topicId === 'playwright'` sorted by `order` (12 today; the app reads the same list); per chapter: articles = `chapter(id).articles`, questions = `catalog.questions` filtered by `chapterId` in catalog order, cards = `catalog.recallCards` filtered by `chapterId`. The catalog has no code flag: call `questions(sectionId)` for each `sectionId` used by the course questions (`playwright` AND `pwfix` today) and take `code !== ''`. Практика = the chapter's code questions, Тест = the rest, both in catalog order (verified: the Тест of pw-bcp followed the catalog order 6wu6zh, 1dimgah, 1fmth7f, 1whzhm8). Chapter pickers, all computed at run time: `full` = first chapter with >=2 articles, >=1 code question, >=3 plain questions and >=2 cards (pw-bcp today: 3 articles, 1 code, 4 plain, 3 cards); `noCode` = first chapter with 0 code questions and >=1 plain (pw-arch); `noCards` = first chapter with 0 cards (pw-emu). If a picker finds nothing the test fails with a message naming the missing shape (no skip). `locked` = chapter at position 3 (COURSE_GUEST_CHAPTERS = 2 is the app rule; read it from the position, do not hard-code the id).
7. `completeChapter(token, chapter)` arrange helper: scoped read of every article, scoped correct answer of every question, scoped rating of every card (all through the methods above).
8. Page objects: course catalog, course page, step screen (article / practice / test / cards / result / retry), reset dialog. All locators by test id from test-ids.md. `course-fail-retry` is the result-screen button, `course-retry` is the wrapper of the retry run (the brief names the button `course-retry`; see Ambiguities). Scope catalog ids by `course-card[data-key=<slug>]`.
9. Network spy: `page.on('request')` filter for the quiz-finish request (`POST /api/me/quiz/finish`), used by CRS-04.
10. Signed-in browser: use the existing signed-in fixture (UI login). Guest: the default fixture with empty storage.

## Ambiguities (app versus requirement or checklist)

- A1. Brief and CRS-001 name the count line «13 розділів» for a not-started card. Live: the Playwright card says «12 розділів · тест у кожному» (`course-stat chapters` v=12, `course-progress` v=0 t=12) and the API card says «13 розділів · тест у кожному» (v=13, t=13). Plan asserts the numbers from the catalog per card.
- A2. test-ids lists the chip keys as `cypress/selenium/typescript/sql/appium`; the DOM order is cypress, selenium, typescript, appium, sql. Scenarios compare as a set, not in order.
- A3. The result-screen button of the retry is `course-fail-retry` («Повторити помилки · N»); `course-retry` is the retry-run wrapper (key = chapter). The brief's «course-retry» is split accordingly.
- A4. `course-xp` is not total XP. Fresh account, chapter pw-bcp fully answered correctly by API plus 3 article reads: `stats.totalXp` = 56 (3 reads 16 = 12 + 2 + 2, 5 answers 40) but `course-xp` = 46. The first read of an account's first article earns a global 12, the chip counts 2 per article. Plan arranges answers only (no article reads) when it compares `course-xp` with `totalXp`. Whether the 10 difference is the first-read bonus is inferred, not proven.
- A5. CRS-006 says a step inside the course "still earns daily-task progress". Not observable: 5 scoped correct answers left every daily task at 0 (ANSWER_N 0/10, ACCURACY 0/1, CODE_REVIEW 0/3) because that progress is written by `me/quiz/finish`, which the course never calls (CRS-016). Daily tasks differ per account (a READ_ARTICLE task exists only for some). Plan proves XP only; daily-task progress by a scoped read is under Ideas.
- A6. No chapter has Практика without Тест, and none has neither, so the `course-score` fallback to Практика and its absence are not testable on today's content (CRS-021).
- A7. Opening an article marks it read at once (the course record has it before the user leaves), but its outline item stays `current` while open and turns `done` on the next step.
- A8. Chapter is `done` when every step is done, wrong answers count: pw-bcp was `done` with Тест 2/4 and the card of the catalog showed `course-progress` v=1.
- A9. Enter on the last Тест question goes to the next existing step (`…/cards`), not to `…/result`; `course-finish` («Завершити», goes to result) exists only before the answer and is replaced by `quiz-next`.
- A10. Cards step shows «минулого разу: …» from the global card history although the course record is empty; the course counter starts at 1 of the chapter's cards.
- A11. Guest on the result of a locked chapter gets only `course-guest-box` (no `course-next`). The documented `course-next` key `login` (guest in front of a locked chapter, e.g. from chapter 2) was not walked.
- A12. NOT WALKED: that no `POST /api/me/quiz/finish` is sent during Практика/Тест (my request filter missed the path); only `POST /api/quiz/check` with `course:"playwright"` was seen. The CRS-04 scenario proves it with the spy.
- A13. The «started» state of a card with a read article but no finished chapter was not probed (only a done chapter was); scenario uses a done chapter.
- A14 (main session probe). A scoped write does not check that the item belongs to the course: `POST /me/articles/sq-0:0/read {course:'playwright'}` (an SQL article) is 200 and lands in `courses.playwright.articlesRead`. CRS-027 limits the import to known content, the scoped writes have no such rule. Question for the app owner; not asserted.

## Corrections by the main session

These win over the rest of the plan.

- Order of work (one PR each): **A** = suite 8 (API) + suites 1, 2; **B** = suites 3, 4; **C** =
  suites 5, 6; **D** = suite 7. Files: suite 8 → `tests/api/course-progress.spec.ts`, suites 1–7
  → the `tests/e2e/course-*.spec.ts` files named in the scenarios.
- Prerequisites done for A, use them, do not re-create them:
  - ApiClient: `checkAnswer(id, choice, token, first, course)`, `rateCard(token, id, rating,
course)`, `readArticle(token, id, course)` (body-less without `course`), `resetCourse(token,
slug)` (204). Negative cases (400, 401) go through `api.raw.post` + `expectError` /
    `expectStatus`, as in `tests/api/auth.spec.ts`; a reset there is body-less.
  - `Progress` has `cards` (keys), `articlesRead`, `courses` (`{ questions, cards, articlesRead }`
    per slug) and `stats.streak`.
  - Worker fixture `course` (= prerequisite 6, `src/helpers/course.ts`): chapters with
    `id, position, articles, code, plain, cards`; `chapterOf(course, 'full' | 'noCode' |
'noCards')`, `chapterAt(course, 3)` (first locked for a guest), `lessonCount(chapter)`,
    `completeChapter(api, token, chapter)`, `GUEST_CHAPTERS`. Today: full = pw-bcp, noCode =
    pw-arch, noCards = pw-emu, chapter 3 = pw-loc. Never type those ids.
  - Page objects and fixtures: `courses` (`CourseCatalogPage`: `card`, `chapters`, `progress`,
    `cta` per slug, `soon(key)`, `soonChips`, `soonNote`, `goto`), `coursePage` (`CoursePage`:
    `chapters`, `chapter(id)`, `toggle`, `lessons`, `step(key)`, `chapterIds()`, `panelCta`,
    `progress`, `reset*`, `guest*`, `goto(slug)`). Step screens (suites 3–6) get their page
    object in PR B.
- Signed in: the `user` fixture (API register, deleted after) + `signIn(user)` before the first
  `goto`; no UI login anywhere in this plan (no kept-token check here). Guest: the default page.
- 1.1: the API card's chapter count is a list in the app's code, not in the API. Assert for
  the API card only: `course-stat chapters` data-value equals its `course-progress` data-total,
  cta `start`, the count line is there. Do not type 13.
- 1.3: the chip keys are compared as a set (A2), copied from test-ids.md.
- 2.4: the numbers in brackets are today's examples; compute every one with `lessonCount`.
- 3.2 step 2: after `course-back` the URL is …/article/1, item 1 is `current` (aria-current=step)
  and item 2 is `done` (opening an article reads it, A7). If the walk shows another state,
  report it; do not adapt the expect.
- 5.3: read the session total from `recall-progress` before rating; never type 8 or 9.
- 6.4 step 2: read `stats.totalXp` before the retry; after the right answer it is higher by the
  `+N XP` of the verdict. Step 4: reload …/result: `course-retry-fixed` is absent and
  `course-fail-retry` still says W − 1.
- 7.2: XP only (quiz-side daily tasks come from `/me/quiz/finish`, which the course never sends:
  by design, CRS-016). The daily-task part of CRS-006 is proved by 8.8.
- 7.4 is dropped: 8.5 proves «no second XP» through the API, and 7.3 already clicks the reset
  button (`pyramid-level`).
- New 8.8 (below): a scoped read advances READ_ARTICLE (replaces the A5 doubt).

## Ideas (not planned, the user decides)

- Scoped read of an article that is a daily READ_ARTICLE task advances that task (A5); needs a plan day shaped by the weak topics.
- Course started with one article read and no chapter done: card state and bar.
- `course` = `api` on a Playwright question or a Playwright card (is the record written, rejected?).
- Rating a card through `/recall` writes no course row (mirror of CRS-08).
- Phone layout of the step screens (CRS-11), `/done` summary (CRS-07), guest import (CRS-09), API course (CRS-10) are separate blocks.
- Reset dialog: Escape and scrim cancel, `course-reset-error` after a failed request (needs a route mock).
- `course-chapter-toggle` expand/collapse of a todo chapter and its `course-step` chips.

## Test Scenarios

### 1. CRS-01 Catalog

**Seed:** `tests/seed.spec.ts`

#### 1.1. @REQ-CRS-01 Guest catalog: two cards, not-started count line

**File:** `tests/e2e/course-catalog.spec.ts`

**Steps:**

1. Open /course as a guest with empty storage. Read the Playwright chapter count N from the catalog (chapters with topicId playwright) and the API chapter count M (api topic ids of the course list, only those present) through the ApiClient. - expect: `course-catalog` is visible; `course-card` keys in DOM order are `playwright` then `api`; this fails if the API card goes first or one is missing. - expect: Inside `course-card[data-key=playwright]`: `course-stat` data-key=chapters has data-value N; `course-progress` data-value 0 and data-total N; text contains «розділів · тест у кожному» (today «12 розділів»). Fails if the count is hard-coded 13 or the bar shows instead of the count line.
2. Read the cta of both cards. - expect: Both `course-cta` have data-state `start` and the text «Почати →»; fails if a guest card says «Далі →». - expect: `course-card[data-key=api]` `course-stat` chapters equals M (13 today, differs from the Playwright card: A1).

#### 1.2. @REQ-CRS-01 Started course: bar and n / N on the Playwright card only

**File:** `tests/e2e/course-catalog.spec.ts`

**Steps:**

1. Register through the ApiClient, run `completeChapter` for the first chapter of the Playwright course through scoped calls (reads, answers, ratings). Sign in through the UI and open /course. - expect: `course-card[data-key=playwright]` `course-progress` has data-value 1 and data-total N (the bar replaced the count line: the text «розділів · тест у кожному» is absent in this card). - expect: `course-stat` data-key=chapters still has data-value N (it sits on the «N» of «1 / N»).
2. Read the cta of both cards. - expect: Playwright `course-cta` data-state `continue`, text «Далі → - expect: API card `course-cta` data-state `start` and its count line stays, so the Playwright course record does not leak into the API card (fails if both bars start).

#### 1.3. @REQ-CRS-01 Coming-soon chips toggle, persist on reload and unmark

**File:** `tests/e2e/course-catalog.spec.ts`

**Steps:**

1. Open /course as a guest. Collect the `course-soon` data-keys. - expect: The set of keys is exactly cypress, selenium, typescript, sql, appium (A2), all data-state `idle`, aria-pressed `false`, and there is no api chip; `course-soon-note` is absent.
2. Click the `course-soon` chip with data-key `cypress`. - expect: It has data-state `clicked`, aria-pressed `true`, text ends with «✓»; `course-soon-note` is visible with role status. Other chips stay `idle` (fails if the click marks all).
3. Reload the page. - expect: The cypress chip is still `clicked` (localStorage qa-hub-course-soon-v1 `on` holds cypress) and `course-soon-note` is visible.
4. Click the cypress chip a second time. - expect: It returns to data-state `idle`, aria-pressed `false`, the «✓» is gone and `course-soon-note` disappears (no chip is pressed).
5. Reload the page again. - expect: The cypress chip is `idle` after reload, so the unmark is remembered, not only the mark.

### 2. CRS-02 Course page

**Seed:** `tests/seed.spec.ts`

#### 2.1. @REQ-CRS-02 Guest sees chapters 1-2 open and the rest locked, with the guest box

**File:** `tests/e2e/course-page.spec.ts`

**Steps:**

1. Open /course/playwright as a guest. Take the chapter list from the course shape. - expect: `course-chapter` rows equal the chapter list in order (data-key = chapter ids), N rows. - expect: The first row has data-state `current`, the second `todo`, every row from position 3 is `locked`; a locked row has no `course-chapter-toggle`, the open ones do. Fails if the lock starts at 2 or 4.
2. Inspect `course-guest-box`. - expect: `course-guest-box` is visible; `course-guest-login` links to /login?next=%2Fcourse%2Fplaywright and `course-guest-register` to /register?next=%2Fcourse%2Fplaywright. - expect: `course-reset` is absent (a guest has not started).

#### 2.2. @REQ-CRS-02 Guest login link of the box goes to the login form with next

**File:** `tests/e2e/course-page.spec.ts`

**Steps:**

1. Open /course/playwright as a guest and click `course-guest-login`. - expect: URL is /login with next=/course/playwright; the login form is visible (fails if the link is dead or loses next).

#### 2.3. @REQ-CRS-02 Signed in: nothing locked, no guest box

**File:** `tests/e2e/course-page.spec.ts`

**Steps:**

1. Register through the ApiClient, sign in through the UI, open /course/playwright. - expect: No `course-chapter` has data-state `locked`; the first is `current`, all the others `todo` (nothing is done yet). - expect: `course-guest-box` is absent and no `course-guest-login` exists.

#### 2.4. @REQ-CRS-02 course-chapter-lessons equals articles plus Практика, Тест and Картки that exist

**File:** `tests/e2e/course-page.spec.ts`

**Steps:**

1. Open /course/playwright as a guest. For each chapter compute lessons = articles + (code questions > 0) + (plain questions > 0) + (cards > 0) from the course shape. - expect: For each `todo` and `locked` row `course-chapter-lessons` data-value equals the computed number and the text is «N кроків» (pw-bcp 6, pw-cfg 7: five articles + Тест + Картки because it has no code). Fails if a missing step (noCode chapter) is still counted.
2. Look at the first (current) row. - expect: The current row has no `course-chapter-lessons` on desktop (it shows «Зараз»; its `course-step` chips are listed instead).

### 3. CRS-03 Article step

**Seed:** `tests/seed.spec.ts`

#### 3.1. @REQ-CRS-03 Article screen shows the outline with every step and a correct first-step footer

**File:** `tests/e2e/course-article.spec.ts`

**Steps:**

1. Signed-in fresh account; open /course/playwright/<full>/article/1. The expected outline keys are article-<id> for each article, then practice, test, cards (those that exist). - expect: `course-step-view`, `course-ctx` (data-key = chapter id) and `course-article` (data-key = the first article id) are visible. - expect: `course-outline` data-key = chapter id; its `course-outline-item` keys equal the expected list in order (whole list copied from the shape). - expect: First item data-state `current` with aria-current=step, all others `todo`; `course-back` is absent on the first step; `course-next` data-key is `article-<second id>` and its text starts with «Далі:».

#### 3.2. @REQ-CRS-03 Next walks forward, back returns, the read article turns done

**File:** `tests/e2e/course-article.spec.ts`

**Steps:**

1. On article 1 click `course-next`. - expect: URL is …/article/2; `course-back` is visible with data-key `article-<first id>`. - expect: Outline: first item `done`, second `current`, the rest `todo`.
2. Click `course-back`. - expect: URL is …/article/1 again; the first item is `current` or `done` consistently with its read state (it was read, so after moving forward it is `done` only when the next step is current: read the actual state and assert it equals the state of the same item in the programme).
3. Read the course record through the ApiClient. - expect: `courses.playwright.articlesRead` contains both article ids (the read is recorded by opening, A7); the global `articlesRead` contains them too.

#### 3.3. @REQ-CRS-03 Last article continues to the next existing step; programme shows the article steps done

**File:** `tests/e2e/course-article.spec.ts`

**Steps:**

1. Open the last article of the `full` chapter and read `course-next`. - expect: `course-next` data-key is `practice` and the text is «Далі: практика →» (chapter has code questions).
2. Open the last article of the `noCode` chapter. - expect: `course-next` data-key is `test` and the text «Далі: тест →» (fails if it points at the missing Практика).
3. Open /course/playwright and look at the `full` chapter row steps. - expect: Every `course-step` with key `article-<id>` that was opened is `done`; `practice`, `test`, `cards` are `todo` or `current` (not done by reading).

#### 3.4. @REQ-CRS-03 Guest on chapter 3 gets the guest box, not the article; chapters 1-2 stay open

**File:** `tests/e2e/course-article.spec.ts`

**Steps:**

1. As a guest open /course/playwright/<chapter at position 3>/article/1. - expect: `course-step-view` and `course-guest-box` are visible with `course-guest-login` and `course-guest-register`; `course-article` is absent and so is `course-outline-item`.
2. As a guest open /course/playwright/<chapter at position 2>/article/1. - expect: `course-article` is visible and `course-guest-box` is absent (boundary: the second chapter is the last open one).

#### 3.5. @REQ-CRS-03 Unknown chapter or article number lands on the course page

**File:** `tests/e2e/course-article.spec.ts`

**Steps:**

1. Signed in, open /course/playwright/nope/article/1. - expect: URL becomes /course/playwright and `course-page` is visible.
2. Open …/<full>/article/<count+1> and …/<full>/article/0. - expect: Both land on /course/playwright (boundary after the last and before the first article); fails if one shows an empty article.
3. Open /course/playwright/<noCode>/practice and /course/playwright/<noCards>/cards. - expect: Both land on /course/playwright (steps that do not exist redirect, CRS-018).

### 4. CRS-04 Практика and Тест

**Seed:** `tests/seed.spec.ts`

#### 4.1. @REQ-CRS-04 Практика: counter, no skip, verdict only after the check

**File:** `tests/e2e/course-quiz.spec.ts`

**Steps:**

1. Signed in fresh account; open …/<full>/practice. N = number of code questions of the chapter. - expect: `course-practice` data-key = chapter; `course-counter` data-value 1 data-total N; `quiz-code` is visible; `quiz-skip` is absent; `course-reread` is visible with the first article key. - expect: `quiz-verdict`, `quiz-explanation` and `course-theory` are absent before any answer (fails if the verdict is shown early).
2. Choose a wrong option (the correct index comes from the guest `checkAnswer` with choice null). - expect: The chosen `quiz-option` has data-state `wrong`, the correct one `correct`; `quiz-verdict` data-state `wrong`; `course-theory` is visible with the first article key; `quiz-next` replaces `course-reread` (which is gone).

#### 4.2. @REQ-CRS-04 Тест: no code, keys 1-9 pick the option, Enter moves on, finish goes to result

**File:** `tests/e2e/course-quiz.spec.ts`

**Steps:**

1. Open …/<full>/test. - expect: `course-test` data-key = chapter; `course-counter` 1 of the number of plain questions; `quiz-code` is absent; `quiz-skip` is absent; `course-finish` is visible; the level label is shown.
2. Press key `1`. - expect: The first displayed `quiz-option` (first in the list order, whatever its data-key) gets `correct` or `wrong`; no second option is selected; `course-finish` is replaced by `quiz-next`.
3. Press Enter. - expect: `course-counter` data-value is 2 and a new `question` with another data-key is shown, the verdict is cleared.
4. Open …/<full>/test again and click `course-finish`. - expect: URL ends with /result and `course-result` has data-key = chapter.

#### 4.3. @REQ-CRS-04 Re-entry starts at the first unanswered question, all answered starts at 1

**File:** `tests/e2e/course-quiz.spec.ts`

**Steps:**

1. Arrange through scoped `checkAnswer`: answer the first two plain questions (catalog order) of `full`. Open …/test. - expect: `course-counter` data-value is 3 and `question` data-key is the third plain question id (computed, not typed).
2. Answer all remaining plain questions through the API and reopen …/test. - expect: `course-counter` data-value is 1 (all answered starts at the beginning).
3. Reset the course through the ApiClient, answer only the SECOND question, reopen …/test. - expect: `course-counter` data-value is 1: the first question has no answer, so the gap, not the last answered, decides.

#### 4.4. @REQ-CRS-04 A skip is not an answer for the course

**File:** `tests/e2e/course-quiz.spec.ts`

**Steps:**

1. Scoped `checkAnswer(q1, null, token, undefined, 'playwright')` for the first plain question (records `skipped: true`), then scoped correct answers for the rest of the plain questions. Open …/test. - expect: `course-counter` data-value is 1 and `question` data-key = q1 (the skipped one is the first unanswered).
2. Open /course/playwright. - expect: The `course-step` key `test` of the chapter is not `done` (fails if a skip counts as an answer).

#### 4.5. @REQ-CRS-04 Answering every question turns the programme row done and sends no quiz finish

**File:** `tests/e2e/course-quiz.spec.ts`

**Steps:**

1. Start the request spy for `POST /api/me/quiz/finish`. Answer all plain questions of `full` in the UI using the option keys and Enter. - expect: Each answer is a `POST /api/quiz/check` with `course: 'playwright'`; the spy saw no quiz-finish request (A12; fails if the course starts calling finish).
2. Open /course/playwright. - expect: `course-step` key `test` inside the `full` chapter is `done`; key `practice` stays `todo` or `current`, so only the answered step turns done.
3. Read `courseProgress` through the ApiClient. - expect: `courses.playwright.questions` has every plain question id; none of the code question ids.

### 5. CRS-05 Cards

**Seed:** `tests/seed.spec.ts`

#### 5.1. @REQ-CRS-05 Cards step hosts Recall's card in the course layout

**File:** `tests/e2e/course-cards.spec.ts`

**Steps:**

1. Signed in fresh account; open …/<full>/cards. K = number of cards of the chapter. - expect: `course-cards` data-key = chapter; `course-counter` data-value 1 data-total K; `recall-card` data-key is one of the chapter card ids with data-state `front`; `recall-bar` and `comments-open` are absent.
2. Press Enter (or click `recall-reveal`). - expect: `recall-card` data-state `back`; `recall-answer` and `recall-kb-link` visible; `recall-rate` has exactly three buttons with data-key 1, 3, 5.

#### 5.2. @REQ-CRS-05 Rating 1 is not requeued, the last rating goes to the result

**File:** `tests/e2e/course-cards.spec.ts`

**Steps:**

1. Reveal the first card and rate it 1 (`recall-rate` key 1). - expect: `course-counter` data-value 2 and data-total stays K (it was not requeued, fails if the total grows); the next `recall-card` has a different data-key.
2. Reveal and rate the remaining cards 3 (key 3), 5 (key 5)... until the last one. - expect: After the last rating the URL ends with …/<chapter>/result; `course-result-step` key `cards` has data-state `done` and data-value K data-total K.
3. Read `courseProgress`. - expect: `courses.playwright.cards` has all K card ids; each card id appears once.

#### 5.3. @REQ-CRS-05 Recall sessions keep requeueing a card rated 1

**File:** `tests/e2e/course-cards.spec.ts`

**Steps:**

1. Open /recall, pick `recall-topic` playwright, click `recall-start`; read `recall-progress` (value/total, 1/8 on a fresh account). - expect: The session starts at value 1.
2. Reveal the card and rate 1. - expect: `recall-progress` data-value 2 and data-total is total + 1 (8 to 9): /recall requeues, unlike the course; fails if the course change made Recall drop the requeue.

#### 5.4. @REQ-CRS-05 Guest on a locked chapter gets the guest box instead of cards

**File:** `tests/e2e/course-cards.spec.ts`

**Steps:**

1. As a guest open …/<chapter at position 3>/cards. - expect: `course-guest-box` is visible, `course-cards` and `recall-card` are absent.

### 6. CRS-06 Chapter result

**Seed:** `tests/seed.spec.ts`

#### 6.1. @REQ-CRS-06 Result score and score bar match the answers

**File:** `tests/e2e/course-result.spec.ts`

**Steps:**

1. Arrange through scoped `checkAnswer`: for the plain questions of `full` answer the first two correctly and the rest wrongly (any index other than the correct one). Open …/<full>/result. - expect: `course-score` data-value 2 and data-total = number of plain questions (Тест, since the chapter has one); its text is «2/N».
2. Read `course-score-bar`. - expect: aria-label «Правильно 2 з N»; one segment per question, the wrong ones carry the bad state (count of bad segments = N - 2).

#### 6.2. @REQ-CRS-06 course-xp equals the XP of the first correct answers and is absent at zero

**File:** `tests/e2e/course-result.spec.ts`

**Steps:**

1. Fresh account A: answer all plain questions of `full` wrongly (scoped). Open …/result. - expect: `course-xp` is absent (data N = 0 hides it) while `course-score` data-value is 0.
2. Fresh account B: answer all plain questions correctly (scoped, no article reads, no card ratings); read `stats.totalXp`; open …/result. - expect: `course-xp` data-value equals `stats.totalXp` of B (46 versus 56 in the reads case: A4), the chip text is «+N XP».

#### 6.3. @REQ-CRS-06 result-step rows show done and todo with a/b and the mistake marker

**File:** `tests/e2e/course-result.spec.ts`

**Steps:**

1. Arrange: read all articles of `full`, answer the code questions wrongly and one plain question wrongly, the rest correctly, rate no cards. Open …/result. - expect: `course-result-step` keys article/practice/test/cards: article data-state `done` value=total=articles; practice `done` with value 0 and total = code count, text ends «· помилка»; test `done` with value = correct and total, text ends «· помилка»; cards `todo` with value 0 and total = cards (the whole list of four keys comes from test-ids).

#### 6.4. @REQ-CRS-06 Повторити помилки: retry run, skip, finish and the fixed line

**File:** `tests/e2e/course-result.spec.ts`

**Steps:**

1. Arrange as above so that W mistakes exist (W >= 3 over Практика and Тест). Open …/result and read `course-fail-retry` (text «Повторити помилки · W»). Click it. - expect: URL ends with …/<full>/retry; `course-retry` data-key = chapter; `course-counter` data-total = W; the `question` ids are exactly the wrong question ids (set equal).
2. Answer the first question correctly, press Enter, click `course-retry-skip` on the second. - expect: After the correct answer the verdict shows and the course XP rises by the first-correct XP; the skip moves to counter 3 without a verdict.
3. Click `course-retry-finish` on the third question. - expect: URL ends with …/result; `course-retry-fixed` has data-value 1 and data-total W with the text «Помилки виправлено · 1 з W»; `course-fail-retry` now shows W - 1; the practice/test rows updated (the fixed question counts correct).
4. Open …/result again through the programme (plain visit, `course-next` or the URL). - expect: `course-retry-fixed` is still shown only right after a Fail run in this visit: observed, after finish and a fresh navigation it was absent on a plain visit; assert absence on a fresh page load.

#### 6.5. @REQ-CRS-06 Skip on the last retry question leaves for the result; nothing to retry redirects

**File:** `tests/e2e/course-result.spec.ts`

**Steps:**

1. Arrange exactly one wrong question; open …/retry. - expect: `course-counter` 1 of 1; `course-retry-skip` visible.
2. Click `course-retry-skip`. - expect: URL ends with /result (last one leaves); the mistake is still counted: `course-fail-retry` text «· 1».
3. Fresh account with every question correct: open …/retry. - expect: Redirect to …/result; `course-fail-retry` is absent and the yellow `course-next` fills the bar.

#### 6.6. @REQ-CRS-06 Next-step button: next undone step, then next chapter

**File:** `tests/e2e/course-result.spec.ts`

**Steps:**

1. Fresh account: answer only the plain questions of `full`; open …/result. - expect: `course-next` data-key is the first undone step key in order (the first article `article-<id>` here) and the text starts «Далі:».
2. Fresh account: `completeChapter(full)`; open …/result. - expect: `course-next` data-key `next-chapter` and the text «Наступний розділ →»; clicking it opens the first step of the following chapter (a `course-article` or `course-ctx` with the next chapter id).
3. As a guest open …/<chapter at position 3>/result. - expect: `course-guest-box` is visible and no `course-score` (A11, `login` key not walked).

### 7. CRS-08 Own course progress and reset

**Seed:** `tests/seed.spec.ts`

#### 7.1. @REQ-CRS-08 KB read, plain quiz answer and Recall rating do not count into the course

**File:** `tests/e2e/course-progress.spec.ts`

**Steps:**

1. Fresh account. Through the ApiClient: unscoped `readArticle` of the first article of `full`, unscoped correct answer of its first plain question, unscoped `rateCard` for its first card. - expect: `courseProgress.courses` is `{}`, while the global `articlesRead`, `questions` and `cards` contain the three ids.
2. Sign in through the UI and open /course/playwright. - expect: `course-panel-cta` data-state `start`; `course-progress` data-value 0; the `full` chapter `course-step` for the first article is not `done`.
3. Open /course. - expect: The Playwright card `course-cta` data-state `start` and the count line stays (nothing started).

#### 7.2. @REQ-CRS-08 The same step inside the course counts and earns XP

**File:** `tests/e2e/course-progress.spec.ts`

**Steps:**

1. Fresh account; note `stats.totalXp` = 0. Open …/<full>/test in the UI and answer the first question correctly. - expect: `quiz-verdict` is correct and shows «+N XP»; `stats.totalXp` increased by N (read through the ApiClient).
2. Open /course/playwright. - expect: `course-panel-cta` data-state `continue`; `course-progress` unchanged (no chapter done yet); `course-reset` for key playwright is visible (only when started).

#### 7.3. @REQ-CRS-08 Reset dialog: cancel keeps the course, confirm clears only its record

**File:** `tests/e2e/course-progress.spec.ts`

**Steps:**

1. Arrange: `completeChapter(full)` for the Playwright course and a scoped answer in the API course (`api-cs` question); sign in; open /course/playwright; click `course-reset`. - expect: `course-reset-dialog` (role alertdialog) with data-key playwright is visible.
2. Click `course-reset-cancel`. - expect: The dialog closes, `course-reset` still visible, `course-progress` data-value still 1.
3. Click `course-reset`, then `course-reset-confirm`. - expect: The dialog closes, `course-reset` is gone, `course-progress` data-value 0, the chapter is `current` again, `course-panel-cta` is `start`.
4. Read progress through the ApiClient. - expect: `courses` has no `playwright` key but keeps `api`; global `questions`, `cards`, `articlesRead` and `stats.totalXp` are unchanged from before the reset.

#### 7.4. @REQ-CRS-08 After a reset the same answers earn no second XP (DROPPED, see Corrections: 8.5)

**File:** `tests/e2e/course-progress.spec.ts`

**Steps:**

1. Fresh account: scoped correct answer to a plain question, note `totalXp`; reset the course through the UI button; open …/test and answer the same first question correctly. - expect: The verdict is correct, `course-counter` 1 of N, and `stats.totalXp` equals the earlier value (no second first-correct XP), while `courses.playwright.questions` has the question again.

### 8. CRS-08 API tests

**Seed:** `tests/seed.spec.ts`

#### 8.1. @REQ-CRS-08 Scoped read, answer and rating write the course record and the global one

**File:** `tests/api/course-progress.spec.ts`

**Steps:**

1. Fresh account. Scoped `readArticle(first article of full, 'playwright')`, scoped correct `checkAnswer` of its first plain question, scoped `rateCard` rating 3 of its first card. Read progress. - expect: `courses.playwright.articlesRead[<id>]` and `cards[<id>]` are timestamps, `questions[<id>]` is `{lastResult:1, skipped:false}`; the same three ids are in the global `articlesRead`, `questions`, `cards`; `stats.totalXp` > 0 (fails if the scoped call writes only one of the two records).

#### 8.2. @REQ-CRS-08 Unscoped writes leave courses empty

**File:** `tests/api/course-progress.spec.ts`

**Steps:**

1. Fresh account: unscoped read, correct answer and rating of the same chapter. Read progress. - expect: `courses` deep-equals `{}`; global records exist.

#### 8.3. @REQ-CRS-08 A scoped skip is recorded as skipped

**File:** `tests/api/course-progress.spec.ts`

**Steps:**

1. Scoped `checkAnswer(q, null, token, undefined, 'playwright')`. - expect: Response outcome `skipped`; `courses.playwright.questions[q]` is `{lastResult:0, skipped:true}` and `stats.totalXp` is 0.

#### 8.4. @REQ-CRS-08 Reset clears only its course and keeps XP, streak, KB, quiz and Recall

**File:** `tests/api/course-progress.spec.ts`

**Steps:**

1. Fresh account with records in BOTH courses (a Playwright question/article/card scoped and an api-cs question scoped with course 'api') plus an unscoped read, answer and rating. Note totalXp, streak, global records. `resetCourse(token,'playwright')`. - expect: 204 with an empty body; `courses` has only `api` with its record intact; `stats.totalXp`, `stats.streak`, global `questions`, `cards`, `articlesRead` equal the values before (fails if reset wipes global data or the other course).
2. `resetCourse(token,'api')`, then `resetCourse(token,'api')` again. - expect: Both 204 (an empty or already reset course is not an error); `courses` is `{}`.

#### 8.5. @REQ-CRS-08 After a reset the same answer earns no second XP

**File:** `tests/api/course-progress.spec.ts`

**Steps:**

1. Scoped correct answer to question q, note `totalXp`; `resetCourse`; scoped correct answer to q again. - expect: Outcome `correct` both times; `totalXp` equals the value after the first answer; `courses.playwright.questions[q]` exists again (the record is rebuilt, XP is not).

#### 8.6. @REQ-CRS-08 Unknown course slug is rejected with 400 everywhere

**File:** `tests/api/course-progress.spec.ts`

**Steps:**

1. `resetCourse` with slugs `nope` and `Playwright` (case matters), body-less. - expect: 400 `bad_request`, message contains `Invalid option` and `playwright`|`api`; `courses` unchanged.
2. Scoped `checkAnswer`, `rateCard`, `readArticle` with `course: 'nope'` (valid ids otherwise). - expect: Each answers 400 `bad_request` with message starting `course:`; nothing is recorded: global `questions`, `cards`, `articlesRead` stay empty and `totalXp` stays 0 (fails if the global part is written before the slug check).

#### 8.7. @REQ-CRS-08 Reset without a token is 401

**File:** `tests/api/course-progress.spec.ts`

**Steps:**

1. POST /me/courses/playwright/reset with no Authorization header. - expect: 401; no account is touched.

#### 8.8. @REQ-CRS-08 A read inside the course still advances the READ_ARTICLE task

**File:** `tests/api/course-progress.spec.ts`

**Steps:**

1. Fresh account, `setDailyCount(token, 5)` (a fresh account then has a READ_ARTICLE task, see
   `tests/api/daily.spec.ts` `fullSet`). Take that task's `params.chapterId` and its first article (the engine picks the chapter from every topic, so it may lie outside the course; the server takes a scoped read of any article, A14). - expect: the task's progress is 0.
2. Scoped `readArticle(token, article, 'playwright')`. - expect: the task's progress equals its target and `xpLog` has one `daily_task` grant for it
   (fails if a scoped read stops counting for the daily tasks).
