# Phase 2: onboarding (focus wizard, skip, dashboard tour)

## Application Overview

Onboarding of QA Interview Hub for a new visitor: GEN-11 (focus wizard, DASH-027), GEN-12 (focus-skip, DASH-028), GEN-14 (short dashboard and tour, DASH-020/021/022). GEN-10 (gate instead of shell) is already covered by tests/e2e/onboarding.spec.ts. All state is device-local (localStorage `qa-hub-focus`, `qa-hub-tour-v1`, `qa-hub-theme-v1`, `qa-hub-guest-v1`), the API has no endpoint for it. Every scenario uses `test.use({ visitor: 'new' })`, desktop project, guest, `uk` UI, blank browser, and goes to `/dash`. Tests go into tests/e2e/onboarding.spec.ts (describe 'first visit').

Exploration: every behaviour below was verified live on 2026-10-28 with tests/seed-new.spec.ts (gate visible on /dash), step by step, in three fresh contexts (manual path + tour; skip path + tour-skip; auto path + Escape). Nothing is left unverified except what the Ideas section lists. Timing note found live: after a click on a wizard option the step text/heading changes about 300 ms later, so every step check must be a web-first assertion (`expect(...).toHaveText`), never a read right after the click.

## Prerequisites

Missing page-object code (src/pages/dashboard-page.ts has only root, title, today, topics, goto):

1. New component `src/components/focus-wizard.ts` (class FocusWizard, fixture `focus`): locators `gate` (`focus-gate`), `setup` (`focus-setup`), `step` (`focus-step`), `heading` (the `h1` inside the gate), `next`, `back`, `save`, `skip`, `bar` (`focus-bar`), `summary` (`focus-summary`), `skipped` (`focus-skipped`), `total` (`focus-total`); methods `track(key: 'manual'|'auto'|'all')`, `stack(key)`, `level(key)`, `topic(id)`, `topics()` (all `focus-topic`), `lang(key)`, `theme(key: 'light'|'dark')`, using the existing `byTestId(parent, id, key)` from src/helpers/locators.ts (key = `data-key`). A method `passToTheme()` for the manual path (track manual, level, next, next) is worth it: scenarios 4 and 5 both need it.
2. New component `src/components/tour.ts` (class Tour, fixture `tour`): locators `overlay` (`tour`, `data-key` = first target), `pop` (`tour-pop`), `title`, `counter` (`tour-counter`, `data-value`, `data-total`), `next`, `skip`; method `walkToEnd()`: click `next` while its text is not "Готово", then click "Готово"; it reads `counter` `data-total`, no hard-coded step count.
3. DashboardPage additions: `ready` (`dash-ready`), `summaryQuiz`, `summaryRecall`, `leaderboard`, `chat`, `weak`, `quickstart` (`dash-quickstart`), `quickstartTrack` (`dash-quickstart-track`), `topicsLock` (`topics-lock`), `topicsLockCta`. The block list of DASH-020 can be one array `hiddenBlocks` in the page object.
4. Fixtures `focus` and `tour` in src/fixtures/index.ts.
5. Helper `readStorage(page, key)` (like readGuest in src/helpers/guest-storage.ts) for `qa-hub-focus` and `qa-hub-tour-v1`.
6. Theme: there is NO `theme-picker` inside the gate (it is in the top bar, so only after save). In the gate the theme is read from `<html data-theme="light|dark">` (`page.locator('html')`); no Shell change is needed.
7. Existing, reuse: `dashboard.goto()`, `dashboard.title/today/topics`, `shell.sidebar`, `shell.open('quiz'|'recall'|'kb'|'dash')`, `shell.expectActive`.

## Ambiguities (app vs requirement, source: live run unless noted)

