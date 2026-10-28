# Phase 2: Quiz block

## Application Overview

Plan for quiz requirements not yet covered by tests/e2e/quiz.spec.ts and tests/api/quiz-check.spec.ts: QUIZ-09, 10, 12, 13, 14, 19. Explored live on http://localhost:4273/quiz/sql (uk UI, guest, desktop). Fixtures: quiz (QuizPage), api, user, authedPage. Test ids only from the app's docs/test-ids.md. Questions and answers always come from the ApiClient (api.questions, api.correctIndex), never hard-coded. Every scenario starts from a fresh state (fresh guest context or a new user fixture). Desktop project only (phones fold the miss list and have no keyboard).

## Prerequisites (for the generator, before the specs)

1. ApiClient.checkAnswer has no `first`: add an optional 4th argument `{ first?: boolean }` sent as `first` in the body (guest seeding for QUIZ-09).
2. CheckResult zod (src/api/schemas.ts) has no `stat`: add `stat: z.object({ answered: z.number(), pct: z.number() }).optional()`. Needed to read the pct from the API.
3. QuizPage locators to add (byTestId): quiz-feedback, quiz-stat, comments-open, quiz-finish, quiz-counts, quiz-result-scale (by key pass|fail|skipped), quiz-result-row, quiz-result-miss, quiz-redo, quiz-result-recall. `option(i)` today is by stored key; add `optionAt(position)` that returns the n-th quiz-option in DOM order (screen position), because the screen order is shuffled.
4. QuizPage helpers: `answerWrong(api)` (click the option whose data-key is not api.correctIndex, return the chosen key), `skipQuestion()` (click quiz-skip), `finishRun()` (click quiz-finish).
5. A helper to read the section counters of quiz-section (data-correct, data-wrong, data-skipped).
6. Chapter id per question comes from api.questions(section) (Question.chapterId). For QUIZ-14 recall: a way to know that a chapter has recall cards (an ApiClient method for recall cards by chapter; confirm the endpoint in the app, there is none in the client now). Without it, the scenario picks a chapter by trying questions until quiz-result-recall appears, which is not allowed in a test; so the method is required.
7. Second browser context for QUIZ-12: `browser.newContext()` plus the same init script as the `context` fixture, then login with page.request.post(apiURL + 'auth/login') as authedPage does. Factor that into a helper (a fixture `secondPage` or a function).

## Ambiguities (app vs requirement)

1. Checklist ids: the brief maps QUIZ-19 to QUIZ-043 and QUIZ-14 recall to QUIZ-037. In regression-checklist.md it is the other way round: QUIZ-037 = comments-open only after the check (QUIZ-19), QUIZ-043 = results screen incl. scales, miss list, redo and the Recall link (QUIZ-13, QUIZ-14). Tags in specs follow the COVERAGE ids (REQ-QUIZ-nn). QUIZ-043 also lists quiz_abandon analytics; not planned here.
2. QUIZ-09 threshold: checklist QUIZ-036 says "with at least 10 first answers ... under 5 absent". The app (QUESTION_STAT_MIN = 5 in packages/shared/src/api.ts, apps/api/src/routes/quiz.ts line 27) and test-ids.md say: shown from 5 first answers. Code wins; the 5..9 range in the checklist is undefined. The plan seeds with 5 and compares with the API, never a literal. The below-threshold case is not tested (decision of 2026-10-28: stats are global and cumulative in DB qahub_pw).
3. QUIZ-09 "as different guests": the API has no guest identity; for a guest the `first` flag is client-trusted (comment in quiz.ts line 58), so 5 posts with `first: true` and no token are enough.
4. QUIZ-09: the stat line is also shown after a skip (observed live: verdict skipped, quiz-stat value 100), because the server returns the aggregate for any check, only a skip does not count into it. It still appears only after the verdict, so the requirement holds.
5. Before the verdict the run shows quiz-skip and quiz-finish; quiz-next, quiz-feedback and comments-open are absent. After the verdict quiz-skip disappears and quiz-next appears. The old draft assumed quiz-next stays hidden and that quiz-skip stays; fixed.
6. QUIZ-10: digit N chooses the N-th option on screen (observed: key 2 chose the 2nd DOM option, data-key 0, not stored index 1). Digits above the number of options are ignored (code: Quiz.tsx line 1250). S, s and 0 skip; Enter works only after the verdict, and on the last question it opens the results. After the verdict digits/S do nothing. Keys are off while quiz-sheet is open.
7. QUIZ-13/14: quiz-result-row data-key is a chapter id but rows are per group, so the key is not unique (observed two rows with key sq-1: "Функції і вирази" and "Основи запитів"). The row sum of totals still equals N. test-ids.md says "row key = chapter id" without noting this.
8. QUIZ-14 "weakest chapter" has no tie rule in the docs. Observed on an all-skipped run: all chapters at 0%, quiz-result-recall pointed at sq-1 (first). The scenarios therefore build a run with a single losing chapter.
9. quiz-result-recall is absent when the weakest chapter has no recall cards (test-ids.md); so the scenario needs a chapter with cards (Prerequisite 6).
10. A run can be ended early with quiz-finish; the results then have N = answered questions, not the chosen 10. This keeps the scenarios short and N small. The progress counter for the redo run shows data-total = missed count (observed 8/8).
11. test-ids.md writes `t = N` for scales and progress; the real attribute is data-total (data-value for v).

