# День 1: сетап проєкту і перший smoke

Тиждень 1 · понеділок 2026-10-12 · гілка `day-01-setup`

## Мета

Перетворити репозиторій на робочий Playwright + TypeScript проєкт: ESM, strict-типи, лінт, який
ловить типові помилки саме в тестах, браузери на диску D: і один зелений smoke проти локального
стеку.

Усе подальше стоїть на цьому фундаменті. На D2 у конфіг додасться `webServer` зі `stack.mjs`, на
D3 з'являться env-профілі, захист від prod і проєкти desktop/tablet/phone, на D4 хелпери
локаторів. Тому сьогодні конфіг навмисно мінімальний, а тулінг (TS, ESLint) одразу повний: з ним
жити всі 6 тижнів.

## Контекст

| Що читати | На що звернути увагу |
| --- | --- |
| `docs/brief.md` §1 | Стек апу, hash-роути, дефолтна мова UA. Від цього залежать URL і тексти в assertions |
| `docs/brief.md` §2, §2.1 | Порти 4273/3200, БД `qahub_pw`, що робить `stack.mjs` і `--reset` |
| `docs/brief.md` §4 | Таблиця роутів, редирект `#/` → `#/dash` |
| `docs/brief.md` §5 | Чому лише `data-testid`, які атрибути (`data-key`, `data-value`, `data-state`) |
| `docs/brief.md` §9 (рядок про tutorial offer), §6 | Що з'являється в «чистому» браузері і як це вимикається |
| `docs/brief.md` §13 | Перші два пункти: hash-роути з `baseURL` і гонка з редиректом |
| `$APP_DIR/docs/test-ids.md` | Розділи Shell (`sidebar`, `breadcrumb`) і Dashboard (`dash`, `dash-title`) |
| `$APP_DIR/playwright.config.ts` | Як автор апу розв'язав ту саму задачу. Порівнюй, не копіюй (у них інші порти, `webServer`, `storageState`) |
| `$APP_DIR/e2e/shell.spec.ts` | Стиль assertions, перший тест (desktop) найближчий до твого smoke |
| `$APP_DIR/eslint.config.js`, `$APP_DIR/package.json` | Flat config і версії, з якими апп реально живе |

## Теорія

