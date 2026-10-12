# qa-hub-playwright

Playwright + TypeScript test framework for [QA Interview Hub](https://ryanchynskyi.github.io/qa-interview-tests/).
Built step by step as a learning project; see `learning/ROADMAP.md`.

## Setup

Requirements: Node.js 22+ (developed on 24), a local clone of the app repo after `npm ci` there.

```bash
npm ci
npx playwright install chromium
```

### Browsers

Only Chromium is installed. On the dev machine browsers live on drive D:, set once as a Windows
user environment variable:

```powershell
[Environment]::SetEnvironmentVariable('PLAYWRIGHT_BROWSERS_PATH', 'D:\ms-playwright', 'User')
```

Why a user variable and not `.env` or an npm script: Playwright reads it both in
`npx playwright install` (which never loads the config or `.env`) and in test runs, from any
terminal or the VS Code extension, with no shell-specific syntax. CI does not set it and uses the
default cache. Restart VS Code after setting it.

## Local stack

The tests run against a local copy of the app with its own ports and database
(`docs/brief.md` §2.1). Start it in a separate terminal before running tests:

```bash
cp .env.example .env   # set APP_DIR to the app clone
node scripts/stack.mjs --reset
```

Web http://localhost:4273 · API http://127.0.0.1:3200 · DB `qahub_pw` on the shared local Postgres (:5433).

Flags: `--reset` drops the database first (empty leaderboard and chat), `--no-build` reuses the
existing web build, `--build` forces a rebuild, `--no-db` uses an external Postgres (`DB_URL`).

## Running tests

```bash
npx playwright test                 # all tests
npx playwright test --grep @smoke   # smoke only
npx playwright test --ui            # UI mode for debugging
npx playwright show-report          # last HTML report
```

Production is never a target by default; only the `@prod-safe` smoke may run with `TARGET=prod`.
