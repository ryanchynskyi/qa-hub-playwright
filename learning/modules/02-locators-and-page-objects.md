# Модуль 2. Локатори, Page Objects і Shell-компонент

**Після модуля ти можеш:** обґрунтувати стратегію локаторів для двомовного застосунку, написати
page object, який не тече в тести, і сховати різницю між desktop і phone в одному компоненті.

Файли: [src/helpers/locators.ts](../../src/helpers/locators.ts) ·
[src/pages/](../../src/pages/) · [src/components/shell.ts](../../src/components/shell.ts) ·
[tests/e2e/shell.spec.ts](../../tests/e2e/shell.spec.ts)

## 1. Стратегія локаторів: чому лише test id

UI двомовний: «Почати» і «Start» — та сама кнопка. Текстові локатори ламаються від перемикання мови
і від правки копірайту. Ролі (`getByRole`) теж прив'язані до тексту через accessible name. CSS
(`.opt`, `.sidebar a`) ламається при рефакторингу верстки. Застосунок дає стабільний контракт:

| Що треба | Звідки брати | Приклад |
|---|---|---|
| Елемент | `data-testid` | `getByTestId('quiz-start')` |
| Один з повторюваних | `data-key` | `byTestId(page, 'quiz-section', 'sql')` |
| Стан | ARIA, інакше `data-state` | `aria-selected`, `aria-current`, `data-state="correct"` |
| Число | `data-value` / `data-total` | `numberValue(progress, 'data-total')` |

**Текст перевіряємо лише навмисно:** коли тест закріплює мову і перевіряє саме переклад
(`i18n.spec.ts`: «немає кирилиці в англійських питаннях»).

### `byTestId(scope, id, key?)`

```ts
byTestId(this.question, 'quiz-option', index)
// → [data-testid="quiz-option"][data-key="2"] всередині поточного питання
```

`scope` може бути `Page` або `Locator`. Це **ланцюжок локаторів**: пошук звужується до
контейнера, і опція з чужого питання (наприклад, під час анімації переходу) не зачепиться.

### `numberValue(locator, attr)`

Читає атрибут і **падає з людським повідомленням**, якщо там не число. Без цього
`Number(null)` дав би `0`, а тест «XP не змінився» пройшов би на зламаному елементі. Тихий `0`
гірший за падіння.

## 2. Page Object: що в ньому є і чого немає

Подивись [quiz-page.ts](../../src/pages/quiz-page.ts):

- **Локатори як `readonly`-поля** в конструкторі. Вони ліниві: створення локатора нічого не шукає
  на сторінці, тож поля безпечно створювати до `goto`.
- **Методи-дії мовою користувача:** `startRun('10')`, `answer(index)`, `goNext()`. Кожен метод
  **чекає на результат своєї дії**: `answer` чекає на вердикт, `goNext` на збільшення прогресу
  або на результати. Тест ніколи не мусить знати, на що чекати після кліку.
- **Методи-перевірки називаються `expect*()`** (`shell.expectSignedIn`, `auth.expectError`). Лінт
  налаштований рахувати їх як assertions (`expect-expect` з `assertFunctionPatterns`).
- **Чого немає:** бізнес-assertions сценарію («XP виріс на ≥ суми») живуть у тесті. Page object
  описує *як* взаємодіяти, тест описує *що* перевіряємо. Якщо page object почне перевіряти
  бізнес-правила, його не можна буде перевикористати в негативних сценаріях.

### Композиція замість успадкування

Немає `BasePage` з `goto`, `shell` і «всім потрібним». Shell — окремий компонент, page objects
окремі, а фікстура дає тесту ті, що йому потрібні:

```ts
test('...', async ({ quiz, shell, api }) => { ... })
```

`BasePage` з часом обростає всім підряд, і кожна сторінка тягне за собою те, що їй не потрібно.
Композиція дає маленькі класи і явні залежності тесту.

## 3. Shell: один API на три розкладки

Застосунок має три розкладки (сайдбар, іконковий rail, таббар + шторка «Ще»). На телефоні
`nav-chat` живе в шторці, яку треба спершу відкрити. Тест пише одне:

```ts
await shell.open('chat');
```

а компонент знає, що на `phone` для не-основних посилань спершу треба `openMoreSheet()`. Звідки
він знає пристрій: проєкт у конфігу передає опцію `device`, фікстура `shell` створює
`new Shell(page, device)`.

**Умовна логіка живе в компоненті, не в тесті.** `expectLayout()` містить `switch (device)`, а
тест лише каже `await shell.expectLayout()`. Лінт (`no-conditional-in-test`) забороняє `if` у
тестах: тест з гілками перевіряє різні речі на різних прогонах, і зелений результат нічого не
гарантує. Єдиний виняток — `test.skip(умова, причина)`, документоване рішення «на цьому пристрої
тест не має сенсу» (дозволено через `allowConditional`).

## 4. Чому `xp-total` читаємо, а не дивимось

`xp-total` видно лише в тултіпі після hover. `toBeVisible()` на ньому впаде, але `data-value`
читається і з прихованого елемента. `shell.totalXp()` інкапсулює цю особливість: тестам не треба
знати про тултіп.

## Експеримент (15 хв)

1. У `QuizPage.answer()` прибери `await expect(this.verdict).toBeVisible()` і запусти
   `quiz.spec.ts --repeat-each=5`. Що зламалось і чому не завжди? Поверни.
2. Заміни в `shell.open` перевірку `isPhone` на `false` і запусти `shell.spec.ts --project=phone`.
   Прочитай trace: на якому кроці і чому впало?
3. Напиши в тесті `page.locator('.opt')` і запусти `npm run lint`.

## Практика (1–1.5 год)

**Завдання A. `RecallPage` + тест сесії повторення.** Хуки: `$APP_DIR/docs/test-ids.md`, розділ
Recall (`recall-topic`, `recall-count`, `recall-start`, `recall-card` зі state `front|back`,
`recall-reveal`, `recall-rate` 1..5, `recall-done`, `recall-avg`, `recall-done-count`).
- [ ] Page object у `src/pages/recall-page.ts`, фікстура `recall` у `fixtures/index.ts`.
- [ ] Тест: старт сесії з 10 карток теми `sql`, на кожній reveal → rate; в кінці `recall-done`,
      `recall-done-count` дорівнює кількості карток, `recall-avg` відповідає виставленим оцінкам.
- [ ] Жодного тексту в локаторах, жодних `waitForTimeout`; `--repeat-each=5` зелений.

**Завдання B. `LeaderboardPage` + перемикання періоду.** `leaderboard-period[data-key=week]`
з `aria-pressed`, `leaderboard` зі state `all|week`.
- [ ] Тест: гість відкриває рейтинг, перемикає на week, state і URL (`?period=week`) змінились.
- [ ] Позначити `@responsive`, щоб пройшов на трьох в'юпортах через `shell.open('leaderboard')`.

## Питання на співбесіді

1. Яку стратегію локаторів ви обираєте і чому? Що робите, коли test id немає?
2. Що має і чого не має бути в Page Object? Де мають жити assertions?
3. Успадкування від `BasePage` чи композиція: плюси й мінуси.
4. Як підтримувати тести для desktop і mobile без дублювання?
5. Чому `if` у тесті — поганий знак?

Еталонні відповіді: [INTERVIEW.md](../INTERVIEW.md#модуль-2).
