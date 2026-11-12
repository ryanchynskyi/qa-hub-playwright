# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/shell.spec.ts >> shell navigation >> secondary links are reachable on every layout
- Location: tests/e2e/shell.spec.ts:28:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('nav-chat')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - 'link "QA Interview Hub: дашборд" [ref=e5] [cursor=pointer]':
        - /url: /dash
        - text: qa $_
      - navigation "Бічне меню" [ref=e6]:
        - paragraph [ref=e7]: Learn
        - link "Dashboard" [ref=e8] [cursor=pointer]:
          - /url: /dash
        - link "Stats" [ref=e14] [cursor=pointer]:
          - /url: /stats
        - link "Quizzes" [ref=e17] [cursor=pointer]:
          - /url: /quiz
        - link "Active Recall" [ref=e21] [cursor=pointer]:
          - /url: /recall
        - link "Knowledge base" [ref=e25] [cursor=pointer]:
          - /url: /kb
        - link "Courses" [ref=e29] [cursor=pointer]:
          - /url: /course
        - button "AI-interview" [ref=e34] [cursor=pointer]
        - paragraph [ref=e38]: Community
        - link "Leaderboard" [active] [ref=e39] [cursor=pointer]:
          - /url: /leaderboard
      - generic [ref=e43]:
        - link "What's New" [ref=e44] [cursor=pointer]:
          - /url: /whats-new
        - link "About" [ref=e49] [cursor=pointer]:
          - /url: /tutorial
        - button "Report a bug" [ref=e54] [cursor=pointer]
        - button "Feedback form" [ref=e59] [cursor=pointer]
        - group "Мова" [ref=e63]:
          - button "UA" [pressed] [ref=e64] [cursor=pointer]
          - button "EN" [ref=e65] [cursor=pointer]
        - 'link "Гість: Профіль" [ref=e67] [cursor=pointer]':
          - /url: /profile
    - generic [ref=e72]:
      - banner [ref=e73]:
        - generic [ref=e74]:
          - paragraph [ref=e75]: qa-hub / Таблиця лідерів
          - generic [ref=e76]:
            - 'link "Рівень і XP: профіль" [ref=e78] [cursor=pointer]':
              - /url: /profile
              - generic [ref=e79]:
                - text: LVL 1
                - generic [ref=e80]: · Trainee
            - 'generic "Серії поки немає: дай відповідь на питання, повтори картку або прочитай статтю" [ref=e82]':
              - generic [ref=e85]: "Серія:"
              - text: 0 дн.
            - button "Світла тема" [ref=e86] [cursor=pointer]
      - generic [ref=e90]:
        - paragraph [ref=e91]:
          - generic [ref=e93]:
            - text: Гостьовий режим · прогрес лише в цьому браузері.
            - link "Увійти" [ref=e94] [cursor=pointer]:
              - /url: /login?next=%2Fleaderboard
            - text: ·
            - link "Створити акаунт" [ref=e95] [cursor=pointer]:
              - /url: /register?next=%2Fleaderboard
        - main [ref=e96]:
          - generic [ref=e97]:
            - generic [ref=e98]:
              - generic [ref=e99]:
                - paragraph [ref=e100]: $ npx qa-hub leaderboard
                - heading "Таблиця лідерів" [level=1] [ref=e101]
                - paragraph [ref=e102]: Рейтинг акаунтів за XP. Гості в рейтинг не потрапляють.
              - group "Період" [ref=e103]:
                - button "Увесь час" [pressed] [ref=e104] [cursor=pointer]
                - button "7 днів" [ref=e105] [cursor=pointer]
            - complementary [ref=e106]:
              - button "Закрити" [ref=e107] [cursor=pointer]: ×
              - heading "Тебе тут ще немає" [level=3] [ref=e108]
              - paragraph [ref=e109]: Увійди, і твій XP потрапить у таблицю лідерів.
              - generic [ref=e110]:
                - link "Продовжити з Google" [ref=e111] [cursor=pointer]:
                  - /url: /api/auth/google?next=%2Fleaderboard&tz=Europe%2FKyiv
                - link "Увійти" [ref=e117] [cursor=pointer]:
                  - /url: /login?next=%2Fleaderboard
                - link "Створити акаунт" [ref=e118] [cursor=pointer]:
                  - /url: /register?next=%2Fleaderboard
            - region "Таблиця лідерів" [ref=e119]:
              - paragraph [ref=e120]: "Поки нікого немає: набери XP першим."
      - contentinfo [ref=e121]:
        - generic [ref=e122]:
          - generic [ref=e123]:
            - link "qa-hub$_" [ref=e124] [cursor=pointer]:
              - /url: /dash
            - paragraph [ref=e125]: Платформа підготовки до співбесіди QA Engineer.
            - generic [ref=e126]:
              - link "Telegram-канал" [ref=e127] [cursor=pointer]:
                - /url: https://t.me/qa_interview_hub
              - link "Підтримати проєкт" [ref=e130] [cursor=pointer]:
                - /url: https://send.monobank.ua/8XNQ4uPrK2
                - generic [aria-hidden] [ref=e131]: 💙
                - text: Підтримати проєкт
              - group "Мова" [ref=e132]:
                - button "UA" [pressed] [ref=e133] [cursor=pointer]
                - button "EN" [ref=e134] [cursor=pointer]
          - navigation "Акаунт" [ref=e135]:
            - heading "Акаунт" [level=3] [ref=e136]
            - link "Профіль" [ref=e137] [cursor=pointer]:
              - /url: /profile
            - link "Конфіденційність" [ref=e138] [cursor=pointer]:
              - /url: /privacy.html
  - status
  - button "Підтримати проєкт" [ref=e139] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, type Locator, type Page } from '@playwright/test';
  2   | import type { Lang } from '../api/schemas';
  3   | import type { Device } from '../fixtures';
  4   | import { byTestId, numberValue } from '../helpers/locators';
  5   | 
  6   | /** Main links are on every layout; the rest live in the "Ще" (More) sheet on phones. */
  7   | const MAIN_LINKS = ['dash', 'quiz', 'recall', 'kb'] as const;
  8   | export type NavTarget =
  9   |   | (typeof MAIN_LINKS)[number]
  10  |   | 'leaderboard'
  11  |   | 'chat'
  12  |   | 'tutorial'
  13  |   | 'profile'
  14  |   | 'bug'
  15  |   | 'feedback';
  16  | 
  17  | /**
  18  |  * The app shell around every page: navigation, level/XP, language switch, account row.
  19  |  *
  20  |  * It hides the layout differences (docs/brief.md §10) so tests read the same on every project:
  21  |  * desktop/tablet have a sidebar, phones a bottom tab bar plus the More sheet. A test says
  22  |  * `shell.open('chat')`, and the component knows to open the sheet first on a phone.
  23  |  */
  24  | export class Shell {
  25  |   readonly sidebar: Locator;
  26  |   readonly tabbar: Locator;
  27  |   readonly breadcrumb: Locator;
  28  |   readonly moreButton: Locator;
  29  |   readonly moreSheet: Locator;
  30  |   readonly accountGuest: Locator;
  31  |   readonly account: Locator;
  32  | 
  33  |   constructor(
  34  |     readonly page: Page,
  35  |     readonly device: Device,
  36  |   ) {
  37  |     this.sidebar = page.getByTestId('sidebar');
  38  |     this.tabbar = page.getByTestId('tabbar');
  39  |     this.breadcrumb = page.getByTestId('breadcrumb');
  40  |     this.moreButton = page.getByTestId('nav-more');
  41  |     this.moreSheet = page.getByTestId('more-sheet');
  42  |     this.accountGuest = page.getByTestId('account-guest');
  43  |     this.account = page.getByTestId('account');
  44  |   }
  45  | 
  46  |   get isPhone(): boolean {
  47  |     return this.device === 'phone';
  48  |   }
  49  | 
  50  |   link(target: NavTarget | 'logout'): Locator {
  51  |     return this.page.getByTestId(`nav-${target}`);
  52  |   }
  53  | 
  54  |   async open(target: NavTarget): Promise<void> {
  55  |     if (this.isPhone && !(MAIN_LINKS as readonly string[]).includes(target)) {
  56  |       await this.openMoreSheet();
  57  |     }
> 58  |     await this.link(target).click();
      |                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  59  |   }
  60  | 
  61  |   /** Active main link: `aria-current="page"` (only main links are visible on every layout). */
  62  |   async expectActive(target: (typeof MAIN_LINKS)[number]): Promise<void> {
  63  |     await expect(this.link(target)).toHaveAttribute('aria-current', 'page');
  64  |   }
  65  | 
  66  |   async openMoreSheet(): Promise<void> {
  67  |     await this.moreButton.click();
  68  |     await expect(this.moreSheet).toBeVisible();
  69  |   }
  70  | 
  71  |   /** Total XP from `xp-total`; its data-value is readable even while the tooltip is hidden. */
  72  |   totalXp(): Promise<number> {
  73  |     return numberValue(this.page.getByTestId('xp-total'));
  74  |   }
  75  | 
  76  |   /** Switches the UI language with the UA/EN buttons (in the More sheet on phones). */
  77  |   async switchLanguage(lang: Lang): Promise<void> {
  78  |     if (this.isPhone) await this.openMoreSheet();
  79  |     await byTestId(this.page.getByTestId('lang-switch-topbar'), 'lang-option', lang).click();
  80  |     await this.expectLanguage(lang);
  81  |   }
  82  | 
  83  |   /** The app sets `<html lang>` on every language change. */
  84  |   async expectLanguage(lang: Lang): Promise<void> {
  85  |     await expect(this.page.locator('html')).toHaveAttribute('lang', lang);
  86  |   }
  87  | 
  88  |   /**
  89  |    * Layout rules per viewport (docs/brief.md §10). The branching lives here, not in the test:
  90  |    * a spec states "the layout matches the device" and runs unchanged on every project.
  91  |    */
  92  |   async expectLayout(): Promise<void> {
  93  |     switch (this.device) {
  94  |       case 'desktop':
  95  |         await expect(this.sidebar).toBeVisible();
  96  |         await expect(this.breadcrumb).toBeVisible();
  97  |         await expect(this.tabbar).toHaveCount(0);
  98  |         break;
  99  |       case 'tablet': {
  100 |         // Icon rail: a narrow sidebar whose links are named by aria-label instead of text.
  101 |         await expect(this.sidebar).toBeVisible();
  102 |         const box = await this.sidebar.boundingBox();
  103 |         expect(box?.width, 'icon rail width').toBeLessThanOrEqual(64);
  104 |         await expect(this.link('quiz')).toHaveAttribute('aria-label', /\w+/);
  105 |         break;
  106 |       }
  107 |       case 'phone':
  108 |         await expect(this.sidebar).toHaveCount(0);
  109 |         await expect(this.tabbar).toBeVisible();
  110 |         await expect(this.moreButton).toBeVisible();
  111 |         break;
  112 |     }
  113 |   }
  114 | 
  115 |   async expectSignedIn(email: string): Promise<void> {
  116 |     if (this.isPhone) await this.openMoreSheet();
  117 |     await expect(this.account).toContainText(email);
  118 |     if (this.isPhone) await this.page.keyboard.press('Escape');
  119 |   }
  120 | 
  121 |   /** Signs out and waits for the guest row: logout finishes asynchronously (brief §13). */
  122 |   async logout(): Promise<void> {
  123 |     if (this.isPhone) await this.openMoreSheet();
  124 |     await this.link('logout').click();
  125 |     await expect(this.accountGuest).toBeVisible();
  126 |   }
  127 | }
  128 | 
```