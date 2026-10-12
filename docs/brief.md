# Brief: building a Playwright automation framework for QA Interview Hub

This file is input for an AI coding agent (Claude Code) that builds a **separate** Playwright +
TypeScript test framework for this app. It collects what the agent cannot guess from the outside:
URLs, routes, test hooks, auth mechanics, business rules, limits and pitfalls.

Source of truth in the app repo (`ryanchynskyi/qa-interview-tests`, branch `develop`):
`docs/test-ids.md` (full hook catalogue), `README.md` (API table), `e2e/` (the app's own
Playwright specs, good reference), `packages/shared/src/engine` (XP rules).

---

## 1. The system under test

A learning app for QA Engineer interviews: quizzes, Active Recall cards, a Knowledge Base, XP and
levels, daily tasks, streaks, achievements, a leaderboard and a public chat. Works for guests
(progress in localStorage) and signed-in users (progress on the server).

| Part     | Tech                                        | Production                                         |
| -------- | ------------------------------------------- | -------------------------------------------------- |
| Web      | React 19 SPA, Vite, **hash routes** (`#/…`) | https://ryanchynskyi.github.io/qa-interview-tests/ |
| API      | Fastify 5 + Prisma 6, PostgreSQL            | https://qa-hub-api.onrender.com (Render free plan) |
| Database | PostgreSQL (Neon free in prod)              | —                                                  |

- UI language: **Ukrainian by default**, English via the UA/EN switch. Content (questions, cards,
  articles) is translated too.
- Dark-only "IDE-like" design. Responsive: phone ≤720px (top bar + bottom tab bar + "Ще"/More
  sheet), tablet 721–1023px (sidebar as an icon rail), desktop ≥1024px (full sidebar).
- Production web and API are on **different sites** (github.io vs onrender.com): the refresh
  cookie is `SameSite=None; Secure; Partitioned`.
- The prod API **sleeps after 15 idle minutes**; the first request then takes ~1 minute. The web
  shows a cold-start screen (`data-testid=cold-start`, `data-state=waiting|slow`).

## 2. Environments to target

| Env             | Web                    | API                                | Notes                                                               |
| --------------- | ---------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| Local e2e stack | http://localhost:4273  | http://127.0.0.1:3200 (via `/api`) | **Default target.** Own ports and DB, no rate limits, fake Google   |
| Local dev       | http://localhost:5173  | http://127.0.0.1:3000 (via `/api`) | Real rate limits (for rate-limit checks only); Google if configured |
| Production      | GitHub Pages URL above | https://qa-hub-api.onrender.com    | Opt-in, `@prod-safe` smoke only; see "Rules for production" below   |

Locally the web app talks to the API through the same-origin `/api` proxy, so API calls from
tests can use `<webBaseURL>/api/...` or the API port directly. In production the web calls the
onrender.com URL directly (`VITE_API_URL`).

The e2e API server (`apps/api/scripts/e2e-server.ts` in the app repo) **disables rate limits**,
replaces Google with a fake consent page served from the same origin, and makes
`admin@example.test` an admin (it must sign in via the fake Google to be "verified"). How to run
it for this framework: §2.1.

Make the base URLs configurable via env (`BASE_URL`, `API_URL`) with `local` and `prod` profiles.

### 2.1 Local-only setup (the default target)

The framework must never write to production data by accident. Everything runs against a local
copy of the app with its own database; production is an explicit opt-in for a read-only smoke
subset.

**Isolation.** Use ports and a database of your own, so this framework, the Cypress framework
and the app's own e2e suite (3100/4173, `qahub_e2e`) can all run at once:

| Framework             | API port | Web port | Database       | Build dir     |
| --------------------- | -------- | -------- | -------------- | ------------- |
| App's own e2e         | 3100     | 4173     | `qahub_e2e`    | `dist`        |
| **Playwright (this)** | **3200** | **4273** | **`qahub_pw`** | **`dist-pw`** |
| Cypress               | 3300     | 4373     | `qahub_cy`     | `dist-cy`     |

All databases live in one Postgres: the app's embedded server on `localhost:5433`
(user/password `postgres`/`postgres`, Postgres 17), locally; a `postgres:17` service in CI.

**Stack script** `scripts/stack.mjs` in the framework repo (plain Node, no shell tricks, works on
Windows). Input: env `APP_DIR` (path to a clone of the app repo, after `npm ci` there). Steps:

