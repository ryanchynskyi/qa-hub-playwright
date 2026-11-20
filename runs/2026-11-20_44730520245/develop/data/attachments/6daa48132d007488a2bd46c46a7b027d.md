# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/import.spec.ts >> Import of guest progress (UI) >> Banner after sign-up offers the guest progress with its counts
- Location: tests/e2e/import.spec.ts:33:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('import-banner')
Expected substring: "гостьовий режим"
Received string:    "У цьому браузері є прогресГостьовий режим (2 відповідей, 0 карток). Перенести в акаунт? XP перерахується за правилами сайту; те, що вже є в акаунті, не зміниться.Не пропонуватиПізнішеПеренести →"
Timeout: 5000ms

Call log:
  - Expect "toContainText" getByTestId('import-banner') with timeout 5000ms
  - waiting for getByTestId('import-banner')
    14 × locator resolved to <section class="impban" data-testid="import-banner" aria-label="У цьому браузері є прогрес">…</section>
       - unexpected value "У цьому браузері є прогресГостьовий режим (2 відповідей, 0 карток). Перенести в акаунт? XP перерахується за правилами сайту; те, що вже є в акаунті, не зміниться.Не пропонуватиПізнішеПеренести →"

```

```yaml
- region "У цьому браузері є прогрес":
  - paragraph: У цьому браузері є прогрес
  - paragraph: Гостьовий режим (2 відповідей, 0 карток). Перенести в акаунт? XP перерахується за правилами сайту; те, що вже є в акаунті, не зміниться.
  - button "Не пропонувати"
  - button "Пізніше"
  - button "Перенести →"
