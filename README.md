# qa-hub-playwright

Playwright + TypeScript test framework for [QA Interview Hub](https://qa-interview.com/): API
contract and security tests, UI flows on desktop/tablet/phone, a read-only production smoke.
How it works end to end (stack, CI, agents): [`docs/WORKFLOW.md`](docs/WORKFLOW.md).

## Setup

Requirements: Node.js 22+, a local clone of the app repo after `npm ci` there.

```bash
npm ci
npx playwright install chromium
cp .env.example .env   # set APP_DIR to the app clone
```

On the dev machine browsers live on drive D: (`PLAYWRIGHT_BROWSERS_PATH=D:\ms-playwright`, a
Windows user variable). Playwright reads it in `install` and in test runs alike, from any
terminal or the VS Code extension; CI does not set it and uses the default cache.

## Running

```bash
npm test                 # everything; starts the local stack if it is not running
npm run test:api         # API project only
npm run test:ui          # desktop UI only
npm run test:smoke       # @smoke
npm run test:debug       # UI mode
npm run report           # last HTML report
npm run check            # typecheck, lint, format, test ids vs the app catalog, REQ coverage (needs APP_DIR)
npm run perf:smoke       # k6: 1 user, 30s (stack must be running)
npm run perf:load        # k6: ramp to 20 users, ~2 min
```

Perf tests need [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) on PATH
(`winget install k6`) and a running `npm run stack`: k6 does not start it. They run only against
localhost, never production.

`playwright.config.ts` starts `scripts/stack.mjs` through `webServer` and reuses a stack that is
already up. For debugging keep one running in a separate terminal: `npm run stack` (or
`npm run stack:reset` for an empty database: no leaderboard rows, no chat).

Local stack: web http://localhost:4273 · API http://127.0.0.1:3200 (tests use the same-origin
proxy http://localhost:4273/api/) · DB `qahub_pw` on the shared local Postgres (:5433).

### Production

```powershell
$env:TARGET = 'prod'; npx playwright test; Remove-Item Env:TARGET
```

`TARGET=prod` runs only tests tagged `@prod-safe` (read-only) against https://qa-interview.com and
skips the local stack. Any non-local `BASE_URL`/`API_URL` without `TARGET=prod` stops the run at
config load.

## Structure

```
playwright.config.ts   projects (api, desktop, tablet, phone), tags, webServer, prod guard
src/
  config/env.ts        TARGET, BASE_URL, API_URL, the production guard
  setup/               global setup: wait for API /health (cold start in prod)
  api/                 ApiClient over APIRequestContext + zod schemas (types = contracts)
  fixtures/            test.extend: lang, device, api, catalog, user, newCredentials, authedPage, page objects
  components/shell.ts  navigation, XP, language, account; hides desktop/tablet/phone differences
  pages/               DashboardPage, QuizPage, AuthPage, KbPage
  helpers/             byTestId, numberValue, uniqueEmail
tests/
  api/                 contracts, validation, auth, security invariants (no answers, no ids)
  e2e/                 UI flows: shell, quiz, auth, i18n, knowledge base
  smoke/               @smoke @prod-safe: the app is up and renders
perf/                  k6 load tests (plain JS, k6 runtime): guest read path, smoke and load
```

## Tags

| Tag           | Meaning                                                   |
| ------------- | --------------------------------------------------------- |
| `@smoke`      | fastest "is it alive" checks                              |
| `@prod-safe`  | read-only, allowed against production (`TARGET=prod`)     |
| `@responsive` | runs on tablet and phone too (desktop runs every UI test) |

## Conventions

- Locators: test ids only (`getByTestId`, `byTestId(scope, id, key)`); state from ARIA or
  `data-state`; numbers from `data-value`. ESLint forbids raw locators in specs.
- No sleeps: web-first assertions and `expect.poll`. XP is asserted as a delta, never exactly.
- Every test makes its own data (`user`, `newCredentials`) and cleans it up; nothing is shared
  between tests, so they run fully parallel.
- Page-object assertion methods are named `expect*()`.
