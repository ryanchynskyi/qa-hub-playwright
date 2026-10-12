# Roadmap

Middle level · 5 днів на тиждень · ~3 год/день · 6 тижнів. П'ятниця: таск дня + `/teach defence`.
Темп підлаштовується: дні можна об'єднувати або розбивати (після `/teach done`).

## Тиждень 1: фундамент і конфіг

- [ ] **D1. Сетап.** `package.json` (ESM), TS strict, ESLint + `eslint-plugin-playwright`, Prettier, `@playwright/test`, `PLAYWRIGHT_BROWSERS_PATH` на D:. Підняти стек, перший smoke: дашборд відкривається.
- [ ] **D2. Розбір `stack.mjs` + `webServer`.** Рев'ю готового скрипта (питання від ментора), інтеграція в конфіг, npm-скрипти `test` / `test:reset` / `stack`.
- [ ] **D3. Конфіг і середовища.** `TARGET=local|prod`, захист від prod (throw для не-local хостів), проєкти desktop/tablet/phone, timezone/locale, trace, теги `@smoke` / `@prod-safe` / `@local-only`.
- [ ] **D4. Локатори.** Хелпери `byTestId(id, key?)`, `numberValue()`; навігація, deep links (`#/quiz/pwfix`), редирект `#/` → `#/dash`.
- [ ] **D5. Гостьовий квіз.** Start → відповідь → verdict → progress, без очікувань за часом. **Defence #1.**

## Тиждень 2: фікстури та API

- [ ] **D6. Базова фікстура.** `addInitScript`-прапорці, опція `lang`, `guestPage`; перемикання UA/EN, `<html lang>`, немає кирилиці в EN.
- [ ] **D7. API-клієнт.** Типізована обгортка над `request`, `catalog` (worker-scoped), global setup `waitForApiReady`.
- [ ] **D8. Контрактні тести API.** health, catalog, questions **без** `correctIndex`, `/quiz/check` (404/400), межі `kb/search`; схеми через zod.
- [ ] **D9. Security-інваріанти.** Немає id/email у leaderboard і chat, формат помилок, Origin → `403 bad_origin`; data-driven по всіх секціях з каталогу.
- [ ] **D10. Auth API.** register/login/refresh, ротація токена, revoke family (`@slow`). **Defence #2.**

## Тиждень 3: auth у UI та Page Objects

- [ ] **D11. Фікстура `user`.** Унікальний email, створення через API, видалення в teardown; `authedPage` (API-логін у контексті тесту), remember-me через `qa-hub-rt`.
- [ ] **D12. UI auth.** login/register, `auth-error[data-key]`, logout → `account-guest`, remember-me on/off.
- [ ] **D13. `Shell`-компонент.** Ховає різницю desktop/tablet/phone (`nav.open('chat')`), навігаційні тести на 3 проєктах.
- [ ] **D14. `QuizPage` + `answerCorrectly()`.** Детермінований квіз через `/quiz/check`: усі правильні → бонус 20, рядки результатів.
- [ ] **D15. `KbPage`.** Пошук (debounce, ≥2 символи), +2 XP за статтю один раз, `kb-toggle-all` не рахується. **Defence #3.**

## Тиждень 4: бізнес-правила

- [ ] **D16. XP і рівні.** `expect.poll` по `xp-total`, сума `quiz-xp-gain` = дельта; хелпер `xpToNext` з unit-тестами.
- [ ] **D17. Recall.** Сесія, оцінки 1–5, XP за due-картки.
- [ ] **D18. Daily tasks.** `today`, стани задач, зміна кількості 3/4/5 і `profile-daily-pending`, таймзона.
- [ ] **D19. Імпорт.** Гість → акаунт (`import-banner`, XP перераховує сервер, повторний імпорт нічого не додає), legacy backup.
- [ ] **D20. Leaderboard + Profile.** Анонімні імена, період week, налаштування. **Defence #4.**

## Тиждень 5: local-only сценарії та шари якості

- [ ] **D21. Fake Google + admin.** Sign-in/cancel, доступ admin/forbidden/guest (`@local-only`).
- [ ] **D22. Chat.** Два користувачі в двох контекстах, Enter vs Shift+Enter, видалення у два кліки, бан.
- [ ] **D23. Responsive.** More-sheet (Escape, scrim, повернення фокусу), icon rail на планшеті, `kb-chapter-select`, touch targets ≥44px.
- [ ] **D24. a11y + visual.** `@axe-core/playwright`, `toHaveScreenshot` з масками (дати, XP chart, chat).
- [ ] **D25. Feedback form + tutorial offer.** e2e-хук порогу; аудит флакі (`--repeat-each`, workers). **Defence #5.**

## Тиждень 6: CI і фініш

- [ ] **D26. GitHub Actions.** Checkout приватного апу з токеном, Postgres service, кеш, артефакти (report, traces).
- [ ] **D27. Масштаб.** Sharding + merge reports, політика retries, global setup для cold start.
- [ ] **D28. Prod smoke.** `@prod-safe` проти проду (read-only), scheduled job, перевірка захисту.
- [ ] **D29. Документація.** README, ARCHITECTURE.md, ADR по ключових рішеннях.
- [ ] **D30. Фінальна співбесіда.** Mock interview по всьому фреймворку.
