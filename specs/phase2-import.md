# Phase 2: Import of guest progress

## Application Overview

Import banner (`import-banner`) that offers to move guest progress (localStorage `qa-hub-guest-v1`) into an account right after sign-up; "Move" calls POST /me/import (apps/api/src/routes/me.ts, recompute in apps/api/src/progress/service.ts), the outcome is shown in `import-done`. Explored live on http://localhost:4273 (uk UI) with the real flow: one wrong guest answer -> sign-up -> banner "гостьовий режим (1 відповідей, 0 карток)" -> Move -> "Перенесено: 1 відповідей. +0 XP." -> guest key emptied, `qa-hub-guest-v1.imported` holds the old state -> backup copied back into `qa-hub-guest-v1` + reload -> banner again -> Move -> "Нового нічого: усе це вже є.". Requirements: PROG-12 (IMP-001), PROG-13 (IMP-002, IMP-004), PROG-14 (IMP-009). All UI scenarios start as a fresh guest in a fresh context (`visitor: returning` default) and sign up through the UI form with `newCredentials`. The split PROG-12 / 13 / 14 = banner / move + backup / repeat matches the app and the checklist; the one deviation (PROG-14 in the UI needs the guest data put back) is under Ambiguities.

## Key decision: how guest progress gets into localStorage

Recommendation: answer in the UI as a guest (existing `QuizPage.answerCorrectly(api)` / `answerWrong(api)`), do NOT pre-set `qa-hub-guest-v1`.

Reasons:

1. The guest store is an app-internal JSON (`v:1, guestId, timeZone, questions{lastResult, skipped, attempts, firstCorrectAt, lastXpDate}, cards, articlesRead, attempts, tallies, stats, daily, xpLog, cleared...`; GuestStore.load() silently falls back to an empty state if `v !== 1` or `guestId` is missing). A hand-written value couples the test to that shape and a typo makes the banner silently absent (a false red that looks like a product bug).
2. What the banner counts comes from `fromGuest(state)`; a real state is the only guarantee that the test covers what a real guest produces (daily tasks, tallies, xpLog are in the same blob; IMP-003 says daily-task XP must not be moved).
3. Answering is cheap: 1-2 answers (about 2-3 s) and the page object already exists. Answers are chosen through the ApiClient (`correctIndex`), never hard-coded.
4. A pre-set value is a good second tool for cases that are expensive in the UI (many cards, Recall cards, legacy `qa-hub-v1`, XP cap): see Ideas. For the repeat-import scenario the "pre-set" is the app's own backup key copied back, which is a real value, not a hand-written one.
   Pitfall found while exploring: a WRONG guest answer is imported with +0 XP, so every scenario that needs X > 0 must include at least one correct answer. Do not put the guest data in `context.addInitScript`: it would run on every navigation/reload and re-create the guest data after the import.

## Prerequisites (missing methods and locators, to add before generating specs)

1. `ApiClient.importProgress(token, payload): Promise<ImportResult>` for POST `me/import` (Bearer). Zod schema `ImportResult` in `src/api/schemas.ts`: `{ imported: {questions,cards,articles,attempts}, skipped: {...}, xpGained: number, levelUp: {from,to}|null }`. Payload type: `{ source: 'guest'|'legacy', questions: Record<id,{lastResult:0|1, attempts?}>, cards: {}, articlesRead: {}, attempts: {} }` (see packages/shared/src/import.schema.ts).
2. Component `ImportBanner` (`src/components/import-banner.ts`): `banner` = `import-banner`, `move` = `import-move`, `later`, `never`, `error` = `import-error`, `done` = `import-done`, `doneMessage` = `import-done-message`, `doneClose`. All ids are in test-ids.md "Import banner"; expose it as a `importBanner` fixture next to `dashboard`/`quiz`.
3. Helper `src/helpers/guest-storage.ts` (page.evaluate on localStorage): `readGuest(page)` -> parsed `qa-hub-guest-v1` or null; `readGuestBackup(page)` -> parsed `qa-hub-guest-v1.imported` or null; `restoreGuestFromBackup(page)` -> copies the backup value back into `qa-hub-guest-v1` (the caller reloads). Keys are documented in the app (guest-store.ts STORAGE_KEY / IMPORTED_BACKUP_KEY); add them to test-ids.md "localStorage keys" if absent.
4. Helper `guestAnswers(page, quiz, api, sectionId, { correct, wrong })` (in `src/helpers/` or a `QuizPage` method): opens `quiz.goto(sectionId)`, `startRun()`, answers `correct` questions with `answerCorrectly(api)` and `wrong` with `answerWrong(api)`, using `goNext()` between answers. `sectionId` comes from the `catalog` fixture (first section with enough questions), not a literal.
5. Helper `signUpAsGuestMovedFrom...` is NOT needed: reuse `auth.goto('register')` + `auth.register(newCredentials)` (as in tests/e2e/auth.spec.ts). Sign-up keeps the browser's localStorage, which is why the banner appears.
6. For the account token in UI tests: `api.login(newCredentials)` -> `accessToken` -> `api.progress(token)` (existing methods).