1. **Database server.** If nothing listens on `localhost:5433`, start the embedded Postgres:
   `node --import tsx scripts/dev-db.ts` with `cwd = APP_DIR/apps/api` (keeps running; data in
   `apps/api/.pgdata`). Skip this with `--no-db` or when `DB_URL` points elsewhere (CI).
2. **Reset (flag `--reset`, used before a full run).** Drop the framework's database so the run
   starts empty (empty leaderboard and chat):
   `npx prisma db execute --url postgresql://postgres:postgres@localhost:5433/postgres --stdin`
   with `cwd = APP_DIR/apps/api` and stdin `DROP DATABASE IF EXISTS "qahub_pw" WITH (FORCE);`.
   The e2e server recreates, migrates and seeds it on start.
3. **Web build** (once per app version): `cwd = APP_DIR/apps/web`,
   `node ../../node_modules/vite/bin/vite.js build --outDir dist-pw` with env `VITE_E2E_HOOKS=1`
   (build-time flag for the feedback-form test hook). Skip it if `dist-pw` is newer than the
   app's last commit, or with `--no-build`.
4. **API:** `cwd = APP_DIR/apps/api`, `node --import tsx scripts/e2e-server.ts` with env
   `E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/qahub_pw`, `PORT=3200`,
   `WEB_ORIGIN=http://localhost:4273`. It migrates and seeds the database, disables rate limits,
   serves the fake Google page and makes `admin@example.test` an admin.
5. **Web:** `cwd = APP_DIR/apps/web`,
   `node ../../node_modules/vite/bin/vite.js preview --port 4273 --strictPort --outDir dist-pw`
   with env `API_PROXY_TARGET=http://127.0.0.1:3200` (the `/api` proxy).
6. **Wait** for `http://127.0.0.1:3200/health` and `http://localhost:4273` (timeout 180 s), print
   the URLs, keep running. On Ctrl+C/SIGTERM kill the children; on Windows use
   `taskkill /pid <pid> /T /F`, since child processes otherwise survive and keep ports and
   Prisma's DLL locked.