## Test Scenarios

### 1. Quiz: feedback after the verdict

**Seed:** `tests/seed.spec.ts`

#### 1.1. The correct-answer share appears only after the verdict

**File:** `tests/e2e/quiz-feedback.spec.ts`

**Steps:**

1. Tag @REQ-QUIZ-09. Guest opens /quiz/<section> (section from the catalog) and starts a run (`quiz.startRun()`); read `quiz.currentQuestionId()`. Through the API post QUESTION_STAT_MIN (5, imported from one constant) checks of that question with `choice: 0, first: true` and no token.
   - expect: `quiz-feedback` and `quiz-stat` are absent while the question is unanswered
2. Answer in the UI (`quiz.answerCorrectly(api)`).
   - expect: `quiz-stat` is visible inside `quiz-feedback`
3. Read the aggregate again through the API: `api.checkAnswer(id, null).stat` (a skip does not change the aggregate).
   - expect: `quiz-stat` data-value equals `stat.pct` from the API and its text contains that number and `%`

#### 1.2. The comments button appears only after the verdict

**File:** `tests/e2e/quiz-feedback.spec.ts`

**Steps:**

1. Tag @REQ-QUIZ-19. Guest opens /quiz/<section>, starts a run and looks at the first question.
   - expect: `comments-open` is absent (count 0)
2. Answer the question (`quiz.answerCorrectly(api)`).
   - expect: `comments-open` is visible next to `quiz-next`
3. Compare its count with the API: `(await api.comments(questionId)).length` (id from `quiz.currentQuestionId()` taken before the answer).
   - expect: `comments-open` data-value equals the API total

### 2. Quiz: keyboard

**Seed:** `tests/seed.spec.ts`

#### 2.1. A digit key chooses the option at that screen position

**File:** `tests/e2e/quiz-keyboard.spec.ts`

**Steps:**

1. Tag @REQ-QUIZ-10. Guest starts a run. Read the data-key of `quiz.optionAt(2)` and the correct index `api.correctIndex(id)`. Press `2` with no option focused.
   - expect: `optionAt(2)` has aria-pressed=true and the other options are not pressed
   - expect: `quiz-verdict` data-state is `correct` when that option's data-key equals the API correct index, otherwise `wrong`
2. Press `Enter`.
   - expect: `quiz-progress` data-value grows from 1 to 2 and all options of the new question are `idle`

#### 2.2. S and 0 skip a question, Enter goes next only after the verdict

**File:** `tests/e2e/quiz-keyboard.spec.ts`

**Steps:**

1. Tag @REQ-QUIZ-10. Guest starts a run, presses `Enter` on the unanswered question.
   - expect: `quiz-progress` data-value stays 1 and `quiz-verdict` is absent
2. Press `s`.
   - expect: `quiz-verdict` data-state is `skipped`; exactly one option has data-state `correct` and it is the API correct index; `quiz-counts` data-skipped is 1
3. Press `Enter`, then `0`.
   - expect: `quiz-progress` data-value is 2 and the verdict is `skipped`; `quiz-counts` data-skipped is 2

### 3. Quiz: answers of a signed-in user live on the server

**Seed:** `tests/seed.spec.ts`

#### 3.1. A signed-in user's answers are seen from another device

**File:** `tests/e2e/quiz-account.spec.ts`

**Steps:**

1. Tag @REQ-QUIZ-12. `authedPage` (context A, new `user`) opens /quiz/<section>, starts a run and answers three questions: one correct, one wrong (`answerWrong`), one skipped, `goNext()` between them; then `quiz.finishRun()`.
   - expect: the three verdicts are `correct`, `wrong`, `skipped`