## Ambiguities (app vs requirement, with source)

1. PROG-14 in the UI. After a successful Move the banner disappears and the guest store is emptied (`GuestStore.clearAfterImport`, guest-store.ts), so a user can never click "Move" twice on the same data from the UI. "Nothing new" is reachable only if the same data returns to `qa-hub-guest-v1`, e.g. restored from the backup (what I did while exploring) or a second device/browser. Therefore: the UI scenario restores the backup key and proves the message; the strict "0 XP, all counts 0" proof is in API tests. Source: ImportBanner.tsx `run()`, guest-store.ts.
2. "Nothing new" message has no XP part. Uk text is `Нового нічого: усе це вже є.` (en: `Nothing new: it is all here already.`), it does NOT contain "+0 XP". The requirement "adds 0 XP" must be checked through `xp-total` / the API, not through the message. Source: i18n `importer.nothingNew`, ImportBanner.tsx `summarize()`.
3. "+X XP" format. Done message in uk: `Перенесено: <parts>. +<X> XP.` (with `, новий рівень N!` when the level rises). The requirement's wording "Moved" is the en text; the test runs in uk by default, so match with a regex such as `/\+(\d+) XP/`, not the whole sentence. Source: i18n `importer.done`.
4. Plural defect in uk: the banner and the done message print "1 відповідей" (no plural forms; en has `s(n,'answer','answers')`). Count assertions must match the NUMBERS only (`/\(2\D+, 0\D+\)/`), never the words. Worth reporting as a product bug (not asserted).
5. "Guest store is cleared" (IMP-004). The key `qa-hub-guest-v1` is NOT removed: it is replaced by an empty state with the same `guestId` and `timeZone`. Assert `questions`/`cards` are empty, not `null`. The backup contains the complete previous state (including `stats`, `daily`, `xpLog`), not only answers and cards.
6. X vs guest XP. Account XP equals the server-recomputed X (message `+X`), which may differ from the XP the guest saw (`xp-total` as guest includes daily-task and streak bonuses; IMP-003). Assert against the message and the API, never against the guest's XP.
7. "banner gone after reload" - in the app the banner (and the `import-done` card) disappear immediately after Move, and `import-done` is only local state, so the reload check proves that the guest store really was cleared. Source: ImportBanner.tsx `findImportSources` runs on the guest snapshot.
8. Banner is also driven by the legacy save `qa-hub-v1` (IMP-006) and by `qa-hub-import-dismissed:<owner>` (IMP-005); fresh test contexts have neither, so the scenarios are not affected.
9. A second Move overwrites the backup key with the (then empty or re-seeded) state; nothing keeps the first backup. Not a requirement, noted for IMP-004 readers.

## Scenarios (UI, `tests/e2e/import.spec.ts`)

### 1. Banner after sign-up offers the guest progress with its counts

Tag: `@REQ-PROG-12` (IMP-001). Seed: tests/seed.spec.ts. Fixtures: `page`, `api`, `catalog`, `quiz`, `auth`, `importBanner`, `newCredentials`.
Start state: fresh guest, empty localStorage (no `qa-hub-guest-v1`).