1. "focus-next disabled until a choice is made": there is no `focus-next` on the track, level and language-less steps where a click advances at once (step 1 has `focus-skip`, no back, no next; level has back only). `focus-next` exists on the framework step (after `auto`), the topics step and the language step. It is disabled with no framework ticked and with 0 topics (both seen). On the language step it is always enabled (a language is preselected).
2. Step counts in the gate: manual path = 5 steps (track, level, topics, language, theme: "Крок N / 5"), auto path = 6 (track, framework, level, topics, language, theme: "Крок N / 6"). test-ids.md and the checklist say "4 steps (5 after auto)" plus a theme step "step 5 of 5": the first part counts the gate without the theme step, so the real figures are 5 and 6; the theme is "5 / 5" on manual and "6 / 6" on auto. The edit flow (`focus-setup-open`) has no theme step: 4 / 5.
3. `focus-setup` `data-state` after `auto` does not follow the shown number: framework step = `step-stack` (shown 2 / 6); manual path states are `step-1..step-5` and match the shown number, the theme step is `step-5`. Tests assert `focus-step` text, not the suffix.
4. Theme step: preselected theme is `dark` (`data-state="selected"`, `aria-checked="true"`); a click on `light` sets `<html data-theme="light">` and `qa-hub-theme-v1` = `light` at once, before `focus-save`. After save the top bar `theme-picker` has `data-value="light"` (its label names the theme it switches to). test-ids.md calls the other state `off`; seen: `data-state` is `selected|off`. The preselected value is read from the page, not hard-coded (the system theme may differ).
5. The saved JSON `qa-hub-focus` carries `stacks` only for `auto` (`{"track":"auto","stacks":["cypress","appium"],"level":"junior","topics":[...],"scope":"focus"}`); for manual it has no `stacks`. test-ids.md's JSON omits `stacks`. Summary for a single topic reads "Manual QA · Middle · 1 тем" (no plural form). Topic count and question count come from the catalog, tests read the number of ticked rows, never hard-code 9 or 11.
6. The topic preset follows the track and the level: manual+middle ticked manual, sql, api, network, logs (5); auto+junior+cypress+appium ticked cypress, typescript, manual, sql, api, patterns, cicd, network, logs, java, appium (11). Tests do not assert the preset names.
7. Short dashboard: after `save` with a focus, `dash-quickstart` shows without the track switch (`dash-quickstart-track` absent), after `skip` it shows with the track switch. Both have `topics` `data-state="locked"`, `topics-lock` (the skip case also has `topics-lock-cta`; the focus case not checked), and `dash-ready`, `dash-summary-quiz`, `dash-summary-recall`, `dash-leaderboard`, `dash-chat`, `today`, `weak` absent (count 0); `dash-title` stays. Matches DASH-020.
8. Tour arms on opening /recall (SPA click), /kb and /quiz (full page load); `qa-hub-tour-v1` becomes `{"stage":"armed","weakHint":false}` on that page. The next /dash shows the tour at once, with all hidden blocks present and `topics` `active`. Stage stays `armed` while the tour is open.
9. Tour for an empty guest has 3 steps: `today` "Щоденні завдання" (1 / 3), `dash-summary-quiz` "Твій прогрес" (2 / 3), `topics` "Усі теми" (3 / 3, `tour-next` "Готово", `tour-skip` present). No `weak` step although the `weak` element exists after unhide (it has no rows). The step count is still read from `data-total`.
10. End states: "Готово" gives `{"stage":"done","weakHint":false}`; `tour-skip` and Escape give `{"stage":"done","weakHint":true}`. Docs say only that stage = `done`; `weakHint` differs, tests assert stage only. test-ids.md says skipping drops the weak hint (DASH-024), consistent with `weakHint:true` meaning "hint already used", not verified (Ideas).
11. Escape ends the tour at step 2 as well as at step 1 (seen at step 2). The first-visit init script of `visitor: 'new'` sets no focus/tour keys, so reloads keep state.
12. Console shows 1 error and 1 warning on every load (also in the gate); not investigated, no scenario depends on it.

## API tests

None. Every requirement here is device-local UI state (localStorage); the API has no onboarding endpoint. `api.catalog()` already exists if the user wants `focus-total` compared with the catalog (Ideas).

## Ideas (beyond the requirements, the user decides)