```

# Test source

```ts
  1   | // spec: specs/phase2-import.md
  2   | // seed: tests/seed.spec.ts
  3   | import { expect, test } from '../../src/fixtures';
  4   | import {
  5   |   readGuest,
  6   |   readGuestBackup,
  7   |   restoreGuestFromBackup,
  8   | } from '../../src/helpers/guest-storage';
  9   | 
  10  | type Fixtures = Pick<
  11  |   Parameters<Parameters<typeof test>[2]>[0],
  12  |   'api' | 'catalog' | 'quiz' | 'auth' | 'shell' | 'newCredentials'
  13  | >;
  14  | 
  15  | /** Answers as a guest (`true` = correct), then signs up in the same browser; returns the ids. */
  16  | async function guestThenSignUp(
  17  |   { api, catalog, quiz, auth, shell, newCredentials }: Fixtures,
  18  |   correct: boolean[],
  19  | ): Promise<string[]> {
  20  |   const section = catalog.sections.find((s) => s.questionCount >= correct.length);
  21  |   expect(section, `a section with ${correct.length}+ questions`).toBeDefined();
  22  |   await quiz.goto(section!.id);
  23  |   await quiz.startRun();
  24  |   const ids = await quiz.answerSeries(api, correct);
  25  |   await auth.goto('register');
  26  |   await auth.register(newCredentials);
  27  |   await shell.expectSignedIn(newCredentials.email);
  28  |   return ids;
  29  | }
  30  | 
  31  | // Texts are asserted only where the plan requires a wording; `lang` is pinned to uk by the fixture.
  32  | test.describe('Import of guest progress (UI)', () => {
  33  |   test(
  34  |     'Banner after sign-up offers the guest progress with its counts',
  35  |     { tag: ['@REQ-PROG-12'] },
  36  |     async ({ page, api, catalog, quiz, auth, shell, importBanner, newCredentials }) => {
  37  |       const f = { page, api, catalog, quiz, auth, shell, importBanner, newCredentials };
  38  |       // 1. As a fresh guest answer 2 questions (1 correct, 1 wrong)
  39  |       // 2. Sign up with newCredentials in the same browser
  40  |       await guestThenSignUp(f, [true, false]);
  41  | 
  42  |       // 3. The banner names the guest source and counts 2 answers and 0 cards (numbers only: #90)
> 43  |       await expect(importBanner.banner).toContainText('гостьовий режим');
      |                                         ^ Error: expect(locator).toContainText(expected) failed
  44  |       await expect(importBanner.banner).toHaveText(/\(2\D+, 0\D+\)/);
  45  |       await expect(importBanner.move).toBeEnabled();
  46  |       await expect(importBanner.later).toBeEnabled();
  47  |       await expect(importBanner.never).toBeEnabled();
  48  |     },
  49  |   );
  50  | 
  51  |   test(
  52  |     'Move imports the guest progress, XP is server-recomputed, backup is kept',
  53  |     { tag: ['@REQ-PROG-13'] },
  54  |     async ({ page, api, catalog, quiz, auth, shell, importBanner, newCredentials }) => {
  55  |       const f = { page, api, catalog, quiz, auth, shell, importBanner, newCredentials };
  56  |       // 1. As a guest answer 2 questions correctly, then sign up
  57  |       const ids = await guestThenSignUp(f, [true, true]);
  58  | 
  59  |       // 2. Move: the outcome shows +X XP and the banner goes
  60  |       await importBanner.move.click();
  61  |       const xp = await importBanner.movedXp();
  62  |       expect(xp).toBeGreaterThan(0);
  63  |       await expect(importBanner.banner).toBeHidden();
  64  | 
  65  |       // 3. Reload: once the account XP is shown, no banner; UI and API both hold X and the answers
  66  |       await page.reload();
  67  |       await expect.poll(() => shell.totalXp()).toBe(xp);
  68  |       await expect(importBanner.banner).toHaveCount(0);
  69  |       await expect(importBanner.done).toHaveCount(0);
  70  |       const { accessToken } = await api.login(newCredentials);
  71  |       const progress = await api.progress(accessToken);
  72  |       expect(progress.stats.totalXp).toBe(xp);
  73  |       expect(Object.keys(progress.questions)).toEqual(expect.arrayContaining(ids));
  74  | 
  75  |       // 4. localStorage: the backup holds both answers, the guest store is emptied (key kept)
  76  |       const backup = await readGuestBackup(page);
  77  |       expect(Object.keys(backup!.questions)).toEqual(expect.arrayContaining(ids));
  78  |       const guest = await readGuest(page);
  79  |       expect(guest!.questions).toEqual({});
  80  |       expect(guest!.cards).toEqual({});
  81  |     },
  82  |   );
  83  | 
  84  |   test(
  85  |     'Importing the same data again reports Nothing new and adds no XP',
  86  |     { tag: ['@REQ-PROG-14'] },
  87  |     async ({ page, api, catalog, quiz, auth, shell, importBanner, newCredentials }) => {
  88  |       const f = { page, api, catalog, quiz, auth, shell, importBanner, newCredentials };
  89  |       // 1. As a guest answer 1 question correctly, sign up and move it
  90  |       await guestThenSignUp(f, [true]);
  91  |       await importBanner.move.click();
  92  |       const xp = await importBanner.movedXp();
  93  |       expect(xp).toBeGreaterThan(0);
  94  |       await expect.poll(() => shell.totalXp()).toBe(xp);
  95  | 
  96  |       // 2. Put the moved data back into the guest store (as from another device) and reload
  97  |       await restoreGuestFromBackup(page);
  98  |       await page.reload();
  99  |       await expect(importBanner.banner).toHaveText(/\(1\D+, 0\D+\)/);
  100 | 
  101 |       // 3. Move again: "nothing new", no "+n XP"; after a reload UI and API XP are unchanged
  102 |       await importBanner.move.click();
  103 |       await expect(importBanner.doneMessage).toContainText('Нового нічого');
  104 |       await expect(importBanner.doneMessage).not.toHaveText(/\+\d+ XP/);
  105 |       await page.reload();
  106 |       await expect.poll(() => shell.totalXp()).toBe(xp);
  107 |       const { accessToken } = await api.login(newCredentials);
  108 |       expect((await api.progress(accessToken)).stats.totalXp).toBe(xp);
  109 |     },
  110 |   );
  111 | });
  112 | 
```