# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/account.spec.ts >> AUTH-09 Google sign-in and unverified account >> Google sign-in with the email of an unverified password account clears its password
- Location: tests/e2e/account.spec.ts:155:3

# Error details

```
Error: page.goto: Navigation to "http://localhost:4273/profile" is interrupted by another navigation to "http://localhost:4273/dash"
Call log:
  - navigating to "http://localhost:4273/profile", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=f3e2]:
  - link "Перейти до вмісту" [ref=f3e3]:
    - /url: "#main-content"
  - generic [ref=f3e4]:
    - complementary "Бічна панель" [ref=f3e5]:
      - 'link "QA Interview Hub: дашборд" [ref=f3e6]':
        - /url: /dash
        - generic [ref=f3e9]: qa-hub
      - navigation "Бічне меню" [ref=f3e10]:
        - generic [ref=f3e11]:
          - paragraph [ref=f3e12]: Навчання
          - link "Головна" [ref=f3e13]:
            - /url: /dash
            - generic [ref=f3e14]: "01"
          - link "Статистика" [ref=f3e16]:
            - /url: /stats
            - generic [ref=f3e17]: "02"
          - link "Тести" [ref=f3e19]:
            - /url: /quiz
            - generic [ref=f3e20]: "03"
          - link "Картки" [ref=f3e22]:
            - /url: /recall
            - generic [ref=f3e23]: "04"
          - link "База знань" [ref=f3e25]:
            - /url: /kb
            - generic [ref=f3e26]: "05"
          - link "Курси" [ref=f3e28]:
            - /url: /course
            - generic [ref=f3e29]: "06"
        - generic [ref=f3e31]:
          - paragraph [ref=f3e32]: Спільнота
          - link "Лідери" [ref=f3e33]:
            - /url: /leaderboard
            - generic [ref=f3e34]: "07"
      - generic [ref=f3e36]:
        - link "Знайди баг" [ref=f3e37]:
          - /url: /bug
        - button "Підтримати автора" [ref=f3e39] [cursor=pointer]
        - button "Доступність" [ref=f3e44] [cursor=pointer]
        - button "Повідомити про баг" [ref=f3e46] [cursor=pointer]
        - button "Відгук" [ref=f3e48] [cursor=pointer]
        - generic [ref=f3e50]:
          - generic [ref=f3e51]: Мова
          - group "Мова" [ref=f3e52]:
            - button "UA" [pressed] [ref=f3e53] [cursor=pointer]
            - button "EN" [ref=f3e54] [cursor=pointer]
        - generic [ref=f3e55]:
          - 'link "Гість: Профіль" [ref=f3e56]':
            - /url: /profile
            - generic [ref=f3e57]: Г
            - generic [ref=f3e58]: Гість
          - link "Увійти" [ref=f3e60] [cursor=pointer]:
            - /url: /login?next=%2Fdash
    - generic [ref=f3e63]:
      - banner [ref=f3e65]:
        - generic [ref=f3e66]:
          - paragraph [ref=f3e67]: qa-hub / Головна
          - generic [ref=f3e68]:
            - link "Увійти" [ref=f3e69]:
              - /url: /login?next=%2Fdash
            - button "Світла тема" [ref=f3e70] [cursor=pointer]
        - paragraph [ref=f3e74]:
          - generic [ref=f3e75]: Гостьовий режим · прогрес лише в цьому браузері
          - generic [ref=f3e76]:
            - link "Увійти" [ref=f3e77]:
              - /url: /login?next=%2Fdash
            - text: ·
            - link "Створити акаунт" [ref=f3e78]:
              - /url: /register?next=%2Fdash
      - main [ref=f3e80]:
        - generic [ref=f3e81]:
          - generic [ref=f3e82]:
            - heading "Привіт." [level=1] [ref=f3e83]
            - paragraph [ref=f3e84]: Щодня беремо найслабші теми.
          - paragraph [ref=f3e85]:
            - text: Показуємо всі теми.
            - button "Налаштувати фокус" [ref=f3e86] [cursor=pointer]
          - region [ref=f3e87]:
            - heading "Готовність" [level=2] [ref=f3e88]
            - generic [ref=f3e89]:
              - img "Готовність 0 зі 100" [ref=f3e90]:
                - generic [aria-hidden] [ref=f3e91]: "0"
              - generic [ref=f3e92]:
                - term [ref=f3e93]: Мета
                - definition [ref=f3e94]: "70"
            - img "0 зі 100, мета 70" [ref=f3e95]
            - button "чому 0? ›" [ref=f3e97] [cursor=pointer]
          - link "Далі в плані · 1 / 3 10 питань Почати →" [ref=f3e98]:
            - /url: /quiz?pick=1
            - generic [ref=f3e99]: Далі в плані · 1 / 3
            - generic [ref=f3e100]: 10 питань
            - generic [ref=f3e101] [cursor=pointer]: Почати →
          - generic [ref=f3e102]:
            - generic [ref=f3e103]:
              - heading "План на сьогодні · 0 з 3" [level=2] [ref=f3e104]
              - generic [ref=f3e105]: +50 XP за всі
            - list [ref=f3e106]:
              - listitem [ref=f3e107]:
                - 'link "Тест: 10 питань" [ref=f3e108]':
                  - /url: /quiz?pick=1
                  - generic [aria-hidden] [ref=f3e111]: ›
                - generic [ref=f3e112]: 0/10 · +30 XP
                - generic [ref=f3e113]: TODO
              - listitem [ref=f3e114]:
                - 'link "Код: знайди помилку · 3" [ref=f3e115]':
                  - /url: /quiz/pwfix
                  - generic [aria-hidden] [ref=f3e118]: ›
                - generic [ref=f3e119]: 0/3 · +35 XP
                - generic [ref=f3e120]: TODO
              - listitem [ref=f3e121]:
                - 'link "Тест: 10+ питань на 80%+" [ref=f3e122]':
                  - /url: /quiz?pick=1
                  - generic [aria-hidden] [ref=f3e125]: ›
                - generic [ref=f3e126]: 0/1 · +40 XP
                - generic [ref=f3e127]: TODO
            - paragraph [ref=f3e128]:
              - text: "План складаємо з найслабших тем.Завдань на день: 3 ·"
              - link "змінити" [ref=f3e129]:
                - /url: /profile
            - generic [ref=f3e130]: RUN
            - generic [ref=f3e131]: reset через 10 год 3 хв
          - region [ref=f3e132]:
            - heading "Найслабші теми" [level=2] [ref=f3e133]
            - link "Playwright —" [ref=f3e134]:
              - /url: /quiz/playwright
              - generic [ref=f3e135]: Playwright
              - generic [ref=f3e138]: —
            - link "Cypress —" [ref=f3e139]:
              - /url: /quiz/cypress
              - generic [ref=f3e140]: Cypress
              - generic [ref=f3e143]: —
            - link "TypeScript —" [ref=f3e144]:
              - /url: /quiz/typescript
              - generic [ref=f3e145]: TypeScript
              - generic [ref=f3e148]: —
          - region [ref=f3e149]:
            - generic [ref=f3e150]:
              - heading "Питання дня" [level=2] [ref=f3e151]
              - generic [ref=f3e152]: "28.11"
            - paragraph [ref=f3e153]: Що не так з цим кодом і як виправити?
            - code [ref=f3e155]: "const base = { name: 'QA', address: { city: 'Kraków' } }; const copy = { ...base }; copy.address.city = 'Warszawa'; // base.address.city is now 'Warszawa'"
            - group "Варіанти відповіді" [ref=f3e156]:
              - 'button "1 Spread не копіює вкладені обʼєкти: замінити на Object.assign({}, base), який копіює глибоко" [ref=f3e157] [cursor=pointer]':
                - generic [ref=f3e158]: "1"
                - generic [ref=f3e159]:
                  - text: "Spread не копіює вкладені обʼєкти: замінити на"
                  - code [ref=f3e160]: "Object.assign({}, base)"
                  - text: ", який копіює глибоко"
              - 'button "2 Spread копіює поверхнево: для глибокої копії structuredClone(base)" [ref=f3e161] [cursor=pointer]':
                - generic [ref=f3e162]: "2"
                - generic [ref=f3e163]:
                  - text: "Spread копіює поверхнево: для глибокої копії"
                  - code [ref=f3e164]: structuredClone(base)
              - button "3 Потрібен readonly" [ref=f3e165] [cursor=pointer]:
                - generic [ref=f3e166]: "3"
                - generic [ref=f3e167]: Потрібен readonly
              - button "4 Код коректний, змін не потрібно" [ref=f3e168] [cursor=pointer]:
                - generic [ref=f3e169]: "4"
                - generic [ref=f3e170]: Код коректний, змін не потрібно
            - status [ref=f3e171]
          - generic [ref=f3e172]:
            - region "Гра «Знайди баг»" [ref=f3e173]:
              - generic [aria-hidden] [ref=f3e174]:
                - generic [ref=f3e185]: "1"
                - generic [ref=f3e186]: "2"
                - generic [ref=f3e187]: "?"
                - generic [ref=f3e188]: ГРА
              - generic [ref=f3e189]:
                - generic [ref=f3e190]:
                  - generic [ref=f3e191]: ЗНАЙДИ БАГ · РІВЕНЬ 1 З 20
                  - heading "Форма реєстрації" [level=2] [ref=f3e192]
                  - paragraph [ref=f3e193]: 3 баги, 90 секунд. Один видно лише в DevTools.
                - generic [ref=f3e194]:
                  - generic [ref=f3e195]:
                    - generic [ref=f3e196]: 0/20
                    - generic [ref=f3e197]: пройдено
                  - generic [ref=f3e198]:
                    - generic [ref=f3e199]: —
                    - generic [ref=f3e200]: твій рекорд
                  - generic [ref=f3e201]:
                    - generic [ref=f3e202]: —
                    - generic [ref=f3e203]: сьогодні
                - link "Відкрити гру" [ref=f3e204]:
                  - /url: /bug/signup-form
            - region "Гра «Рев'ю PR»" [ref=f3e207]:
              - generic [aria-hidden] [ref=f3e208]:
                - generic [ref=f3e219]: "1"
                - generic [ref=f3e220]: "2"
                - generic [ref=f3e221]: "?"
                - generic [ref=f3e222]: НОВЕ
              - generic [ref=f3e223]:
                - generic [ref=f3e224]:
                  - generic [ref=f3e225]: "PR #1 · РІВЕНЬ 1 З 12"
                  - heading "Тести логіну" [level=2] [ref=f3e226]
                  - paragraph [ref=f3e227]: "Джун відкрив PR з автотестами. Знайди проблеми до мерджу: хардкод, жорсткі очікування, крихкі локатори. Таймер 2:00."
                - generic [ref=f3e228]:
                  - generic [ref=f3e229]:
                    - generic [ref=f3e230]: 0/12
                    - generic [ref=f3e231]: PR пройдено
                  - generic [ref=f3e232]:
                    - generic [ref=f3e233]: —
                    - generic [ref=f3e234]: рекорд рівня
                - link "Відкрити рев'ю" [ref=f3e236]:
                  - /url: /pr/login-hard-waits
      - contentinfo [ref=f3e239]:
        - generic [ref=f3e240]:
          - generic [ref=f3e241]:
            - link "qa-hub" [ref=f3e242]:
              - /url: /dash
            - paragraph [ref=f3e245]: Платформа підготовки до співбесіди QA Engineer.
            - generic [ref=f3e246]:
              - link "Telegram-канал" [ref=f3e247]:
                - /url: https://t.me/qa_interview_hub
              - group "Мова" [ref=f3e250]:
                - button "UA" [pressed] [ref=f3e251] [cursor=pointer]
                - button "EN" [ref=f3e252] [cursor=pointer]
          - navigation "Акаунт" [ref=f3e253]:
            - paragraph [ref=f3e254]: Акаунт
            - link "Профіль" [ref=f3e255]:
              - /url: /profile
            - link "Конфіденційність" [ref=f3e256]:
              - /url: /privacy.html
  - status
  - generic [ref=f3e257]:
    - 'button "Доступність: розмір тексту, контраст, шрифт" [ref=f3e258] [cursor=pointer]'
    - tooltip "Доступність"
```