1. GEN-13 (dashboard by focus, `focus-scope` "Мій фокус" / "Усі теми", `focus-others`, `dash-readiness`) belongs to phase 3, not planned. The bar already shows `focus-scope` after save.
2. Compare `focus-total` (topics × questions up to the level) with `api.catalog()`.
3. `focus-lang`: choosing EN in the gate switches to `/en/...` after `focus-save` (not run).
4. `focus-edit` after the wizard has no theme step; `focus-skip` while editing only closes (edit flow seen: 4 / 5 steps, `focus-setup-open`).
5. Untick a ticked `focus-stack` on the framework step and `focus-next` is disabled again (not run; scenario 1 covers the first part).
6. DASH-023 (any progress or stage done gives the full dashboard), DASH-024 (one-step weak hint "Зрозуміло"; meaning of `weakHint`), DASH-025 (offers wait while a tour step is open).
7. Phone and tablet: the tour popup is a bottom sheet on phones; the `desktop` project is enough now.
8. Tour arming via the SPA link vs a full page load behave the same (both seen); scenario 10 uses `shell.open` + `shell.open('dash')`.

## Test Scenarios

### 1. GEN-11 focus wizard (@REQ-GEN-11)

**Seed:** `tests/seed-new.spec.ts`

#### 1.1. 1. Framework step: next is disabled until a framework is ticked

**File:** `tests/e2e/onboarding.spec.ts`

**Steps:**

1. Open /dash as a new visitor; in focus-gate click focus-track auto - expect: focus-step reads 'Крок 2 / 6'; focus-stack options playwright, cypress, selenium, appium are visible; focus-next is disabled; no focus-stack has aria-checked true
2. Click focus-stack playwright - expect: It has aria-checked true; focus-next is enabled
3. Click focus-back - expect: Step 1 shows (focus-step 'Крок 1 / 6' (auto still chosen), focus-skip visible)

#### 1.2. 2. Topics step: next is disabled with no topics

**File:** `tests/e2e/onboarding.spec.ts`

**Steps:**

1. Open /dash; click focus-track manual, then focus-level junior - expect: focus-step reads 'Крок 3 / 5'; some focus-topic rows have data-state on; focus-next is enabled; focus-total data-value equals the number of 'on' rows
2. Click every focus-topic with data-state on - expect: focus-total data-value is 0; focus-next is disabled
3. Click one focus-topic - expect: focus-total data-value is 1; focus-next is enabled

#### 1.3. 3. Back returns one step and keeps the choice

**File:** `tests/e2e/onboarding.spec.ts`

**Steps:**

1. Open /dash; click focus-track manual, focus-level middle; on the topics step untick all and tick one focus-topic (sql); click focus-next - expect: Language step: focus-step 'Крок 4 / 5', focus-lang options, uk has data-state on
2. Click focus-back - expect: Topics step 'Крок 3 / 5'; exactly the one ticked focus-topic still has data-state on
3. Click focus-back twice more - expect: Level step 'Крок 2 / 5' (focus-level middle still aria-checked true), then the track step 'Крок 1 / 5' with no focus-back

#### 1.4. 4. The theme step applies the theme at once

**File:** `tests/e2e/onboarding.spec.ts`

**Steps:**

1. Open /dash; click focus-track manual, focus-level junior, focus-next (topics), focus-next (language) - expect: focus-step 'Крок 5 / 5', heading 'Яку сторону обираєш?'; focus-save visible, no focus-next; the selected focus-theme option (data-state selected) matches <html data-theme>
2. Click the focus-theme option that is not selected (read the key from the page) - expect: It gets data-state selected and aria-checked true; <html data-theme> equals its key at once, with the gate still open (no focus-save clicked)

#### 1.5. 5. Saving closes the gate and shows the shell with the focus bar

**File:** `tests/e2e/onboarding.spec.ts`

**Steps:**

1. Open /dash; click focus-track manual, focus-level junior; read focus-total data-value N; focus-next, focus-next, then click focus-save on the theme step - expect: focus-gate is gone; shell.sidebar and dashboard.root visible
2. Check focus-bar - expect: Visible, data-state focus, data-key manual, data-value junior; focus-summary data-value N and text 'Manual QA · Junior · N тем'
3. Reload - expect: No focus-gate; focus-bar still visible