- [Managing browser binaries](https://playwright.dev/docs/browsers#managing-browser-binaries):
  `PLAYWRIGHT_BROWSERS_PATH`, `install chromium` і як прибрати непотрібні браузери (`uninstall`).
- [TSConfig `strict`](https://www.typescriptlang.org/tsconfig/#strict) і
  [`noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess):
  у тестах постійно `rows[0]`, `match[1]`, і strict сам по собі не каже, що там може бути `undefined`.
- [typescript-eslint: typed linting](https://typescript-eslint.io/getting-started/typed-linting) і
  [`no-floating-promises`](https://typescript-eslint.io/rules/no-floating-promises/): правило
  працює лише з type info. Без нього пропущений `await` перед `expect` дає зелений тест, який
  нічого не перевірив.
- [eslint-plugin-playwright](https://github.com/playwright-community/eslint-plugin-playwright):
  flat config, список правил, особливо `no-wait-for-timeout`, `no-networkidle`,
  `prefer-web-first-assertions`, `missing-playwright-await`.

## Завдання

### 1. Прибрати скафолд `npm init playwright` (~15 хв)

**Навіщо.** Генератор зробив проєкт «для всіх». Тут він частково конфліктує з планом: CommonJS
замість ESM, 3 браузери, приклад-тест проти playwright.dev, CI-воркфлоу, який на push запустить
тести без стеку й апу (і впаде).

**Що зробити.**
- `package.json`: `"type": "module"`, прибрати `main`/`directories`, додати `engines.node` (≥ 22,
  як в апі), `"private": true` (публікувати це в npm не треба).
- Видалити `tests/example.spec.ts`.
- `.github/workflows/playwright.yml`: CI буде на D26 і там потрібен checkout приватного апу з
  токеном. Вирішити: видалити зараз чи вимкнути (наприклад, лише `workflow_dispatch`).
- `.gitignore`: генератор дописав блок, що частково дублює вже наявні рядки. Залишити один
  чистий набір.
- Конфіг поки не чіпати, ним займається крок 4.

**Рішення, які приймаєш ти.**
- Видалити воркфлоу чи залишити вимкненим: чистий репо зараз чи нагадування на D26.

**Пастки.**
- Після `"type": "module"` будь-який `.js`-конфіг з `require` чи `module.exports` зламається. У
  `.ts` Playwright це розрулює сам, але ESLint-конфіг (крок 3) має бути ESM.

**Перевір себе.** `npx playwright test --list` не показує жодного тесту і не падає.

### 2. Браузери на D: (~15 хв)

**Навіщо.** Диск C: не резиновий, і `npm init playwright` швидше за все вже поставив 3 браузери
в `%LOCALAPPDATA%\ms-playwright`. Нам потрібен лише Chromium (апп і план тестують Chromium;
WebKit/Firefox можуть бути опційним smoke пізніше).

**Що зробити.**
- Перевірити, що вже лежить у `%LOCALAPPDATA%\ms-playwright`, і прибрати це штатною командою
  Playwright, а не руками.
- Обрати каталог на D: (наприклад, поза репо) і встановити туди тільки Chromium.
- Зробити так, щоб `PLAYWRIGHT_BROWSERS_PATH` діяла завжди: і в терміналі VS Code, і при запуску
  з розширення Playwright Test, і завтра після перезавантаження.

**Рішення, які приймаєш ти.** Де живе змінна:
- **user env var у Windows**: працює всюди на цій машині, але невидима для репо;
- **`.env` у репо + завантаження в конфігу**: видно в проєкті, але `npx playwright install` конфіг
  не читає;
- **npm-скрипт**: явний, але прив'язаний до shell, і Windows vs Linux (CI) мають різний синтаксис.

Обери і запиши в README одним рядком, чому так. Пам'ятай: у CI (Linux) ця змінна не потрібна і не
повинна ламати запуск.

**Пастки.**
- Змінна має бути виставлена **і під час install, і під час test**. Якщо лише при install,
  Playwright шукатиме браузер на C: і скаже «Executable doesn't exist».
- Нова user env var не видна в уже відкритому VS Code: перезапусти редактор.
- Шляхи з пробілами в npm-скриптах на Windows ламаються без лапок.

**Перевір себе.** Після `npx playwright install chromium` у твоєму каталозі на D: з'явилась папка
`chromium-*`, у `%LOCALAPPDATA%\ms-playwright` нічого нового. Якщо тимчасово перейменувати
D:-каталог, запуск тесту падає (тобто він реально звідти бере браузер).

### 3. TypeScript strict + ESLint + Prettier (~40 хв)

**Навіщо.** Це твоя автоматична код-рев'ю на кожен день. Головна ціль: щоб помилки, через які
тести «зелені, але порожні» або флакі, ловились до запуску. Пропущений `await`,
`waitForTimeout`, `networkidle`, `expect(await x.isVisible())` замість web-first assertion.

**Що зробити.**
- Залежності: `typescript`, `typescript-eslint`, `eslint`, `@eslint/js`, `prettier`,
  `eslint-config-prettier` (`@playwright/test`, `@types/node`, `eslint-plugin-playwright` вже є).
- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `noEmit`, target/module/moduleResolution,
  сумісні з ESM і Node 22+. `include` має покривати і тести, і `playwright.config.ts`, і майбутній
  `src/`.
- `eslint.config.js` (flat config, ESM):
  - базові JS-правила і **type-aware** набір typescript-eslint (лише `recommended` не дасть
    `no-floating-promises`);
  - рекомендований набір playwright-плагіна, застосований **лише до тестових файлів**;
  - `eslint-config-prettier` останнім, щоб форматуванням займався лише Prettier;
  - ігнор `playwright-report/`, `test-results/`, `node_modules/`.
- Явно переконатися, що працюють `@typescript-eslint/no-floating-promises`,
  `playwright/no-wait-for-timeout`, `playwright/no-networkidle`,
  `playwright/prefer-web-first-assertions`, `playwright/missing-playwright-await`. Якщо якесь із них
  у рекомендованих лише `warn`, вирішити, чи робити `error`.
- `.prettierrc` (кілька опцій максимум) і `.prettierignore`.
- npm-скрипти: `typecheck`, `lint`, `format`, `format:check`.

**Рішення, які приймаєш ти.**
- `moduleResolution`: `nodenext` (суворо, вимагає розширень в імпортах) чи `bundler`
  (Playwright сам транспілює, імпорти без `.js`). Подумай, що буде, коли з'явиться `src/` з
  хелперами.
- `warn` чи `error` для playwright-правил. Warnings, які ніхто не читає, нічого не варті; але
  `error` на кожну дрібницю дратує.
- Чи вмикати `strictTypeChecked` замість `recommendedTypeChecked`. Ціна: більше шуму на старті.

**Пастки.**
- Type-aware лінт потребує `parserOptions.projectService` (або `project`). Без цього правила з
  type info падають з помилкою про відсутній parserServices.
- Якщо `eslint.config.js` сам не входить у tsconfig, type-aware лінт може скаржитися на нього.
  Або виключи його з type-checked правил, або додай у проєкт.
- Prettier і ESLint можуть сперечатися про лапки/коми, якщо забути `eslint-config-prettier`.

**Перевір себе.** `npm run typecheck` і `npm run lint` дають 0 помилок і 0 warnings. Потім
**навмисно зламай** код у тесті (крок 5), по одному:
1) прибери `await` перед `expect(...)`;
2) додай `await page.waitForTimeout(500)`;
3) напиши `expect(await locator.isVisible()).toBe(true)`.

Кожен варіант має дати помилку лінту. Поверни назад.

### 4. Мінімальний `playwright.config.ts` (~20 хв)

**Навіщо.** Конфіг, з якого виростуть env-профілі (D3) і `webServer` (D2). Сьогодні він знає лише
про локальний стек на 4273 і один браузер.

**Що зробити.**
- `testDir`, `fullyParallel`, `forbidOnly` на CI, `retries` (0 локально; CI потім).
- `use.baseURL`: `http://localhost:4273` (хардкод тимчасовий, D3 винесе в env).
- `use.trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`.
- Один проєкт: Desktop Chrome. Firefox/WebKit прибрати.
- Reporter: локально `list` + `html` з `open: 'never'` (щоб звіт не відкривався сам після кожного
  падіння).
- **Без `webServer`** (це D2). Стек піднімаєш в окремому терміналі: `node scripts/stack.mjs --reset`.
- Прибрати коментарі-шаблони генератора, які тепер неправдиві.

**Рішення, які приймаєш ти.**
- `trace: 'retain-on-failure'` чи `'on-first-retry'` (дефолт генератора). Локально ретраїв 0, то
  що дасть `on-first-retry`?
- Чи додавати вже зараз `timezoneId: 'Europe/Kyiv'` і `locale: 'uk-UA'` (brief §6), чи лишити на D3.

**Пастки.**
- `baseURL` + `page.goto('/#/dash')` працює локально. Але в prod апп живе під
  `/qa-interview-tests/` (brief §13), і там `'/'` поведе на корінь домену. Сьогодні це не
  проблема, але подумай, як писати шлях у goto, щоб на D3/D28 не переписувати.

**Перевір себе.** `npx playwright test --list` бачить лише проєкт chromium. `npm run typecheck`
проходить з конфігом.

### 5. Smoke-тест дашборда (~30 хв)

**Навіщо.** Перший тест, який доводить, що весь ланцюжок живий: браузер з D:, конфіг, стек, апп
рендериться. Він же стане шаблоном для `@smoke` і пізніше `@prod-safe`.

**Що зробити.** Файл `tests/smoke/dashboard.spec.ts`, тест з тегом `@smoke` (через `tag` в опціях
тесту, а не в назві). Перевірити:
1. Відкриття кореня апу (`#/` або без хеша) редиректить на `#/dash`.
2. Корінь дашборда (`dash`) видимий, заголовок (`dash-title`) видимий і не порожній.
3. `breadcrumb` містить «Дашборд» (дефолтна мова UA).
4. На desktop видно `sidebar`.

Лише `getByTestId` (див. `test-ids.md`), лише web-first assertions.

**Рішення, які приймаєш ти.**
- **Tutorial offer.** Новий гість без прогресу отримує оверлей `tutorial-offer` (brief §9, §6). Чи
  заважає він твоїм перевіркам? Перевір руками в чистому вікні інкогніто на
  `http://localhost:4273`. Якщо заважає, обери тимчасовий спосіб без фікстури (фікстура на D6) і
  поясни, чому саме цей. Якщо не заважає, чи це гарантія на майбутні тести?
- Чи перевіряти текст заголовка («точно такий») чи лише наявність. Що станеться з тестом, коли
  автор апу змінить копірайт?
- Один тест з кількома перевірками чи кілька тестів. Для smoke що важливіше: швидкість чи
  точність діагнозу?

**Пастки.**
- `toHaveURL` з рядком перевіряє URL цілком. Для хеш-роута зручніше регулярний вираз, але
  подумай про якорі (`$`), щоб `#/dash` не матчився з `#/dashboard-something`.
- Перевірка тексту в `breadcrumb` залежить від мови. Сьогодні ок (UA за замовчуванням), на D6
  з'явиться опція `lang`.
- Не перевіряй `xp-total` на видимість: він прихований до hover (brief §13).

**Перевір себе.**
- `npx playwright test --repeat-each=5` дає 5/5 зелених.
- Зламай перевірку (наприклад, очікуй `#/quiz`) і подивись, що каже помилка і що видно в trace
  (`npx playwright show-trace test-results/.../trace.zip`). Зрозуміло з першого погляду, що
  зламалось?
- `npx playwright test --grep @smoke` знаходить тест.

### 6. README і коміти (~10 хв)

**Навіщо.** Через тиждень ти не згадаєш, де браузери і як запускати. Інтерв'юер на D30 відкриє саме
README.

**Що зробити.** У README додати розділ «Setup»: Node версія, куди ставляться браузери і як, які
скрипти є, що стек запускається окремо (поки D2 не прибере цей крок).

## Acceptance criteria

- [ ] `package.json`: `"type": "module"`, `private`, `engines`, скрипти `typecheck`, `lint`,
      `format`, `format:check`; `package-lock.json` закомічений.
- [ ] `npm run typecheck` і `npm run lint` дають 0 помилок, 0 warnings.
- [ ] Три навмисні поломки з кроку 3 кожна валить лінт.
- [ ] Chromium лежить на D: (покажи шлях); `%LOCALAPPDATA%\ms-playwright` порожній або відсутній.
- [ ] Конфіг: один проєкт chromium, `baseURL` на 4273, trace `retain-on-failure`, без `webServer`.
- [ ] `npx playwright test --repeat-each=5` дає 5/5 зелених при піднятому стеку.
- [ ] У тесті немає `waitForTimeout`, `networkidle`, текстових/CSS-локаторів, абсолютних URL.
- [ ] Скафолд прибраний: немає `example.spec.ts`, воркфлоу видалений або вимкнений, `.gitignore`
      без дублів.
- [ ] README описує сетап.

## Порядок роботи / коміти

1. `chore: switch to ESM and clean up playwright scaffold`
2. `chore: install chromium to custom browsers path`
3. `chore: add strict tsconfig, eslint and prettier`
4. `test: add minimal playwright config`
5. `test: add dashboard smoke test`
6. `docs: describe local setup in README`

## Бонус

- Зупини API, а web залиш працювати. Як падає smoke? Чи видно з помилки або trace, що це апп, а не
  тест? Запиши, як би ти швидко відрізняв «апп впав» від «тест зламаний» (це питання повернеться на
  D7 з `waitForApiReady`).
- `.vscode/extensions.json` з рекомендаціями Playwright Test for VS Code, ESLint, Prettier, і
  `.vscode/settings.json` з format on save.
- Подивись `npx playwright test --ui` і знайди в ньому свій тег.

## Interview angle

- «Чому тест може бути зеленим, хоча assertion не виконався? Як ви ловите це на рівні проєкту, а не
  код-рев'ю?»
- «Чим `expect(locator).toBeVisible()` відрізняється від `expect(await locator.isVisible()).toBe(true)`,
  і чому друге — антипатерн?»
- «Які налаштування конфігу ви виставляєте першими в новому Playwright-проєкті і чому (trace,
  retries, forbidOnly, reporter)?»

## Підказки

(лог рівнів підказок, які брав)

- Крок 3: залежності (`typescript`, `typescript-eslint`, `eslint`, `@eslint/js`, `prettier`,
  `eslint-config-prettier`) встановив ментор на прохання. Конфіги (tsconfig, eslint, prettier)
  пише сам.
- Кроки 2 і 6 зробив ментор на прохання: user env var `PLAYWRIGHT_BROWSERS_PATH=D:\ms-playwright`,
  Chromium 1248 встановлено туди; README з розділами Setup / Browsers / Local stack / Running tests
  (коміт `docs: describe local setup in README` у `day-01-setup`). Фокус користувача:
  `playwright.config.ts` і розбудова фреймворку.
- 2026-10-13: кроки 1, 3, 4 теж зробив ментор на прохання (з поясненням у чаті): ESM
  `package.json` зі скриптами, `tsconfig.json`, `eslint.config.js` (type-aware + playwright для
  `tests/**`, `no-raw-locators`), Prettier, мінімальний `playwright.config.ts` (проєкт `desktop`).
  На користувачі: крок 5 (smoke) і далі вся архітектура та тести. Конфіг ще розвиватиме сам на D2/D3.

## Рев'ю

(заповнює `/teach review`)
