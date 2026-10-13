# Модуль 1. Конфіг, середовища і захист від проду

**Після модуля ти можеш:** пояснити кожен рядок `playwright.config.ts`, налаштувати проєкти під
різні в'юпорти і рівні тестів, зробити так, щоб помилка в env ніколи не запустила деструктивні
тести на проді.

Файли: [playwright.config.ts](../../playwright.config.ts) ·
[src/config/env.ts](../../src/config/env.ts) ·
[src/setup/global-setup.ts](../../src/setup/global-setup.ts) ·
[scripts/stack.mjs](../../scripts/stack.mjs)

## 1. Одне місце правди про середовище: `env.ts`

Конфіг не читає `process.env` напряму. Усе проходить через `env.ts`, який:

1. вантажить `.env` (`process.loadEnvFile()`, вбудовано в Node 22, без пакета `dotenv`);
2. резолвить `TARGET` (`local` за замовчуванням, `prod` лише явно) і **падає на будь-якому іншому
   значенні**, тож `TARGET=production` не пройде мовчки як `local`;
3. бере URL з дефолтів цілі або з `BASE_URL`/`API_URL`;
4. **кидає помилку, якщо ціль `local`, а хост не `localhost`/`127.0.0.1`.**

Чому пункт 4 критичний: найнебезпечніший сценарій — «хтось виставив `BASE_URL` на прод і запустив
`npm test`». Тоді тести реєстрації, видалення акаунтів і чату пишуть у бойову БД. Захист
спрацьовує ще на етапі завантаження конфігу, до першого тесту.

```ts
if (target === 'local') {
  assertLocal('BASE_URL', baseURL);
  assertLocal('API_URL', apiURL);
}
```

**Чому `apiURL` локально — це `http://localhost:4273/api/`, а не `:3200`.** Web-сервер проксіює
`/api` на API. Коли тест логіниться через `page.request.post(apiURL + 'auth/login')`, refresh-cookie
`qa_rt` ставиться на **той самий origin**, що й сторінка. Якби ми ходили на `127.0.0.1:3200`,
cookie прив'язалась би до іншого хоста, і браузер не надіслав би її застосунку.
Модуль 3 спирається на це.

**Слеш у кінці URL.** `withSlash()` гарантує `.../`. Відносний `page.goto('quiz/sql')` резолвиться
як URL у браузері: `new URL('quiz/sql', 'https://site.com/app')` дає `https://site.com/quiz/sql`
(останній сегмент відкинуто), а з `.../app/` дає `.../app/quiz/sql`. Тому всі `goto` у page
objects без початкового `/`: вони працюють за будь-якого base path.

## 2. Проєкти: рівні тестів і в'юпорти

```ts
projects: [
  { name: 'api', testDir: './tests/api', grep: grepFor() },
  uiProject('desktop', {...}),   // усі UI-тести
  uiProject('tablet', {...}),    // лише @responsive
  uiProject('phone', {...}),     // лише @responsive
]
```

- **`api` окремим проєктом**: API-тести не потребують браузера і не мають сенсу ×3 в'юпорти.
  Запуск окремо: `npm run test:api`.
- **UI ×3 лише для `@responsive`**: прогін усіх UI-тестів на трьох в'юпортах потроїть час заради
  перевірки, що квіз рахує XP однаково на телефоні. Бізнес-логіка від в'юпорту не залежить,
  розкладка залежить. Тому на tablet/phone йдуть лише тести розкладки і smoke.
- **`device` як опція фікстури** (`use: { device }`). Проєкт передає її, і Shell-компонент знає,
  де шукати посилання (модуль 2).

### Пастка, яку ми впіймали: `grep` проєкту перекриває кореневий

Перша версія мала `grep: /@prod-safe/` у корені і `grep: /@responsive/` у tablet/phone. На проді
tablet/phone запустили б **усі** `@responsive` тести, включно з тими, що не `@prod-safe`. Тому
тепер `grepFor()` будує один регекс з усіх вимог через lookahead (логічне І):

