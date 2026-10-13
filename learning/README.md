# Навчальний курс: Playwright-фреймворк рівня Middle

Фреймворк у цьому репо вже побудований і зелений (`npm test`: 58 запусків, ~15 с). Курс розбирає
його шар за шаром: **що** зроблено, **чому саме так**, **які альтернативи** і **як це питають на
співбесіді**. Потім ти розширюєш фреймворк сам: кожен модуль закінчується практикою на реальному
застосунку.

## Як працювати з модулем (~2–3 год)

1. **Прочитай модуль** (20–30 хв). Відкривай файли за посиланнями поруч, не читай код «на віру».
2. **Зламай і подивись** (15 хв). У кожному модулі є блок «Експеримент»: зміни одну річ, запусти,
   прочитай помилку і trace. Так запам'ятовується, навіщо кожен рядок.
3. **Практика** (1–1.5 год). Завдання з acceptance criteria. Пиши код сам, у гілці
   `study/NN-<topic>`; `/teach hint` дає підказки, `/teach review` робить рев'ю.
4. **Питання** (15 хв). Дай відповідь вголос або письмово, потім звір з
   [INTERVIEW.md](INTERVIEW.md).

## Модулі

| # | Модуль | Ключові файли |
|---|--------|---------------|
| 1 | [Конфіг, середовища і захист від проду](modules/01-config-and-environments.md) | `playwright.config.ts`, `src/config/env.ts`, `src/setup/global-setup.ts` |
| 2 | [Локатори, Page Objects і Shell-компонент](modules/02-locators-and-page-objects.md) | `src/helpers/locators.ts`, `src/pages/*`, `src/components/shell.ts` |
| 3 | [Фікстури: стан браузера, дані, ізоляція](modules/03-fixtures.md) | `src/fixtures/index.ts` |
| 4 | [API-тестування: клієнт, контракти, security](modules/04-api-testing.md) | `src/api/*`, `tests/api/*` |
| 5 | [Дизайн тестів і боротьба з флакі](modules/05-test-design-and-flakiness.md) | `tests/e2e/*`, `eslint.config.js` |
| 6 | [CI, звіти, теги і масштаб](modules/06-ci-and-reporting.md) | `.github/workflows/e2e.yml`, теги, проєкти |

Прогрес: [ROADMAP.md](ROADMAP.md). Журнал: [JOURNAL.md](JOURNAL.md). Питання з еталонними
відповідями: [INTERVIEW.md](INTERVIEW.md).

## Карта фреймворку за 1 хвилину

```
            playwright.config.ts ── env.ts (TARGET, URL, guard)
                    │                └─ global-setup.ts (чекає /health)
     ┌──────────────┼───────────────┬──────────────┬─────────────┐
   api          desktop          tablet          phone      (проєкти)
 tests/api   tests/{e2e,smoke}   лише @responsive  лише @responsive
     │              │
     │       fixtures/index.ts ── context: initScript (мова, без оверлеїв)
     │              │             api / catalog (worker) / user / newCredentials / authedPage
     │              │             shell, dashboard, quiz, auth, kb (page objects)
     └── ApiClient (api/client.ts) + zod-схеми (api/schemas.ts)
```

## Факти про застосунок, на які спирається все

- Path-роути: `/dash`, `/quiz/sql`, `/kb/sql/...`; англійська під `/en/...`. Корінь `/` одразу є
  дашбордом, невідомі шляхи редиректять на `/dash`, старі `#/...` переписуються.
- Тест-хуки: `data-testid`, ідентичність повторюваних елементів у `data-key`, стан в ARIA або
  `data-state`, числа в `data-value`. Повний каталог: `$APP_DIR/docs/test-ids.md`.
- Локальний стек: web :4273, API :3200 (тести ходять через проксі `:4273/api/`), БД `qahub_pw`.
- Прод: https://qa-interview.com, API https://qa-hub-api.onrender.com. Тільки `@prod-safe`.

`docs/brief.md` місцями застарів (там ще hash-роути і github.io). Де бриф і `test-ids.md`
розходяться, правий `test-ids.md` і сам застосунок.