1. As a guest answer 2 questions of one section: 1 correct, 1 wrong (`guestAnswers`, ids from `catalog`, answers via `api.correctIndex`).
2. `auth.goto('register')`, `auth.register(newCredentials)` (stays in the same browser context).
3. Wait until the signed-in shell is shown (`shell.expectSignedIn`) and the dashboard has loaded.
   Expect: `import-banner` is visible; its text contains the counts `2` answers and `0` cards (regex on the numbers, e.g. `/\(2\D+, 0\D+\)/`), the source label is the guest one (uk "гостьовий режим"), `import-move`, `import-later`, `import-never` are enabled.
   Failure: no banner, or counts differ from what was answered (e.g. 0 or 1).

### 2. "Move" imports the guest progress, XP is recomputed by the server, a backup is kept

Tag: `@REQ-PROG-13` (IMP-002, IMP-004). Same fixtures plus `api` for the account token.
Start state: fresh guest.

1. As a guest answer 2 questions correctly (`guestAnswers`, `correct: 2`; correct answers are needed so X > 0); remember the answered question ids (`quiz.currentQuestionId()` per answer); sign up with `newCredentials`.
2. Click `import-move`.
   Expect: `import-done` is visible (`role=status`), `import-done-message` matches `/\+(\d+) XP/` with X > 0 (read X from the text); `import-banner` is gone.
3. Reload the page.
   Expect: `import-banner` and `import-done` are not present; `xp-total` `data-value` equals X; `api.progress(token).stats.totalXp` (token from `api.login(newCredentials)`) equals X and contains both answered question ids.
4. Read `localStorage` (`readGuestBackup`, `readGuest`).
   Expect: `qa-hub-guest-v1.imported` exists and its `questions` contain both ids; `qa-hub-guest-v1` has no questions and no cards (state emptied, key still present - see Ambiguities 5).
   Failure: X differs between message, `xp-total` and API; banner returns after reload; backup missing or empty; guest store still holds the answers (would be imported twice).

### 3. Importing the same data again reports "Nothing new" and adds no XP

Tag: `@REQ-PROG-14` (IMP-009). Same fixtures.
Start state: fresh guest.

1. As a guest answer 1 question correctly, sign up, click `import-move`, wait for `import-done` with X > 0; read `xp-total` (`data-value`) as `xpAfterFirst`.
2. `restoreGuestFromBackup(page)` and reload the page (the same data is again in the guest store; do not use `addInitScript`).
   Expect: `import-banner` is visible again and shows the same counts.
3. Click `import-move`.
   Expect: `import-done-message` shows the "nothing new" text (uk `Нового нічого`; check it contains no `+<n> XP`); after a reload `xp-total` `data-value` still equals `xpAfterFirst`, and `api.progress(token).stats.totalXp` equals `xpAfterFirst`.
   Failure: XP grows on the second import; the message reports "Перенесено".

## API tests (`tests/api/import.spec.ts`, no browser)

The import endpoint is `POST /me/import` (auth required, body `importPayloadSchema`, response `ImportResult`). XP recompute and "nothing new" are provable through the API alone, so the UI scenarios above are limited to what the user sees (banner text, status message, `xp-total`, localStorage backup). The app's own vitest `apps/api/test/import.test.ts` already covers these rules with fake clocks; the Playwright API tests below are thin black-box checks against the running stack. Data: ids from `api.questions(sectionId)` / `catalog`, never literals; a new account per test via the `user` fixture. Requires Prerequisite 1.

A1. `@REQ-PROG-13` - import recomputes XP on the server.

1. `api.importProgress(user.token, { source:'guest', questions:{ [idA]:{lastResult:1}, [idB]:{lastResult:0, attempts:2}, 'not-a-question':{lastResult:1} }, cards:{}, articlesRead:{}, attempts:{} })`.
   Expect: `imported.questions` = 2, `skipped.questions` = 1, `xpGained` > 0; `api.progress(token)`: `stats.totalXp` = `xpGained`, `questions[idA].lastResult` = 1, `questions[idB].lastResult` = 0 and `attempts` = 2, every `xpLog` entry has `reason` = `import`. (The wrong answer and the unknown id add no XP.)

A2. `@REQ-PROG-14` - the same payload again changes nothing.

1. Send the payload of A1 twice.
   Expect: second response `xpGained` = 0 and `imported` = all zeros (`questions`, `cards`, `articles`, `attempts`); `progress.stats.totalXp` after the second call equals the value after the first.

## Ideas (beyond the requirements, the user decides)