#### 1.6. 6. Auto track: ticked frameworks go into the focus summary

**File:** `tests/e2e/onboarding.spec.ts`

**Steps:**

1. Open /dash; click focus-track auto; tick focus-stack cypress and appium; click focus-next - expect: Level step 'Крок 3 / 6'
2. Click focus-level junior; click focus-next on topics and on language; click focus-save on the theme step ('Крок 6 / 6') - expect: focus-gate gone, shell visible
3. Read focus-summary - expect: Text starts with 'Automation (Cypress, Appium) · Junior ·' and data-value equals the ticked topic count

### 2. GEN-12 skip (@REQ-GEN-12)

**Seed:** `tests/seed-new.spec.ts`

#### 2.1. 7. Skip closes the gate, shows the dashboard with the shell and the skipped line

**File:** `tests/e2e/onboarding.spec.ts`

**Steps:**

1. Open /dash - expect: focus-gate visible; focus-skip visible below the options
2. Click focus-skip - expect: focus-gate gone; shell.sidebar and dashboard.root visible; focus-skipped ('Показуємо всі теми.') with focus-setup-open visible; no focus-bar
3. Read localStorage qa-hub-focus - expect: The string 'skipped'

#### 2.2. 8. After a skip the wizard does not come back on reload

**File:** `tests/e2e/onboarding.spec.ts`

**Steps:**

1. Open /dash, click focus-skip, reload /dash - expect: No focus-gate; shell.sidebar visible; focus-skipped visible
2. Open the root page '/' - expect: No focus-gate; shell.sidebar visible; focus-skipped visible

### 3. GEN-14 short dashboard and tour (@REQ-GEN-14)

**Seed:** `tests/seed-new.spec.ts`

#### 3.1. 9. A new visitor's short dashboard hides the full blocks until first activity

**File:** `tests/e2e/onboarding.spec.ts`

**Steps:**

1. Open /dash and click focus-skip (precondition, not under test) - expect: Shell and dash-title visible
2. Check the blocks dash-ready, dash-summary-quiz, dash-summary-recall, dash-leaderboard, dash-chat, today, weak - expect: Every one has count 0
3. Check the kept blocks - expect: dash-quickstart visible; topics visible with data-state locked; topics-lock visible

#### 3.2. 10. Opening a /quiz, /recall or /kb page arms the tour on the next dashboard (one test per page)

**File:** `tests/e2e/onboarding.spec.ts`

**Steps:**

1. Open /dash, click focus-skip, then shell.open(quiz | recall | kb) - expect: That page is active (shell.expectActive)
2. shell.open('dash') - expect: tour is visible with data-key today; tour-pop has role dialog
3. Check the blocks - expect: today and dash-ready exist (count 1); topics data-state active

#### 3.3. 11. The tour runs through its steps to Готово

**File:** `tests/e2e/onboarding.spec.ts`

**Steps:**

1. Skip the wizard, open /quiz, open the dashboard - expect: tour data-key today; tour-counter data-value 1 and data-total T (3 for a fresh guest; read, not hard-coded); tour-next 'Далі'; tour-skip visible
2. Click tour-next once - expect: tour data-key dash-summary-quiz; tour-counter data-value 2
3. Click tour-next until its text is Готово (tour.walkToEnd) - expect: Last step: tour data-key topics, tour-counter data-value equals data-total
4. Click Готово - expect: tour gone; today, dash-ready visible

#### 3.4. 12. tour-skip ends the tour and a reload does not start it again

**File:** `tests/e2e/onboarding.spec.ts`

**Steps:**

1. Skip the wizard, open /kb, open the dashboard, click tour-skip on step 1 - expect: tour gone; today and dash-ready visible
2. Read qa-hub-tour-v1 - expect: JSON with stage done
3. Reload /dash - expect: No tour; today visible

#### 3.5. 13. Escape ends the tour and a reload does not start it again

**File:** `tests/e2e/onboarding.spec.ts`

**Steps:**

1. Skip the wizard, open /quiz, open the dashboard, click tour-next once, press Escape - expect: tour gone; today and dash-ready visible
2. Reload /dash - expect: No tour; today visible