# Test source

```ts
  1   | import { expect, type Locator, type Page } from '@playwright/test';
  2   | import { byTestId } from '../helpers/locators';
  3   | 
  4   | export type SignInMethod = 'password' | 'google';
  5   | 
  6   | /** `/profile`: stats card, account settings (password, sign-in methods) and account deletion. */
  7   | export class ProfilePage {
  8   |   readonly card: Locator;
  9   |   readonly register: Locator;
  10  |   readonly currentPassword: Locator;
  11  |   readonly newPassword: Locator;
  12  |   readonly savePassword: Locator;
  13  |   readonly passwordMessage: Locator;
  14  |   readonly deleteConfirm: Locator;
  15  |   readonly deleteButton: Locator;
  16  |   readonly dailyCount: Locator;
  17  |   readonly dailyPending: Locator;
  18  |   readonly dailyError: Locator;
  19  |   readonly feedback: Locator;
  20  |   readonly feedbackItems: Locator;
  21  |   readonly feedbackEmpty: Locator;
  22  | 
  23  |   constructor(readonly page: Page) {
  24  |     this.card = page.getByTestId('profile');
  25  |     this.register = page.getByTestId('profile-register');
  26  |     this.currentPassword = page.getByTestId('profile-password-current');
  27  |     this.newPassword = page.getByTestId('profile-password-new');
  28  |     this.savePassword = page.getByTestId('profile-password-save');
  29  |     this.passwordMessage = page.getByTestId('profile-password-message');
  30  |     this.deleteConfirm = page.getByTestId('profile-delete-confirm');
  31  |     this.deleteButton = page.getByTestId('profile-delete');
  32  |     this.dailyCount = page.getByTestId('profile-daily-count');
  33  |     this.dailyPending = page.getByTestId('profile-daily-pending');
  34  |     this.dailyError = page.getByTestId('profile-daily-error');
  35  |     this.feedback = page.getByTestId('profile-feedback');
  36  |     this.feedbackItems = page.getByTestId('profile-feedback-item');
  37  |     this.feedbackEmpty = page.getByTestId('profile-feedback-empty');
  38  |   }
  39  | 
  40  |   /** "Мої відгуки": `data-key` = number, `data-value` = rating, `data-state` = `replied|waiting`. */
  41  |   feedbackItem(number: number): Locator {
  42  |     return byTestId(this.page, 'profile-feedback-item', number);
  43  |   }
  44  | 
  45  |   /** The reply block; it also holds a label and a date, so assert the text with toContainText. */
  46  |   feedbackReply(number: number): Locator {
  47  |     return this.feedbackItem(number).getByTestId('profile-feedback-reply');
  48  |   }
  49  | 
  50  |   feedbackWaiting(number: number): Locator {
  51  |     return this.feedbackItem(number).getByTestId('profile-feedback-waiting');
  52  |   }
  53  | 
  54  |   /** `data-state` on the method row is `on|off`. */
  55  |   method(key: SignInMethod): Locator {
  56  |     return byTestId(this.page, 'profile-method', key);
  57  |   }
  58  | 
  59  |   dailyOption(count: number): Locator {
  60  |     return byTestId(this.page, 'profile-daily-option', count);
  61  |   }
  62  | 
  63  |   /** Saved on click (guests: localStorage; signed in: PUT /me/daily-count). */
  64  |   async setDailyCount(count: number): Promise<void> {
  65  |     await this.dailyOption(count).click();
  66  |     await expect(this.dailyCount).toHaveAttribute('data-value', String(count));
  67  |   }
  68  | 
  69  |   async goto(): Promise<void> {
> 70  |     await this.page.goto('profile');
      |                     ^ Error: page.goto: Navigation to "http://localhost:4273/profile" is interrupted by another navigation to "http://localhost:4273/dash"
  71  |     await expect(this.card).toBeVisible();
  72  |   }
  73  | 
  74  |   /** The password form lives in a dialog that exists only while open (test-ids.md, Profile). */
  75  |   async openPasswordDialog(): Promise<void> {
  76  |     await this.page.getByTestId('profile-password-open').click();
  77  |     await expect(this.page.getByTestId('profile-password-dialog')).toBeVisible();
  78  |   }
  79  | 
  80  |   async openDeleteDialog(): Promise<void> {
  81  |     await this.page.getByTestId('profile-delete-open').click();
  82  |     await expect(this.page.getByTestId('profile-delete-dialog')).toBeVisible();
  83  |   }
  84  | 
  85  |   /** «Мої відгуки» is collapsed until the row is clicked. */
  86  |   async openFeedback(): Promise<void> {
  87  |     const toggle = this.page.getByTestId('profile-feedback-toggle');
  88  |     if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  89  |     await expect(this.feedback).toBeVisible();
  90  |   }
  91  | 
  92  |   async changePassword(next: string, current: string): Promise<void> {
  93  |     await this.openPasswordDialog();
  94  |     await this.currentPassword.fill(current);
  95  |     await this.newPassword.fill(next);
  96  |     await this.savePassword.click();
  97  |   }
  98  | 
  99  |   async deleteAccount(email: string): Promise<void> {
  100 |     await this.openDeleteDialog();
  101 |     await this.deleteConfirm.fill(email);
  102 |     await this.deleteButton.click();
  103 |   }
  104 | }
  105 | 
```