- IMP-003: guest daily-task XP is not moved (only item XP): a guest finishing a daily task, then Move, account XP = item XP only. Needs a deterministic daily task; expensive in the UI, better as an API test with the `runs` payload (see import.test.ts "advances today's tasks").
- IMP-005: "Later" hides the banner until the next page load; "Don't ask again" stores `qa-hub-import-dismissed:<userId>` and hides it only for that account (another account in the same browser still sees it).
- IMP-006: legacy `qa-hub-v1` is offered as "old version of the site" and left unchanged after the import; setting a hand-written `qa-hub-v1` value is the right tool here (pre-set value, via `page.evaluate` before the sign-up, not `addInitScript`).
- IMP-010: existing account progress wins over imported data for the same item (API: answer q wrong in the account, then import q as correct -> still wrong, `skipped.questions` counts it).
- IMP-011: guest quiz finished today (10+ answers, 80%+) then moved completes the dashboard task "test 10+ questions at 80%+".
- Guest Recall card in the banner count (`0 -> 1 карток`) and the XP for a rated card: needs a Recall page object (not in the repo yet).
- Import XP cap (`importXpCap`) over several imports; a payload with unknown section/article ids; negative API checks: 401 without a token, 400 for `lastResult: 2` or `rating: 9`.
- `import-error` (`role=alert`): force a failing POST /me/import (route.fulfill 500) and check the "Не вдалося перенести" text and that the guest store is NOT cleared and the buttons are enabled again.
- Banner on every page (test-ids.md: "all pages") - open /quiz and /profile after sign-up and check the banner.
- English UI: `test.use({ lang: 'en' })` and the exact texts `Moved: 2 answers, ... +X XP.` / `Nothing new: it is all here already.` (also fixes the uk plural defect, Ambiguities 4).
- Two tabs: Move in tab A, tab B must not offer the same data (guest store `reload()` on the storage event).

## Test Scenarios

### 1. Import of guest progress (UI)

**Seed:** `tests/seed.spec.ts`

#### 1.1. Banner after sign-up offers the guest progress with its counts

**File:** `tests/e2e/import.spec.ts`

**Steps:**

1. As a fresh guest answer 2 questions of one section (1 correct, 1 wrong) through the quiz UI - expect: Guest store holds 2 answers
2. Open /register and sign up with newCredentials - expect: User is signed in
3. Wait for the dashboard to load - expect: import-banner is visible with counts 2 answers and 0 cards - expect: import-move, import-later, import-never are enabled

#### 1.2. Move imports the guest progress, XP is server-recomputed, backup is kept

**File:** `tests/e2e/import.spec.ts`

**Steps:**

1. As a guest answer 2 questions correctly, then sign up with newCredentials - expect: import-banner is visible
2. Click import-move - expect: import-done shows '+X XP' with X > 0 - expect: import-banner is gone
3. Reload the page - expect: No import-banner - expect: xp-total equals X - expect: API progress totalXp equals X and holds both answers
4. Read localStorage - expect: qa-hub-guest-v1.imported holds both answers - expect: qa-hub-guest-v1 has no questions and no cards

#### 1.3. Importing the same data again reports Nothing new and adds no XP

**File:** `tests/e2e/import.spec.ts`

**Steps:**

1. As a guest answer 1 question correctly, sign up, click import-move, remember xp-total - expect: import-done shows +X XP with X > 0
2. Copy qa-hub-guest-v1.imported back into qa-hub-guest-v1 and reload - expect: import-banner is visible again
3. Click import-move - expect: import-done-message says nothing new and has no '+n XP' - expect: After reload xp-total and API totalXp equal the value after the first import

### 2. Import endpoint (API)

**Seed:** `tests/seed.spec.ts`

#### 2.1. POST /me/import recomputes XP on the server

**File:** `tests/api/import.spec.ts`

**Steps:**

1. Import a payload with one correct, one wrong and one unknown question id - expect: imported.questions = 2, skipped.questions = 1, xpGained > 0 - expect: progress.stats.totalXp = xpGained, xpLog reasons all 'import'

#### 2.2. POST /me/import with the same payload twice adds nothing

**File:** `tests/api/import.spec.ts`

**Steps:**

1. Send the same payload twice - expect: Second response xpGained = 0 and all imported counts = 0 - expect: totalXp unchanged after the second call
