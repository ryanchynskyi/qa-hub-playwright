# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/quiz.spec.ts >> guest quiz >> all answers correct: 100 %, a bonus, and XP grows by at least the shown gains
- Location: tests/e2e/quiz.spec.ts:32:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.getAttribute: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('xp-total')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - 'link "QA Interview Hub: дашборд" [ref=e5] [cursor=pointer]':
        - /url: /dash
        - generic [ref=e7]: qa-hub$_
      - navigation "Бічне меню" [ref=e8]:
        - generic [ref=e9]:
          - paragraph [ref=e10]: Навчання
          - link "Головна" [ref=e11] [cursor=pointer]:
            - /url: /dash
            - generic [ref=e12]: "01"
          - link "Статистика" [ref=e14] [cursor=pointer]:
            - /url: /stats
            - generic [ref=e15]: "02"
          - link "Тести" [ref=e17] [cursor=pointer]:
            - /url: /quiz
            - generic [ref=e18]: "03"
          - link "Картки" [ref=e20] [cursor=pointer]:
            - /url: /recall
            - generic [ref=e21]: "04"
          - link "База знань" [ref=e23] [cursor=pointer]:
            - /url: /kb
            - generic [ref=e24]: "05"
          - link "Курси" [ref=e26] [cursor=pointer]:
            - /url: /course
            - generic [ref=e27]: "06"
        - generic [ref=e29]:
          - paragraph [ref=e30]: Спільнота
          - link "Лідери" [ref=e31] [cursor=pointer]:
            - /url: /leaderboard
            - generic [ref=e32]: "07"
      - generic [ref=e34]:
        - button "Підтримати автора" [ref=e35] [cursor=pointer]
        - link "Що нового" [ref=e40] [cursor=pointer]:
          - /url: /whats-new
        - link "Про сайт" [ref=e43] [cursor=pointer]:
          - /url: /tutorial
        - button "Повідомити про баг" [ref=e45] [cursor=pointer]
        - button "Відгук" [ref=e47] [cursor=pointer]
        - generic [ref=e49]:
          - generic [ref=e50]: Мова
          - group "Мова" [ref=e51]:
            - button "UA" [pressed] [ref=e52] [cursor=pointer]
            - button "EN" [ref=e53] [cursor=pointer]
        - generic [ref=e54]:
          - 'link "Гість: Профіль" [ref=e55] [cursor=pointer]':
            - /url: /profile
            - generic [ref=e56]: Г
            - generic [ref=e57]: Гість
          - link "Увійти" [ref=e59] [cursor=pointer]:
            - /url: /login?next=%2Fquiz%2Fsql
    - generic [ref=e62]:
      - generic [ref=e63]:
        - banner [ref=e64]:
          - generic [ref=e65]:
            - paragraph [ref=e66]: qa-hub / Тести
            - generic [ref=e67]:
              - link "Увійти" [ref=e68] [cursor=pointer]:
                - /url: /login?next=%2Fquiz%2Fsql
              - button "Світла тема" [ref=e69] [cursor=pointer]
        - paragraph [ref=e73]:
          - generic [ref=e74]: Гостьовий режим · прогрес лише в цьому браузері
          - generic [ref=e75]:
            - link "Увійти" [ref=e76] [cursor=pointer]:
              - /url: /login?next=%2Fquiz%2Fsql
            - text: ·
            - link "Створити акаунт" [ref=e77] [cursor=pointer]:
              - /url: /register?next=%2Fquiz%2Fsql
      - main [ref=e79]:
        - heading "Тести" [level=1] [ref=e80]
        - generic [ref=e81]:
          - complementary [ref=e82]:
            - tablist [ref=e83]:
              - generic [ref=e84]:
                - generic [ref=e85]: Автоматизація
                - tab "— Playwright 101" [ref=e86] [cursor=pointer]:
                  - generic [ref=e87]: —
                  - generic "Playwright" [ref=e88]
                  - generic [ref=e89]: "101"
                - tab "— Cypress 92" [ref=e90] [cursor=pointer]:
                  - generic [ref=e91]: —
                  - generic "Cypress" [ref=e92]
                  - generic [ref=e93]: "92"
                - tab "— TypeScript 62" [ref=e94] [cursor=pointer]:
                  - generic [ref=e95]: —
                  - generic "TypeScript" [ref=e96]
                  - generic [ref=e97]: "62"
                - 'tab "— Playwright: Code review 50" [ref=e98] [cursor=pointer]':
                  - generic [ref=e99]: —
                  - 'generic "Playwright: Code review" [ref=e100]'
                  - generic [ref=e101]: "50"
                - 'tab "— TypeScript: Code review 50" [ref=e102] [cursor=pointer]':
                  - generic [ref=e103]: —
                  - 'generic "TypeScript: Code review" [ref=e104]'
                  - generic [ref=e105]: "50"
                - tab "— Selenium + Java 40" [ref=e106] [cursor=pointer]:
                  - generic [ref=e107]: —
                  - generic "Selenium + Java" [ref=e108]
                  - generic [ref=e109]: "40"
                - tab "— Java Core 41" [ref=e110] [cursor=pointer]:
                  - generic [ref=e111]: —
                  - generic "Java Core" [ref=e112]
                  - generic [ref=e113]: "41"
                - tab "— Appium 30" [ref=e114] [cursor=pointer]:
                  - generic [ref=e115]: —
                  - generic "Appium" [ref=e116]
                  - generic [ref=e117]: "30"
              - generic [ref=e118]:
                - generic [ref=e119]: Основи QA
                - tab "— QA Fundamentals 164" [ref=e120] [cursor=pointer]:
                  - generic [ref=e121]: —
                  - generic "QA Fundamentals" [ref=e122]
                  - generic [ref=e123]: "164"
                - tab "— SQL 65" [selected] [ref=e124] [cursor=pointer]:
                  - generic [ref=e125]: —
                  - generic "SQL" [ref=e126]
                  - generic [ref=e127]: "65"
                - tab "— API 167" [ref=e128] [cursor=pointer]:
                  - generic [ref=e129]: —
                  - generic "API" [ref=e130]
                  - generic [ref=e131]: "167"
                - tab "— System Design 37" [ref=e132] [cursor=pointer]:
                  - generic [ref=e133]: —
                  - generic "System Design" [ref=e134]
                  - generic [ref=e135]: "37"
                - tab "— Patterns 33" [ref=e136] [cursor=pointer]:
                  - generic [ref=e137]: —
                  - generic "Patterns" [ref=e138]
                  - generic [ref=e139]: "33"
                - tab "— CI/CD 40" [ref=e140] [cursor=pointer]:
                  - generic [ref=e141]: —
                  - generic "CI/CD" [ref=e142]
                  - generic [ref=e143]: "40"
                - 'tab "— Product Engineering: basics 51" [ref=e144] [cursor=pointer]':
                  - generic [ref=e145]: —
                  - 'generic "Product Engineering: basics" [ref=e146]'
                  - generic [ref=e147]: "51"
                - tab "— Networking 41" [ref=e148] [cursor=pointer]:
                  - generic [ref=e149]: —
                  - generic "Networking" [ref=e150]
                  - generic [ref=e151]: "41"
                - tab "— Logs and observability 25" [ref=e152] [cursor=pointer]:
                  - generic [ref=e153]: —
                  - generic "Logs and observability" [ref=e154]
                  - generic [ref=e155]: "25"
                - tab "— Performance Testing 30" [ref=e156] [cursor=pointer]:
                  - generic [ref=e157]: —
                  - generic "Performance Testing" [ref=e158]
                  - generic [ref=e159]: "30"
              - generic [ref=e160]:
                - generic [ref=e161]: AI
                - 'tab "— AI: basics and testing agents 46" [ref=e162] [cursor=pointer]':
                  - generic [ref=e163]: —
                  - 'generic "AI: basics and testing agents" [ref=e164]'
                  - generic [ref=e165]: "46"
          - generic [ref=e167]:
            - generic [ref=e168]:
              - 'heading "SQL: налаштування спроби" [level=2] [ref=e169]': SQL
              - generic [ref=e170]: 65 питань
              - button "Скинути прогрес теми" [ref=e171] [cursor=pointer]: Скинути
            - group "0 з 65 правильно" [ref=e172]:
              - generic [ref=e173]:
                - generic [ref=e174]: "0"
                - generic [ref=e175]: Правильно
              - generic [ref=e176]:
                - generic [ref=e177]: "0"
                - generic [ref=e178]: Помилки
              - generic [ref=e179]:
                - generic [ref=e180]: "65"
                - generic [ref=e181]: Нові
            - generic [ref=e182]:
              - generic [ref=e183]: Швидкий старт
              - generic [ref=e184]:
                - button "Швидкі · 10" [pressed] [ref=e185] [cursor=pointer]
                - button "Помилки · 0" [disabled] [ref=e186]
                - button "Нові · 65" [ref=e187] [cursor=pointer]
                - button "Усі · 65" [ref=e188] [cursor=pointer]
            - generic [ref=e189]:
              - generic [ref=e190]:
                - generic [ref=e191]: Рівень
                - group "Рівень" [ref=e192]:
                  - button "Усі" [pressed] [ref=e193] [cursor=pointer]
                  - button "Junior" [ref=e194] [cursor=pointer]
                  - button "Middle" [ref=e195] [cursor=pointer]
                  - button "Senior" [ref=e196] [cursor=pointer]
              - generic [ref=e197]:
                - generic [ref=e198]: Питань за раз
                - group "Питань за раз" [ref=e199]:
                  - button "10" [pressed] [ref=e200] [cursor=pointer]
                  - button "20" [ref=e201] [cursor=pointer]
                  - button "Усі" [ref=e202] [cursor=pointer]
              - generic [ref=e203]:
                - generic [ref=e204]: Розділи
                - generic [ref=e205]:
                  - button "Усі розділи" [pressed] [ref=e206] [cursor=pointer]
                  - button "Агрегація" [ref=e207] [cursor=pointer]
                  - button "JOIN" [ref=e208] [cursor=pointer]
                  - button "Функції і вирази" [ref=e209] [cursor=pointer]
                  - button "Основи запитів" [ref=e210] [cursor=pointer]
                  - button "Зміна даних" [ref=e211] [cursor=pointer]
                  - button "Віконні функції" [ref=e212] [cursor=pointer]
                  - button "Транзакції" [ref=e213] [cursor=pointer]
                  - button "Проєктування" [ref=e214] [cursor=pointer]
                  - button "Підзапити і CTE" [ref=e215] [cursor=pointer]
                  - button "Індекси" [ref=e216] [cursor=pointer]
                  - button "QA-практика" [ref=e217] [cursor=pointer]
                  - button "Основи баз даних" [ref=e218] [cursor=pointer]
                  - button "Задачі зі співбесід" [ref=e219] [cursor=pointer]
            - 'button "Почати: 10 питань" [ref=e221] [cursor=pointer]':
              - text: "Почати: 10 питань"
              - generic [aria-hidden] [ref=e222]: →
      - contentinfo [ref=e223]:
        - generic [ref=e224]:
          - generic [ref=e225]:
            - link "qa-hub$_" [ref=e226] [cursor=pointer]:
              - /url: /dash
            - paragraph [ref=e227]: Платформа підготовки до співбесіди QA Engineer.
            - generic [ref=e228]:
              - link "Telegram-канал" [ref=e229] [cursor=pointer]:
                - /url: https://t.me/qa_interview_hub
              - group "Мова" [ref=e232]:
                - button "UA" [pressed] [ref=e233] [cursor=pointer]
                - button "EN" [ref=e234] [cursor=pointer]
            - paragraph [ref=e235]: Клавіші 1–4 відповідь · S або 0 пропуск · Enter далі
          - navigation "Акаунт" [ref=e236]:
            - heading "Акаунт" [level=3] [ref=e237]
            - link "Профіль" [ref=e238] [cursor=pointer]:
              - /url: /profile
            - link "Конфіденційність" [ref=e239] [cursor=pointer]:
              - /url: /privacy.html
  - status