Start every server as a single `node` process (as above), not through `npm run`, for the same
Windows reason. Do not run `npm install` or Prisma commands in `APP_DIR` while the API is up
(EPERM on Prisma's query engine DLL).

**Hook it into Playwright:**

```ts
webServer: {
  command: 'node scripts/stack.mjs',
  url: 'http://localhost:4273',
  reuseExistingServer: !process.env.CI,
  timeout: 300_000,
},
```

Add npm scripts `test` (local, default), `test:reset` (`--reset` first), and `stack` (start it by
hand for UI-mode debugging).

**Guard against production.** `playwright.config.ts` resolves `TARGET` (default `local`). Any
`BASE_URL`/`API_URL` whose host is not `localhost`/`127.0.0.1` throws unless `TARGET=prod`; with
`TARGET=prod` the config forces `grep: /@prod-safe/` and drops `webServer`. So a mistyped env var
can never send the full suite to production.

**CI (GitHub Actions).** The app repo is **private**, so the framework workflow needs a token to
check it out:

- Secret `APP_REPO_TOKEN`: a fine-grained personal access token for
  `ryanchynskyi/qa-interview-tests` with **Contents: read** only.
- Steps: checkout the framework; `actions/checkout@v4` with
  `repository: ryanchynskyi/qa-interview-tests`, `ref: main` (what is in production; `develop`
  for early warnings), `path: app`, `token: ${{ secrets.APP_REPO_TOKEN }}`; `npm ci` in `app` and
  in the framework; `npx playwright install --with-deps chromium`; run with `APP_DIR=app`,
  `--no-db` and `DB_URL=postgresql://postgres:postgres@localhost:5432/qahub_pw` against a
  `postgres:17` service (see the app's `.github/workflows/ci.yml` for the service block).
- Upload the HTML report and traces as artifacts. A separate, manually triggered or scheduled
  job may run `TARGET=prod` (smoke only, no secrets beyond the dedicated test account).
- Without the token (e.g. a fork), CI can only run the prod smoke; the full suite stays local.

## 3. Rules for production (do not break them)

- **Analytics opt-out** before every page load: `localStorage['umami.disabled'] = '1'`
  (Umami is also off under `navigator.webdriver`, but set it anyway).
- **Rate limits are real in prod** (per client IP, per minute): register/login/Google
  exchange/import/password/delete **10**, `/auth/refresh` 60, `/quiz/check` 120, leaderboard 60,
  chat read 120, chat post max(20, 10)/min and **5 messages per 30 s**, feedback 10, admin 30.
  429 → `{ error: 'rate_limited' }`. Do not create accounts per test in prod; reuse one or two
  dedicated test accounts (credentials from env/secrets, never committed).
- **Never post to the chat** in prod (public, real users), never submit the feedback form, never
  touch the leaderboard on purpose. Delete any account you create (`DELETE /me`).
- Google sign-in cannot be automated in prod (real Google). Test it only locally (fake Google).
- Account for cold start: a global setup that hits `GET /health` until 200 (timeout ~120 s)
  before the suite starts.
- Prefer read-only smoke in prod: page loads, navigation, guest quiz flow, KB search, language
  switch, leaderboard visible, health endpoint.

## 4. Routes (hash router)

`page.goto('/#/quiz/sql')` (with a baseURL that ends in `/qa-interview-tests/` in prod; mind
the trailing slash and use relative `./#/…` or build URLs explicitly).

| Route                                       | View                                                                                    |
| ------------------------------------------- | --------------------------------------------------------------------------------------- |
| `#/` → redirects to `#/dash`                | Dashboard                                                                               |
| `#/quiz/:sectionId?`                        | Quiz (setup → run → results)                                                            |
| `#/recall/:a?/:b?`                          | Recall: `#/recall/all`, `#/recall/due`, `#/recall/<topicId>`, `#/recall/ch/<chapterId>` |
| `#/kb/:topicId?/:chapterId?/:articleIndex?` | Knowledge Base; `#/kb/sql` redirects to its first chapter                               |
| `#/login`, `#/register` (`?next=<path>`)    | Auth; `?error=google_cancelled` shows a message                                         |
| `#/auth/google`                             | OAuth return (transient)                                                                |
| `#/import`                                  | Paste a legacy backup                                                                   |
| `#/profile`                                 | Profile, settings, achievements, XP chart                                               |
| `#/tutorial`                                | Tutorial                                                                                |
| `#/leaderboard` (`?period=week`)            | Leaderboard                                                                             |
| `#/chat`                                    | Public chat                                                                             |
| `#/admin`                                   | Admin stats (owner only, no link)                                                       |
| `/privacy.html`                             | Static privacy page                                                                     |

Content ids (stable, language-independent):

- Topics (13): `playwright`, `cypress`, `typescript`, `manual`, `sql`, `api`, `sysdesign`,
  `patterns`, `cicd`, `product`, `ai`, `network`, `logs`.
- Quiz sections (15): the topic ids plus `pwfix` (Playwright code review, topic `playwright`)
  and `tsfix` (TypeScript code review, topic `typescript`).
- Volumes (today; they change with content edits, do not hard-code exact numbers in assertions,
  or read them from `GET /content/catalog`): 112 chapters, 673 questions, 247 recall cards,
  495 articles. Question levels: `junior | middle | senior`.
- Question/card ids are 6-char hashes (e.g. `n4h8c0`); chapter ids look like `pw-arch`; article
  ids are `<chapterId>:<index>`.

## 5. Locator strategy: `data-testid` hooks

Read `docs/test-ids.md` in full; it lists every hook per page. Key rules:

1. Use `page.getByTestId(...)` (Playwright's default attribute is `data-testid`). **Never rely on
   visible text** for structure: the UI is bilingual. Text assertions are fine only where the
   test pins the language and checks copy on purpose.
2. Repeated items share one test id and carry identity in `data-key`:
   `page.locator('[data-testid=quiz-section][data-key=sql]')`. Build a helper
   `byTestId(id, key?)`.
3. State: ARIA first (`aria-selected`, `aria-pressed`, `aria-expanded`, `aria-current="page"`,
   `aria-invalid`, `disabled`, `role=alert|status|dialog`), else `data-state`.
4. Numbers: read `data-value` (and `data-total`), never parse text.
   `Number(await el.getAttribute('data-value'))`.
5. Some legacy CSS hooks are also stable and used by the app's own e2e: `.opt` (quiz option),
   `.verdict`, `.xpgain`, `details.art` (KB article).
6. Hooks are never renamed; `e2e/testids.spec.ts` in the app repo guards the key ones.

Most useful hooks by area (see the catalogue for the rest):

- **Shell:** `topbar`, `sidebar` (≥721px only), `tabbar` (≤720px only), `nav-dash|quiz|recall|kb`
  (`aria-current`), `nav-leaderboard`, `nav-chat`, `nav-tutorial`, `nav-profile`, `nav-logout`,
  `nav-more` + `more-sheet` (phones), `breadcrumb` (not on phones), `level` (v = level; hover on
  desktop / click on phones shows the tooltip), `xp-total` (v = total XP, visible only in the
  tooltip, but `data-value` is readable while hidden), `streak` (v = days), `lang-switch-topbar` /
  `lang-switch-footer` + `lang-option[data-key=uk|en]`, `account-guest`, `account` (signed in,
  text contains the email), `toasts`, `toast` (`data-state=xp|level`, gone after 4 s),
  `loading`, `load-error`, `route-error`, `cold-start`.
- **Dashboard:** `dash`, `dash-cta`, `today` (v done, t total), `task` (key `<date>:<slot>`,
  `data-type`, state `pending|running|done`), `task-progress`, `task-start`, `weak`,
  `weak-chapter`, `topics`, `skill-<topicId>` (state `tested|untested`, select all with
  `[data-testid^=skill-]`), `topic-badge`.
- **Quiz:** `quiz-section` (tab, key section id), `quiz-level`, `quiz-count` (key `10|20|all`),
  `quiz-start` (v = questions), `question` (key question id), `quiz-option` (key = index in the
  stored list, **state `idle` until the server verdict**, then `correct|wrong`), `quiz-verdict`
  (state `correct|wrong|skipped`), `quiz-xp-gain`, `quiz-skip`, `quiz-next`, `quiz-finish`,
  `quiz-progress` (v n, t N, state `running|finished`), `results`, `quiz-result-percent`,
  `quiz-result-bonus`, `quiz-result-row`, `quiz-redo`, `quiz-again`, `quiz-wipe` (two clicks:
  state `armed` then reset).
- **Recall:** `recall-topic` (key `all|due|<topicId>`), `recall-count`, `recall-start`,
  `recall-card` (state `front|back`), `recall-reveal`, `recall-rate` (key `1`..`5`),
  `recall-done`, `recall-avg`, `recall-xp-gain`.
- **KB:** `kb-sidebar`, `kb-chapter-link`, `kb-chapter-select` (phones, `selectOption(id)`),
  `kb-search` (results after 2+ chars, 250 ms debounce), `search-results` (v hits, max 40),
  `search-hit`, `search-empty`, `chapter`, `kb-article` (state `open|closed`; opening counts as
  read, +XP once), `kb-toggle-all` (does **not** count as reading), `kb-prev`, `kb-next`.
- **Auth:** `auth` (key `login|register`), `auth-name`, `auth-email`, `auth-password`,
  `auth-remember` (state `on|off`, checked by default), `auth-submit`, `auth-error` (key = API
  error code), `google-signin` (only if Google is configured).
- **Profile:** `profile` (state `user|guest`), `profile-level`, `profile-xp`, `profile-streak`,
  `profile-daily-option` (key `3|4|5`), `achievement` (key id, state `unlocked|locked`),
  `profile-name-*`, `profile-zone`, `profile-leaderboard-toggle`, `profile-password-*`,
  `profile-delete-confirm` + `profile-delete`, `xp-chart*`.
- **Leaderboard:** `leaderboard` (state `all|week`), `leaderboard-period`, `leaderboard-row`
  (key rank, v XP), `leaderboard-me` (state `top|outside|unranked`).
- **Chat:** `chat` (state `loading|ready`), `chat-feed`, `chat-message` (state
  `mine|other|deleted`), `chat-input`, `chat-send`, `chat-anonymous`, `chat-delete` (two clicks),
  `chat-guest-cta`, `chat-banned`.
- **Overlays that can cover the UI:** `tutorial-offer` (see §7), `feedback-form`,
  `import-banner`.

## 6. Browser state: localStorage keys

| Key                               | Meaning / how tests use it                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `qa-hub-lang`                     | `'uk'` (default) or `'en'`. Pin it in `addInitScript` before load. Never auto-detected |
| `qa-hub-guest-v1`                 | Guest progress (JSON). Empty context = fresh guest                                     |
| `qa-hub-tutorial-offer`           | Set to `'dismissed'` to suppress the tutorial offer sheet                              |
| `umami.disabled`                  | `'1'` disables analytics                                                               |
| `qa-hub-rt`                       | Refresh token kept by "remember me" (43-char base64url); rotated on every refresh      |
| `qa-hub-v1`                       | Legacy (old site) save; read-only for the app, used by the import flow                 |
| `qa-hub-guest-v1.imported`        | Backup of guest progress after it was moved into an account                            |
| `qa-hub-e2e-feedback-after-ms`    | **e2e builds only** (`VITE_E2E_HOOKS=1`): shortens the 20-min feedback threshold (ms)  |
| sessionStorage `qa-hub-active-v1` | Activity timer for the feedback form                                                   |

A base fixture should, via `addInitScript` (runs before app code on every navigation):
`umami.disabled=1`, `qa-hub-tutorial-offer=dismissed`, and `qa-hub-lang` from a test option
(default `uk`). Also pin `timezoneId: 'Europe/Kyiv'` and `locale: 'uk-UA'` in the config, because
daily tasks reset at the user's local midnight.

## 7. Auth and sessions (how to log in from tests)

- `POST /auth/register` `{ email, password (8..128), displayName? (1..60), timeZone, remember? }`
  → **201** `{ accessToken, user, refreshToken? }` and sets cookie **`qa_rt`** (httpOnly,
  path `/`). `409 email_taken` for a duplicate.
- `POST /auth/login` `{ email, password, remember? }` → 200 same shape; `401 invalid_credentials`
  (UI shows "Невірний email або пароль.").
- Access token: JWT HS256, **15 minutes, kept only in memory** by the web app. Every page load
  restores the session by `POST /auth/refresh` (cookie `qa_rt`, or body `{ refreshToken }` from
  `qa-hub-rt` when the cookie is missing; the cookie wins).
- **Refresh tokens rotate on every use.** Reusing an already-rotated token more than 30 s later
  **revokes the whole session family** (theft detection). Consequence for the framework:
  **do not share one saved `storageState` across many tests/workers** for long; the first test's
  page load rotates the token and later tests replaying the old one get logged out (and kill the
  session). Options, in order of preference:
  1. Locally: per test (or per worker with fresh state) create a user via the API
     (`uniqueEmail()` like `e2e-<uuid8>@example.test`) and log in through the UI or API.
  2. API login inside the test's own browser context: `page.request.post()` to
     `<api>/auth/login` with `{ …, remember: true }`, so the `qa_rt` cookie lands in that context,
     then `page.goto`. Locally (same origin via `/api` proxy) this is straightforward.
  3. "Remember me" path: log in via API with `remember: true`, take `refreshToken` from the body,
     and `addInitScript(() => localStorage.setItem('qa-hub-rt', token))` in a fresh context
     (one token per context, never reused).
- Without "remember me" the cookie is a session cookie (no Max-Age); with it, 30 days. Clearing
  cookies + reload ends a non-remembered session (the app's `remember.spec.ts` shows both cases).
- `POST /auth/logout` revokes the token, clears the cookie and `qa-hub-rt`.
- In production cross-site mode the `qa_rt` cookie is **Partitioned** under the github.io top
  level site; Playwright storage state handling of partitioned cookies is version-dependent.
  For prod, log in through the UI per test or use option 3.
- **CSRF/Origin check:** a write request whose `Origin` header differs from the configured web
  origin gets `403 bad_origin`. Requests **without** Origin (Playwright `request` fixture, curl)
  pass. Do not set a custom Origin in API tests.
- Google (local only): `google-signin` → page titled "Fake Google" with fields
  "Email", "Name" and buttons "Continue" / "Cancel"; Continue lands on `?next` (e.g. `#/profile`),
  Cancel → `#/login?error=google_cancelled`. `GET /auth/providers` says whether Google is on.
- Admin (local e2e): sign in with fake Google as `admin@example.test`, open `#/admin`.
  Others get `admin-forbidden` (403), guests `admin-signin`.
- Account cleanup: `DELETE /me` with `{ confirmEmail }` (UI: `profile-delete-confirm` +
  `profile-delete`); `400 confirm_mismatch` if it differs.

## 8. API reference for API tests and test-data setup

All JSON. Errors: `{ error: '<code>', message }`; zod validation failures are 400. Known codes:
`bad_request, cannot_ban_admin, confirm_mismatch (400); unauthorized, invalid_credentials,
google_code_invalid, google_exchange_failed, google_invalid_token (401); bad_origin, forbidden,
chat_banned, google_email_unverified (403); not_found, google_disabled (404); email_taken,
already_finished, not_answered (409); rate_limited, tz_cooldown (429)`.

| Method & path                                                             | Auth   | Notes                                                                                                                                                                                                     |
| ------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                                                             | –      | DB check + content counts; use for readiness/cold start                                                                                                                                                   |
| `GET /content/catalog?lang=`                                              | –      | Topics, sections, chapters, question/card index (no text). Source of ids for data-driven tests                                                                                                            |
| `GET /sections/:id/questions?lang=`                                       | –      | Questions **without** correct index/explanation (assert that!)                                                                                                                                            |
| `POST /quiz/check`                                                        | opt.   | `{ questionId, choice: 0..9 \| null, lang? }` → `{ outcome: correct\|wrong\|skipped, correctIndex, explanation, progress? }`; `progress` only when authenticated; 404 unknown id; 400 choice out of range |
| `GET /recall/cards?lang=`                                                 | –      | Cards with model answers                                                                                                                                                                                  |
| `GET /kb/chapters/:id?lang=`                                              | –      | Chapter with article HTML                                                                                                                                                                                 |
| `GET /kb/search?q=&limit=&lang=`                                          | –      | `q` 2..100 chars, limit ≤50 (default 40); all words must match, title hits first                                                                                                                          |
| `GET /leaderboard?period=all\|week`                                       | opt.   | Top 50: rank, name or null, level, XP; with a token also `me`. **Never ids/emails** (assert)                                                                                                              |
| `POST /auth/register\|login\|refresh\|logout`                             | –      | See §7                                                                                                                                                                                                    |
| `GET /auth/me`, `GET /auth/providers`                                     | B / –  |                                                                                                                                                                                                           |
| `GET /auth/google`, `/auth/google/callback`, `POST /auth/google/exchange` | –      | PKCE flow; callback redirects to `#/auth/google?code=…` (one-time, 2 min)                                                                                                                                 |
| `PATCH /me`                                                               | Bearer | `{ displayName?, timeZone?, showOnLeaderboard? }`; time zone once a day (`429 tz_cooldown`)                                                                                                               |
| `DELETE /me`                                                              | Bearer | `{ confirmEmail }`                                                                                                                                                                                        |
| `GET /me/account`, `POST /me/password`                                    | Bearer | password `{ newPassword, currentPassword? }`                                                                                                                                                              |
| `GET /me/progress`                                                        | Bearer | Everything the UI needs; creates today's tasks on a new local day                                                                                                                                         |
| `GET /me/xp-history`                                                      | Bearer | XP per day for the chart                                                                                                                                                                                  |
| `PUT /me/daily-count`                                                     | Bearer | `{ count: 3..5 }`                                                                                                                                                                                         |
| `POST /me/quiz/finish`                                                    | Bearer | `{ sectionId, questionIds[1..200] }`; correctness from stored answers; 6-h window; `409 already_finished`/`not_answered`                                                                                  |
| `POST /me/recall/rate`                                                    | Bearer | `{ cardId, rating: 1..5 }`                                                                                                                                                                                |
| `POST /me/articles/:id/read`                                              | Bearer | First read gives XP once                                                                                                                                                                                  |
| `POST /me/sections/:id/reset`                                             | Bearer | Wipes a section's progress (XP stays)                                                                                                                                                                     |
| `POST /me/import`                                                         | Bearer | Idempotent; XP recomputed server-side                                                                                                                                                                     |
| `GET /me/feedback`, `POST /me/feedback`, `POST /me/feedback/dismiss`      | Bearer | `pending\|submitted\|dismissed`; `{ rating 1..5, text ≤1000 }`; first write wins                                                                                                                          |
| `GET /chat/messages?after=&since=` / `?before=`                           | –      | Last 50; never author ids                                                                                                                                                                                 |
| `POST /chat/messages`, `DELETE /chat/messages/:id`                        | Bearer | `{ text 1..500, anonymous }`; 5 per 30 s; 403 `chat_banned`                                                                                                                                               |
| `GET /admin/stats\|feedback\|chat/bans`, `POST /admin/chat/ban\|unban`    | Admin  | 403 for others                                                                                                                                                                                            |

Content endpoints and `/quiz/check` accept `lang=en`; unknown values mean `uk`.

## 9. Business rules worth testing

XP (`packages/shared/src/engine/xp.ts`), identical for guests and accounts:

| Event                                       | XP                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| First correct answer to a question          | junior 5 / middle 10 / senior 15                                                                       |
| Same question correct again                 | 1, at most once per question per local day                                                             |
| Recall card rated when due                  | 3; rating 4–5 → 5                                                                                      |
| KB article first opened                     | 2 (once per article)                                                                                   |
| Quiz bonus (≥10 answered and ≥80 % correct) | 20                                                                                                     |
| Daily task completed                        | 20–40 by type (ANSWER_N 30, ACCURACY 40, REVIEW_DUE 30, READ_ARTICLE 20, CODE_REVIEW 35, WEAK_SPOT 40) |
| All daily tasks done                        | 50                                                                                                     |
| Streak grows                                | 10 × min(streak, 7)                                                                                    |

Because daily tasks may also complete during a test, assert XP **deltas with care**: the app's
own specs use `toBeGreaterThanOrEqual` for article reads and compare the sum of shown
`quiz-xp-gain` values with the change in `xp-total`.

Levels: level 1→2 needs 100 XP; `xpToNext(level) = round(100 × level^1.4)`. Titles: 1 Trainee,
3 Junior QA, 7 Middle QA, 13 Senior QA, 20 Lead QA, 30 QA Architect.

Other rules:

- Daily tasks: 3 by default, user picks 3/4/5; reset at **local midnight** of the user's time
  zone; the count change applies today only if today's set is untouched, else from tomorrow
  (`profile-daily-pending`).
- Quiz: no separate "check" button: clicking an option _is_ the check; options stay
  `data-state=idle` until the server answers. **Security test:** before the verdict, no option has
  `data-state=correct`, and `GET /sections/:id/questions` has no `correctIndex`/`explanation`.
- Option order on screen is shuffled; `data-key` is the stored index. To answer correctly on
  purpose, call `POST /quiz/check` via API to learn `correctIndex` for a question id
  (unauthenticated calls record nothing), then click `quiz-option[data-key=<index>]`.
- Quiz result rows below 70 % are `data-state=weak`.
- Guest → account: after sign-up the `import-banner` offers to move guest progress; the server
  recomputes XP. Importing twice adds nothing.
- Leaderboard `week` = XP from the last 7 days, imported XP excluded; ties go to the older account.
  Users can hide their name (`showOnLeaderboard=false` → shown as anonymous).
- Chat: guests read only; 1..500 chars; Enter sends, Shift+Enter newline; delete is two clicks;
  polling every 5 s.
- Feedback form: once per account, after 20 min of continuous activity, never during a quiz run or
  recall session (local e2e build: shorten via `qa-hub-e2e-feedback-after-ms`).
- Tutorial offer: shown once per device to users with zero progress, except on tutorial/auth/
  import routes. Suppress it with the localStorage flag unless testing it.
- Language: switch sets `<html lang>` (`uk`/`en`) and persists across reloads; menu labels
  (sidebar, tab bar, More sheet) are **English in both locales** on purpose; breadcrumbs, titles,
  footer are localised.

## 10. Responsive behaviour (viewport projects)

Use at least three projects: desktop 1280×800, tablet 800×800, phone 390×800 (also try 360).

- ≥1024px: full sidebar; `breadcrumb` visible; `level` tooltip on hover.
- 721–1023px: sidebar is an icon rail (width ≤64px), nav links have `aria-label` (e.g. "Quizzes").
- ≤720px: no `sidebar` in the DOM, `tabbar` instead; `nav-more` opens `more-sheet`
  (`role=dialog`, `aria-modal=true`, closes on Escape/scrim/link, focus returns to `nav-more`);
  `nav-leaderboard`, `nav-chat`, `nav-tutorial`, `nav-profile`, `nav-logout` live inside the sheet;
  `level` is a button that toggles the tooltip; `kb-chapter-select` replaces the KB sidebar.
- Only one of sidebar/tab bar is rendered, so `nav-*` ids are unique on every viewport. Page
  objects should hide this difference (e.g. `nav.open('chat')` clicks `nav-more` first on phones).
- Touch targets ≥44px and inputs 16px are design rules (can be asserted in a visual/a11y layer).

## 11. Suggested framework shape

- Playwright Test + TypeScript, ESM. `testIdAttribute: 'data-testid'` (default).
- `playwright.config.ts`: env-driven `baseURL`/`apiURL`; projects `desktop`, `tablet`, `phone`
  (Chromium; optionally WebKit/Firefox for smoke); `timezoneId: 'Europe/Kyiv'`;
  `trace: 'retain-on-failure'`; `retries: 1` on CI; tags `@smoke`, `@prod-safe`, `@local-only`
  (Google, chat posting, admin, feedback, account deletion) and `grep`/`grepInvert` per env.
- Fixtures: `guestPage` (clean storage + init flags), `lang` option, `apiClient` (typed wrapper
  over `request` with auth token), `user` (creates a unique account via API, logs in, deletes it
  in teardown), `authedPage`, `catalog` (cached `GET /content/catalog`).
- Page objects / components: `Shell` (nav, level, streak, lang switch, More sheet),
  `DashboardPage`, `QuizPage`, `RecallPage`, `KbPage`, `AuthPage`, `ProfilePage`,
  `LeaderboardPage`, `ChatPage`, `AdminPage`. Locators built only from test ids + `data-key`.
- Helpers: `byTestId(id, key?)`, `numberValue(locator)` (reads `data-value`), `uniqueEmail()`,
  `answerCorrectly(questionId)` via `/quiz/check`, `waitForApiReady()`.
- Layers: API tests (contracts, validation, security invariants: no answers in questions, no ids/
  emails in leaderboard/chat, Origin check, refresh rotation and family revoke), UI e2e flows,
  responsive checks, i18n checks (no Cyrillic in EN content: regex `/[Ѐ-ӿ]/`), optional a11y
  (`@axe-core/playwright`) and visual snapshots (dark theme; mask dates, XP chart, chat feed).
- Reporting: HTML report + traces; on CI, GitHub Actions with the local stack (Postgres service)
  for the full suite and a separate scheduled prod smoke job.

## 12. Example flows (from the app's own e2e specs)

```ts
// Guest quiz: answers 3 questions and checks XP from the shown gains
await page.goto('/#/quiz/sql');
await page.getByTestId('quiz-start').click();
const card = page.getByTestId('question');
await card.getByTestId('quiz-option').first().click();
await expect(card.getByTestId('quiz-verdict')).toHaveAttribute('data-state', /correct|wrong/);
await expect(card.locator('[data-testid=quiz-option][data-state=correct]')).toHaveCount(1);
await card.getByTestId('quiz-next').click();
await expect(page.getByTestId('quiz-progress')).toHaveAttribute('data-value', '2');

// Read an article (+2 XP once)
await page.goto('/#/kb/sql');
await page.getByTestId('chapter').locator('details.art > summary').first().click();
await expect(page.getByTestId('chapter').locator('details.art[open]')).toHaveCount(1);

// Total XP without parsing text
const xp = Number(await page.getByTestId('xp-total').getAttribute('data-value'));

// Legacy deep links still work
await page.goto('/#/quiz/pwfix');
await expect(page.locator('[data-testid=quiz-section][data-key=pwfix]')).toHaveAttribute(
  'aria-selected',
  'true',
);
```

Scenarios already covered by the app's own suite (worth re-implementing in the framework as a
baseline): guest progress survives reload; guest → account import with server-recomputed XP;
legacy save import; wrong password message; remember-me on/off; Google sign-in and cancel;
shell on desktop/tablet/phone; UA/EN switch and English content; daily tasks and changing the
count; leaderboard (anonymous names, week period); chat (post, delete, ban); feedback form;
tutorial offer; admin access; test-id presence.

## 13. Pitfalls

- Hash routes: `page.goto('/#/dash')` works locally; in prod the app lives under
  `/qa-interview-tests/`, so `baseURL` must end with `/` and goto must use `./#/…` or full URLs.
- After `page.goto('/')`, wait for `toHaveURL(/#\/dash$/)` before touching localStorage, or the
  index redirect may race.
- Wait for state, not time: `expect.poll` for XP, `toHaveAttribute('data-state', …)` for verdicts,
  `toHaveCount(0)` for closed overlays. KB search needs ≥2 chars and debounces 250 ms.
- Toasts disappear after 4 s; assert them right away or assert the underlying value instead.
- `xp-total` is hidden until hover; read its `data-value` instead of asserting visibility.
- The import banner, tutorial offer and feedback sheet can overlap content; handle them in
  fixtures.
- Logout finishes asynchronously: wait for `account-guest` before the next login.
- Daily-task XP can land in the middle of a test; keep XP assertions relative.
- Content volume changes with editorial updates: derive counts from `/content/catalog`.
- Cold start in prod: first request ~60 s; raise the first navigation timeout or warm up in
  global setup.
- Never commit credentials; keep prod test account in env (`PROD_TEST_EMAIL`, `PROD_TEST_PASSWORD`).
