# qa-hub-playwright

Playwright + TypeScript test framework for [QA Interview Hub](https://ryanchynskyi.github.io/qa-interview-tests/).
Built step by step as a learning project; see `learning/ROADMAP.md`.

## Local stack

```bash
cp .env.example .env   # set APP_DIR to the app clone
node scripts/stack.mjs --reset
```

Web http://localhost:4273 · API http://127.0.0.1:3200 · DB `qahub_pw` on the shared local Postgres (:5433).