```

# Test source

```ts
  1  | import type { Locator, Page } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * Locator by test id, optionally narrowed by `data-key`.
  5  |  *
  6  |  * Repeated items share one test id and carry their identity in `data-key` (section id, question
  7  |  * id, option index, language...): `byTestId(page, 'quiz-section', 'sql')`. Visible text is never
  8  |  * used: the UI is bilingual (docs/brief.md §5).
  9  |  */
  10 | export function byTestId(scope: Page | Locator, id: string, key?: string | number): Locator {
  11 |   if (key === undefined) return scope.getByTestId(id);
  12 |   return scope.locator(`[data-testid="${id}"][data-key="${key}"]`);
  13 | }
  14 | 
  15 | /**
  16 |  * Reads a number from a data attribute (`data-value` by default, or `data-total`). The app puts
  17 |  * raw numbers there so tests never parse localised text like "усього 42 XP".
  18 |  */
  19 | export async function numberValue(
  20 |   locator: Locator,
  21 |   attribute: 'data-value' | 'data-total' = 'data-value',
  22 | ): Promise<number> {
> 23 |   const raw = await locator.getAttribute(attribute);
     |                             ^ Error: locator.getAttribute: Test timeout of 30000ms exceeded.
  24 |   const value = Number(raw);
  25 |   if (raw === null || raw === '' || Number.isNaN(value)) {
  26 |     throw new Error(`${attribute} of ${locator.toString()} is not a number: ${raw}`);
  27 |   }
  28 |   return value;
  29 | }
  30 | 
```