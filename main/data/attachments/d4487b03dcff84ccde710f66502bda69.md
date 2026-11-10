# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/onboarding.spec.ts >> short dashboard and tour >> opening quiz arms the tour on the next dashboard
- Location: tests/e2e/onboarding.spec.ts:284:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('focus-skip')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - 'link "QA Interview Hub: дашборд" [ref=e5] [cursor=pointer]':
      - /url: /dash
      - text: qa-hub$_
    - main [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e9]: БЕЗ РЕЄСТРАЦІЇ · БЕЗКОШТОВНО
          - heading "Підготуйся до співбесіди на QA Engineer" [level=1] [ref=e10]
          - paragraph [ref=e11]: "1165 питань, 385 карток і 576 статей для Junior, Middle та Senior. Почни з 5 базових питань: це 2–3 хвилини."
          - link "Пройти 5 питань" [ref=e13] [cursor=pointer]:
            - /url: /quiz/manual?first=1
        - generic [ref=e14]:
          - generic [ref=e15]: КРОК 1 · ТЕСТ
          - heading "Відповідай і одразу дивись пояснення" [level=2] [ref=e16]
          - paragraph [ref=e17]: "Кожне питання має розбір: чому правильний варіант правильний і де помиляються найчастіше."
          - generic [aria-hidden] [ref=e18]:
            - generic [ref=e19]: Яку техніку тест-дизайну обрати для поля «Вік» з діапазоном 18–65?
            - generic [ref=e20]: A. Попарне тестування
            - generic [ref=e21]: B. Аналіз граничних значень
            - generic [ref=e22]: C. Таблиця рішень
        - generic [ref=e23]:
          - generic [ref=e24]: КРОК 2 · КАРТКИ НА ПОВТОРЕННЯ
          - heading "Відповідай вголос, як на співбесіді" [level=2] [ref=e25]
          - paragraph [ref=e26]: "На картці питання без варіантів. Розкажи відповідь вголос, відкрий еталон і оціни себе 1–5: від оцінки залежить, коли картка повернеться."
          - generic [aria-hidden] [ref=e27]:
            - generic [ref=e28]: Чим відрізняється верифікація від валідації?
            - generic [ref=e29]: Показати відповідь
            - generic [ref=e30]:
              - generic [ref=e31]:
                - generic [ref=e32]: "1"
                - text: Не знаю
              - generic [ref=e33]:
                - generic [ref=e34]: "2"
                - text: Слабко
              - generic [ref=e35]:
                - generic [ref=e36]: "3"
                - text: Частково
              - generic [ref=e37]:
                - generic [ref=e38]: "4"
                - text: Добре
              - generic [ref=e39]:
                - generic [ref=e40]: "5"
                - text: Як на співб.
        - generic [ref=e41]:
          - generic [ref=e42]: КРОК 3 · БАЗА ЗНАНЬ
          - heading "Дочитай теорію там, де помилився" [level=2] [ref=e43]
          - paragraph [ref=e44]: "Під кожним поясненням є посилання на статтю за темою. Статті короткі: їх реально прочитати в метро."
          - generic [aria-hidden] [ref=e45]:
            - generic [ref=e46]: Тест-дизайн · 4 хв
            - generic [ref=e47]: Аналіз граничних значень
        - generic [ref=e51]:
          - generic [ref=e52]: КРОК 4 · ЩОДНЯ
          - heading "10 хвилин на день замість зубріння за ніч" [level=2] [ref=e53]
          - paragraph [ref=e54]: Щодня зʼявляються 3 невеликі завдання. Виконуєш їх, отримуєш XP і серію днів поспіль.
          - generic [aria-hidden] [ref=e55]:
            - generic [ref=e56]:
              - generic [ref=e57]: Пройти тест на 10 питань
              - generic [ref=e58]: ✓
            - generic [ref=e59]:
              - generic [ref=e60]: Повторити 5 карток
              - generic [ref=e61]: 2 / 5
            - generic [ref=e62]:
              - generic [ref=e63]: Прочитати статтю
              - generic [ref=e64]: 0 / 1
        - generic [ref=e65]:
          - generic [ref=e66]: ХОЧЕШ В АВТОМАТИЗАЦІЮ?
          - generic [ref=e67]: Курс Playwright з нуля
          - paragraph [ref=e68]: "Кожен розділ проходить ті самі 4 кроки: стаття, практика, тест і картки. Прогрес зберігається, можна продовжити з будь-якого пристрою."
          - link "Почати курс →" [ref=e69] [cursor=pointer]:
            - /url: /course/playwright
        - link "Почати з 5 питань" [ref=e72] [cursor=pointer]:
          - /url: /quiz/manual?first=1
  - status