```ts
new RegExp(required.map((tag) => `(?=.*${tag})`).join(''))   // (?=.*@prod-safe)(?=.*@responsive)
```

Перевір сам: `$env:TARGET='prod'; npx playwright test --list` показує 13 тестів, і всі з `@prod-safe`.

## 3. `use`: спільні налаштування

| Опція | Чому |
|---|---|
| `baseURL` | з `env`; тести не знають, локально вони чи на проді |
| `timezoneId: 'Europe/Kyiv'`, `locale` | щоденні задачі скидаються опівночі за локальним часом; без фіксації прогін о 23:59 на CI в UTC дає флакі |
| `trace: 'retain-on-failure'` | trace лише для впалих тестів: повна картина без зайвих гігабайтів. `on-first-retry` локально (0 ретраїв) не записав би нічого |
| `screenshot: 'only-on-failure'` | швидкий погляд у HTML-звіті |
| `retries: CI ? 1 : 0` | локально флакі має падати й муляти око; на CI тест, що пройшов з другої спроби, позначається як flaky |
| `forbidOnly: CI` | забутий `test.only` не дасть «зеленого» прогону з одного тесту |

## 4. `webServer` і `globalSetup`

`webServer` запускає `node scripts/stack.mjs` (Postgres, API, web) і чекає на `baseURL`. З
`reuseExistingServer: !CI` локально підхоплюється вже запущений `npm run stack`. Це зручно для UI
mode і швидких перезапусків.

`webServer` чекає лише на один URL (web). Тож `global-setup.ts` окремо опитує `GET /health`, поки
не отримає `db: 'up'`. На проді (Render free plan) API засинає і перший запит може йти ~60 с: без
цього кроку перші тести падали б через холодний старт, а не через баг.

## Експеримент (15 хв)

1. `$env:BASE_URL='https://qa-interview.com'; npx playwright test --list`: прочитай помилку.
   Потім `Remove-Item Env:BASE_URL`.
2. У `grepFor()` тимчасово прибери `@prod-safe` для tablet і подивись `--list` з `TARGET=prod`.
   Скільки тестів додалось і чому це небезпечно? Поверни.
3. Зупини стек (якщо запущений окремо) і запусти `npx playwright test --project=api`. Хто
   піднімає стек, і скільки це триває?
4. Постав `retries: 0` і `trace: 'on-first-retry'`, зламай будь-який assertion і пошукай trace у
   `test-results/`. Поверни.

## Практика (1–1.5 год)

**Завдання A. Проєкт `webkit-smoke`.** Додай проєкт на WebKit (Desktop Safari), який запускає лише
`@smoke`. Він не повинен запускатися на проді, якщо тест не `@prod-safe`.
- [ ] `npx playwright install webkit` (на D:, змінна вже налаштована).
- [ ] `--list` показує smoke-тести в новому проєкті; з `TARGET=prod` лише `@prod-safe`.
- [ ] Прогін зелений.

**Завдання B. `test:prod` без PowerShell-магії.** Зараз прод запускається
`$env:TARGET='prod'; ...`. Зроби npm-скрипт `test:prod`, який працює і в Windows, і в Linux.
Підказка: `cross-env` або маленький `.mjs`-лаунчер. Аргументуй вибір.

**Завдання C (бонус). Таймаут першої навігації на проді.** Додай `navigationTimeout` більший
для `TARGET=prod`, ніж локально. Де це правильно робити: в `use` чи у фікстурі? Чому?

## Питання на співбесіді

1. Як ви запобігаєте випадковому запуску деструктивних тестів на продакшені?
2. Навіщо розділяти тести на проєкти? Як вирішуєте, що запускати на всіх в'юпортах?
3. Чим `globalSetup` відрізняється від `webServer` і від worker-фікстури? Коли що обрати?
4. `trace: on-first-retry` vs `retain-on-failure` vs `on`: що де використовуєте?
5. Чому `timezoneId` у конфігу може врятувати від флакі?

Еталонні відповіді: [INTERVIEW.md](../INTERVIEW.md#модуль-1).