2. Open /quiz/<section> in context A again (reload).
   - expect: `quiz-section` of the section has data-correct=1, data-wrong=1, data-skipped=1
3. Open context B (second page, same user logged in through the API, no local state from A) and go to /quiz/<section>.
   - expect: `quiz-section` of the section in B has data-correct=1, data-wrong=1, data-skipped=1 (the same as A)

### 4. Quiz: results screen and redo

**Seed:** `tests/seed.spec.ts`

#### 4.1. The results show three scales, chapter rows and a miss list with both answers

**File:** `tests/e2e/quiz-results.spec.ts`

**Steps:**

1. Tag @REQ-QUIZ-13. Guest starts a run in a section and answers three questions: one correct, one wrong (remember the chosen data-key), one skipped; remember each id; click `quiz.finishRun()`.
   - expect: `results` visible, `quiz-progress` data-state is `finished`
2. Read the three `quiz-result-scale` (pass, fail, skipped).
   - expect: data-value is 1, 1, 1; each data-total is 3; the three values sum to the total
3. Read all `quiz-result-row`.
   - expect: the sum of data-total over the rows is 3 and the sum of data-value is 1
4. Read the `quiz-result-miss` items.
   - expect: exactly two items: one `fail` (key = wrong question id) and one `skipped` (key = skipped question id); the correct question is not listed
   - expect: the `fail` item text contains the chosen option text and the correct option text, both resolved via `api.questions(section)` (chosen key, `api.correctIndex`); the `skipped` item contains the correct option text

#### 4.2. "Повторити Fail і Skipped" restarts exactly the missed questions

**File:** `tests/e2e/quiz-results.spec.ts`

**Steps:**

1. Tag @REQ-QUIZ-14. Guest answers three questions (one correct, one wrong, one skipped), remembering the ids, and finishes the run.
   - expect: `quiz-redo` is enabled, data-value is 2
2. Click `quiz-redo`.
   - expect: `quiz-progress` data-total is 2, data-state `running`
3. Step through the redo run collecting `quiz.currentQuestionId()` (skip each question).
   - expect: the collected ids as a set equal the ids of the wrong and the skipped question; the correct one never appears

#### 4.3. The Recall link points to the weakest chapter

**File:** `tests/e2e/quiz-results.spec.ts`

**Steps:**

1. Tag @REQ-QUIZ-14. Pick through the API a question whose chapter has recall cards (Prerequisite 6). Guest answers only that question wrong (`answerWrong`) and finishes the run.
   - expect: `results` visible
2. Read `quiz-result-recall`.
   - expect: its data-key equals the chosen question's `chapterId`, data-value equals the chapter's card count from the API, and href ends with `/recall/ch/<chapterId>`
3. Click it.
   - expect: URL is `/recall/ch/<chapterId>`

## API tests (for tests/api, not UI)

1. **quiz-stat.spec.ts**, @REQ-QUIZ-09: a guest check without `first` does not change the aggregate (`stat.answered` before and after equal), and a check with `first: true` raises `stat.answered` by one (seed first to reach QUESTION_STAT_MIN so `stat` is present). Skipped checks never count even with `first: true`. A signed-in check ignores the client `first` (server decides). Relative comparisons only, never a literal percentage.
2. **quiz-progress.spec.ts**, @REQ-QUIZ-12 (server half): after `checkAnswer` with the user's token for a correct, a wrong and a skipped answer, GET me/progress contains the three answers (extend the Progress zod after reading the live response; the current schema drops them) and a repeated answer to the same question replaces, not adds (latest answer per question).

## Ideas (beyond the requirements, the user decides)

- QUIZ-10: a digit above the number of options is ignored; digits and `s` do nothing after the verdict; keys are off while quiz-sheet (topic switch) is open; `Enter` on the last question opens the results.
- QUIZ-19: Escape closes comments-sheet and focus returns to comments-open (the checklist QUIZ-037 row); comments-open appears also after a skip.
- QUIZ-12: answering a different question in context B and reloading A shows the sum; re-answering moves a counter between buckets (sum stays).
- QUIZ-13: row state is `weak` below 70% and `ok` otherwise; quiz-result-percent equals correct/N; on phones the list folds to 3 items with quiz-result-miss-more.
- QUIZ-14: with no misses quiz-redo is disabled (data-value 0) and quiz-result-recall is absent; the weakest-chapter tie rule.
- QUIZ-09: the below-threshold case (excluded by decision, see Ambiguities 2).
- QUIZ-043 tail: leaving an unfinished run sends quiz_abandon once.