```

# Test source

```ts
  190 |       await expect(focus.total).toHaveAttribute('data-value', /^[1-9]\d*$/);
  191 |       const n = await numberValue(focus.total);
  192 |       await focus.next.click();
  193 |       await focus.next.click();
  194 |       await expect(focus.step).toHaveText(/Крок 6 \/ 6/);
  195 |       await focus.save.click();
  196 |       await expect(focus.gate).toBeHidden();
  197 |       await expect(shell.sidebar).toBeVisible();
  198 | 
  199 |       // 3. Read focus-summary
  200 |       await expect(focus.summary).toHaveText(/^Automation \(Cypress, Appium\) · Junior ·/);
  201 |       await expect(focus.summary).toHaveAttribute('data-value', String(n));
  202 |     },
  203 |   );
  204 | });
  205 | 
  206 | test.describe('focus skip', () => {
  207 |   test(
  208 |     'skip closes the gate, shows the dashboard with the shell and the skipped line',
  209 |     { tag: ['@REQ-GEN-12'] },
  210 |     async ({ page, dashboard, shell, focus }) => {
  211 |       // 1. Open /dash
  212 |       await dashboard.goto();
  213 |       await expect(focus.gate).toBeVisible();
  214 |       await expect(focus.skip).toBeVisible();
  215 | 
  216 |       // 2. Click focus-skip
  217 |       await focus.skip.click();
  218 |       await expect(focus.gate).toBeHidden();
  219 |       await expect(shell.sidebar).toBeVisible();
  220 |       await expect(dashboard.root).toBeVisible();
  221 |       await expect(focus.skipped).toContainText('Показуємо всі теми.');
  222 |       await expect(focus.setupOpen).toBeVisible();
  223 |       await expect(focus.bar).toHaveCount(0);
  224 | 
  225 |       // 3. Read localStorage qa-hub-focus
  226 |       await expect.poll(() => readStorage(page, 'qa-hub-focus')).toBe('skipped');
  227 |     },
  228 |   );
  229 | 
  230 |   test(
  231 |     'after a skip the wizard does not come back on reload',
  232 |     { tag: ['@REQ-GEN-12'] },
  233 |     async ({ page, dashboard, shell, focus }) => {
  234 |       // 1. Open /dash, click focus-skip, reload /dash
  235 |       await dashboard.goto();
  236 |       await focus.skip.click();
  237 |       await expect(focus.gate).toBeHidden();
  238 |       await page.reload();
  239 |       await expect(shell.sidebar).toBeVisible();
  240 |       await expect(focus.skipped).toBeVisible();
  241 |       await expect(focus.gate).toBeHidden();
  242 | 
  243 |       // 2. Open the root page '/'
  244 |       await page.goto('');
  245 |       await expect(shell.sidebar).toBeVisible();
  246 |       await expect(focus.skipped).toBeVisible();
  247 |       await expect(focus.gate).toBeHidden();
  248 |     },
  249 |   );
  250 | });
  251 | 
  252 | test.describe('short dashboard and tour', () => {
  253 |   test(
  254 |     "a new visitor's short dashboard hides the full blocks until first activity",
  255 |     { tag: ['@REQ-GEN-14'] },
  256 |     async ({ page, dashboard, shell, focus, tour }) => {
  257 |       // 1. Open /dash and click focus-skip
  258 |       await dashboard.goto();
  259 |       await focus.skip.click();
  260 |       await expect(shell.sidebar).toBeVisible();
  261 | 
  262 |       // 2. Check the kept blocks first: only the short dashboard has a locked topic list
  263 |       await expect(dashboard.title).toBeVisible();
  264 |       await expect(dashboard.quickstart).toBeVisible();
  265 |       // A skipped focus keeps the track switch, set to all tracks.
  266 |       await expect(byTestId(page, 'dash-quickstart-track', 'all')).toHaveAttribute(
  267 |         'aria-pressed',
  268 |         'true',
  269 |       );
  270 |       await expect(dashboard.topics).toHaveAttribute('data-state', 'locked');
  271 |       await expect(dashboard.topicsLock).toBeVisible();
  272 | 
  273 |       // 3. Check the hidden blocks
  274 |       for (const block of dashboard.fullOnly) await expect(block).toHaveCount(0);
  275 | 
  276 |       // 4. Another /dash with no quiz, Recall or KB page in between does not arm the tour
  277 |       await page.reload();
  278 |       await expect(dashboard.topics).toHaveAttribute('data-state', 'locked');
  279 |       await expect(tour.pop).toHaveCount(0);
  280 |     },
  281 |   );
  282 | 
  283 |   for (const target of ['quiz', 'recall', 'kb'] as const) {
  284 |     test(
  285 |       `opening ${target} arms the tour on the next dashboard`,
  286 |       { tag: ['@REQ-GEN-14'] },
  287 |       async ({ dashboard, shell, focus, tour }) => {
  288 |         // 1. Open /dash, click focus-skip, then open the page
  289 |         await dashboard.goto();
> 290 |         await focus.skip.click();
      |                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
  291 |         await shell.open(target);
  292 |         await shell.expectActive(target);
  293 | 
  294 |         // 2. Open the dashboard
  295 |         await shell.open('dash');
  296 |         await expect(tour.pop).toBeVisible();
  297 |         await expect(tour.overlay).toHaveAttribute('data-key', 'today');
  298 |         await expect(tour.pop).toHaveAttribute('role', 'dialog');
  299 | 
  300 |         // 3. Check the blocks
  301 |         await expect(dashboard.today).toHaveCount(1);
  302 |         await expect(dashboard.ready).toHaveCount(1);
  303 |         await expect(dashboard.topics).toHaveAttribute('data-state', 'active');
  304 |       },
  305 |     );
  306 |   }
  307 | 
  308 |   test(
  309 |     'the tour runs through its steps to Готово',
  310 |     { tag: ['@REQ-GEN-14', '@responsive'] },
  311 |     async ({ dashboard, shell, focus, tour }) => {
  312 |       // 1. Skip the wizard, open /quiz, open the dashboard
  313 |       await dashboard.goto();
  314 |       await focus.skip.click();
  315 |       await shell.open('quiz');
  316 |       await shell.expectActive('quiz');
  317 |       await shell.open('dash');
  318 |       await expect(tour.overlay).toHaveAttribute('data-key', 'today');
  319 |       await expect(tour.counter).toHaveAttribute('data-value', '1');
  320 |       await expect(tour.counter).toHaveAttribute('data-total', /^\d+$/);
  321 |       const total = await numberValue(tour.counter, 'data-total');
  322 |       await expect(tour.next).toHaveText('Далі');
  323 |       await expect(tour.skip).toBeVisible();
  324 | 
  325 |       // 2. Click tour-next once
  326 |       await tour.ready();
  327 |       await tour.next.click();
  328 |       await expect(tour.overlay).toHaveAttribute('data-key', 'dash-summary-quiz');
  329 |       await expect(tour.counter).toHaveAttribute('data-value', '2');
  330 | 
  331 |       // 3. Walk to the last step
  332 |       await tour.walkToEnd();
  333 |       await expect(tour.overlay).toHaveAttribute('data-key', 'topics');
  334 |       await expect(tour.counter).toHaveAttribute('data-value', String(total));
  335 | 
  336 |       // 4. Click Готово
  337 |       await tour.next.click();
  338 |       await expect(tour.overlay).toHaveCount(0);
  339 |       await expect(dashboard.today).toBeVisible();
  340 |       await expect(dashboard.ready).toBeVisible();
  341 |     },
  342 |   );
  343 | 
  344 |   test(
  345 |     'tour-skip ends the tour and a reload does not start it again',
  346 |     { tag: ['@REQ-GEN-14'] },
  347 |     async ({ page, dashboard, shell, focus, tour }) => {
  348 |       // 1. Skip the wizard, open /kb, open the dashboard, click tour-skip
  349 |       await dashboard.goto();
  350 |       await focus.skip.click();
  351 |       await shell.open('kb');
  352 |       await shell.expectActive('kb');
  353 |       await shell.open('dash');
  354 |       await tour.ready();
  355 |       await tour.skip.click();
  356 |       await expect(tour.overlay).toHaveCount(0);
  357 |       await expect(dashboard.today).toBeVisible();
  358 |       await expect(dashboard.ready).toBeVisible();
  359 | 
  360 |       // 2. Read qa-hub-tour-v1
  361 |       await expect.poll(() => readStorage(page, 'qa-hub-tour-v1')).toContain('"stage":"done"');
  362 | 
  363 |       // 3. Reload /dash
  364 |       await page.reload();
  365 |       await expect(dashboard.today).toBeVisible();
  366 |       await expect(tour.overlay).toHaveCount(0);
  367 |     },
  368 |   );
  369 | 
  370 |   test(
  371 |     'Escape ends the tour and a reload does not start it again',
  372 |     { tag: ['@REQ-GEN-14'] },
  373 |     async ({ page, dashboard, shell, focus, tour }) => {
  374 |       // 1. Skip the wizard, open /quiz, open the dashboard, tour-next once, press Escape
  375 |       await dashboard.goto();
  376 |       await focus.skip.click();
  377 |       await shell.open('quiz');
  378 |       await shell.expectActive('quiz');
  379 |       await shell.open('dash');
  380 |       await tour.ready();
  381 |       await tour.next.click();
  382 |       await expect(tour.counter).toHaveAttribute('data-value', '2');
  383 |       await page.keyboard.press('Escape');
  384 |       await expect(tour.overlay).toHaveCount(0);
  385 |       await expect(dashboard.today).toBeVisible();
  386 |       await expect(dashboard.ready).toBeVisible();
  387 |       await expect.poll(() => readStorage(page, 'qa-hub-tour-v1')).toContain('"stage":"done"');
  388 | 
  389 |       // 2. Reload /dash
  390 |       await page.reload();
```