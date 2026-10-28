import { expect, test } from '../../src/fixtures';
import { byTestId, numberValue } from '../../src/helpers/locators';
import { readStorage } from '../../src/helpers/storage';

// spec: specs/phase2-onboarding.md
// seed: tests/seed-new.spec.ts

test.use({ visitor: 'new' });

test.describe('first visit', () => {
  test(
    'a new visitor gets the focus wizard instead of the shell',
    { tag: ['@REQ-GEN-10'] },
    async ({ dashboard, shell, focus }) => {
      await dashboard.goto();
      await expect(focus.gate).toBeVisible();
      await expect(shell.sidebar).toBeHidden();
      await expect(dashboard.root).toBeHidden();
    },
  );
});

test.describe('focus wizard', () => {
  test(
    'framework step: next is disabled until a framework is ticked',
    { tag: ['@REQ-GEN-11'] },
    async ({ dashboard, focus }) => {
      const stacks = ['playwright', 'cypress', 'selenium', 'appium'];

      // 1. Open /dash as a new visitor; in focus-gate click focus-track auto
      await dashboard.goto();
      await focus.track('auto').click();
      await expect(focus.step).toHaveText(/Крок 2 \/ 6/);
      for (const key of stacks) {
        await expect(focus.stack(key)).toBeVisible();
        await expect(focus.stack(key)).not.toHaveAttribute('aria-checked', 'true');
      }
      await expect(focus.next).toBeDisabled();

      // 2. Click focus-stack playwright
      await focus.stack('playwright').click();
      await expect(focus.stack('playwright')).toHaveAttribute('aria-checked', 'true');
      await expect(focus.next).toBeEnabled();

      // 3. Click focus-back
      await focus.back.click();
      await expect(focus.step).toHaveText(/Крок 1 \/ 6/);
      await expect(focus.skip).toBeVisible();
    },
  );

  test(
    'topics step: next is disabled with no topics',
    { tag: ['@REQ-GEN-11'] },
    async ({ dashboard, focus }) => {
      const ticked = focus.ticked;

      // 1. Open /dash; click focus-track manual, then focus-level junior
      await dashboard.goto();
      await focus.track('manual').click();
      await focus.level('junior').click();
      await expect(focus.step).toHaveText(/Крок 3 \/ 5/);
      await expect(ticked.first()).toBeVisible();
      const count = await ticked.count();
      await expect(focus.next).toBeEnabled();
      await expect(focus.total).toHaveAttribute('data-value', String(count));

      // 2. Click every focus-topic with data-state on
      for (let i = 0; i < count; i++) await ticked.first().click();
      await expect(focus.total).toHaveAttribute('data-value', '0');
      await expect(focus.next).toBeDisabled();

      // 3. Click one focus-topic
      await focus.topics.first().click();
      await expect(focus.total).toHaveAttribute('data-value', '1');
      await expect(focus.next).toBeEnabled();
    },
  );

  test(
    'back returns one step and keeps the choice',
    { tag: ['@REQ-GEN-11'] },
    async ({ dashboard, focus }) => {
      const ticked = focus.ticked;

      // 1. Open /dash; manual, middle; untick all topics, tick sql; focus-next
      await dashboard.goto();
      await focus.track('manual').click();
      await focus.level('middle').click();
      await expect(focus.step).toHaveText(/Крок 3 \/ 5/);
      await expect(ticked.first()).toBeVisible();
      const count = await ticked.count();
      for (let i = 0; i < count; i++) await ticked.first().click();
      await focus.topic('sql').click();
      await focus.next.click();
      await expect(focus.step).toHaveText(/Крок 4 \/ 5/);
      await expect(focus.lang('uk')).toHaveAttribute('data-state', 'on');

      // 2. Click focus-back
      await focus.back.click();
      await expect(focus.step).toHaveText(/Крок 3 \/ 5/);
      await expect(ticked).toHaveCount(1);
      await expect(focus.topic('sql')).toHaveAttribute('data-state', 'on');

      // 3. Click focus-back twice more
      await focus.back.click();
      await expect(focus.step).toHaveText(/Крок 2 \/ 5/);
      await expect(focus.level('middle')).toHaveAttribute('aria-checked', 'true');
      await focus.back.click();
      await expect(focus.step).toHaveText(/Крок 1 \/ 5/);
      await expect(focus.back).toHaveCount(0);
    },
  );

  test(
    'the theme step applies the theme at once',
    { tag: ['@REQ-GEN-11'] },
    async ({ dashboard, focus }) => {
      // 1. Open /dash; manual, junior, next (topics), next (language)
      await dashboard.goto();
      await focus.passToTheme('junior');
      await expect(focus.step).toHaveText(/Крок 5 \/ 5/);
      await expect(focus.save).toBeVisible();
      await expect(focus.next).toHaveCount(0);
      await expect(focus.currentTheme).toHaveCount(1);
      // The preselected theme follows the system one, so it is read, not hard-coded.
      const other = (await focus.otherTheme.getAttribute('data-key')) as 'light' | 'dark';

      // 2. Click the focus-theme option that is not selected
      await focus.theme(other).click();
      await expect(focus.theme(other)).toHaveAttribute('data-state', 'selected');
      await expect(focus.theme(other)).toHaveAttribute('aria-checked', 'true');
      await expect(focus.html).toHaveAttribute('data-theme', other);
      await expect(focus.gate).toBeVisible();
    },
  );

  test(
    'saving closes the gate and shows the shell with the focus bar',
    { tag: ['@REQ-GEN-11'] },
    async ({ page, dashboard, shell, focus }) => {
      // 1. Open /dash; manual, junior; read focus-total N; next, next, save
      await dashboard.goto();
      await focus.track('manual').click();
      await focus.level('junior').click();
      await expect(focus.step).toHaveText(/Крок 3 \/ 5/);
      await expect(focus.total).toHaveAttribute('data-value', /^[1-9]\d*$/);
      const n = await numberValue(focus.total);
      await focus.next.click();
      await focus.next.click();
      await expect(focus.step).toHaveText(/Крок 5 \/ 5/);
      await focus.save.click();
      await expect(focus.gate).toBeHidden();
      await expect(shell.sidebar).toBeVisible();
      await expect(dashboard.root).toBeVisible();

      // 2. Check focus-bar
      await expect(focus.bar).toBeVisible();
      await expect(focus.bar).toHaveAttribute('data-state', 'focus');
      await expect(focus.bar).toHaveAttribute('data-key', 'manual');
      await expect(focus.bar).toHaveAttribute('data-value', 'junior');
      await expect(focus.summary).toHaveAttribute('data-value', String(n));
      await expect(focus.summary).toHaveText(`Manual QA · Junior · ${n} тем`);

      // 3. Reload
      await page.reload();
      await expect(focus.bar).toBeVisible();
      await expect(focus.gate).toBeHidden();
    },
  );

  test(
    'auto track: ticked frameworks go into the focus summary',
    { tag: ['@REQ-GEN-11'] },
    async ({ dashboard, shell, focus }) => {
      // 1. Open /dash; auto; tick cypress and appium; next
      await dashboard.goto();
      await focus.track('auto').click();
      await focus.stack('cypress').click();
      await focus.stack('appium').click();
      await focus.next.click();
      await expect(focus.step).toHaveText(/Крок 3 \/ 6/);

      // 2. Click level junior; next on topics and language; save on the theme step
      await focus.level('junior').click();
      await expect(focus.step).toHaveText(/Крок 4 \/ 6/);
      // The topic preset follows the ticked frameworks.
      await expect(focus.topic('cypress')).toHaveAttribute('data-state', 'on');
      await expect(focus.topic('appium')).toHaveAttribute('data-state', 'on');
      await expect(focus.total).toHaveAttribute('data-value', /^[1-9]\d*$/);
      const n = await numberValue(focus.total);
      await focus.next.click();
      await focus.next.click();
      await expect(focus.step).toHaveText(/Крок 6 \/ 6/);
      await focus.save.click();
      await expect(focus.gate).toBeHidden();
      await expect(shell.sidebar).toBeVisible();

      // 3. Read focus-summary
      await expect(focus.summary).toHaveText(/^Automation \(Cypress, Appium\) · Junior ·/);
      await expect(focus.summary).toHaveAttribute('data-value', String(n));
    },
  );
});

test.describe('focus skip', () => {
  test(
    'skip closes the gate, shows the dashboard with the shell and the skipped line',
    { tag: ['@REQ-GEN-12'] },
    async ({ page, dashboard, shell, focus }) => {
      // 1. Open /dash
      await dashboard.goto();
      await expect(focus.gate).toBeVisible();
      await expect(focus.skip).toBeVisible();

      // 2. Click focus-skip
      await focus.skip.click();
      await expect(focus.gate).toBeHidden();
      await expect(shell.sidebar).toBeVisible();
      await expect(dashboard.root).toBeVisible();
      await expect(focus.skipped).toContainText('Показуємо всі теми.');
      await expect(focus.setupOpen).toBeVisible();
      await expect(focus.bar).toHaveCount(0);

      // 3. Read localStorage qa-hub-focus
      await expect.poll(() => readStorage(page, 'qa-hub-focus')).toBe('skipped');
    },
  );

  test(
    'after a skip the wizard does not come back on reload',
    { tag: ['@REQ-GEN-12'] },
    async ({ page, dashboard, shell, focus }) => {
      // 1. Open /dash, click focus-skip, reload /dash
      await dashboard.goto();
      await focus.skip.click();
      await expect(focus.gate).toBeHidden();
      await page.reload();
      await expect(shell.sidebar).toBeVisible();
      await expect(focus.skipped).toBeVisible();
      await expect(focus.gate).toBeHidden();

      // 2. Open the root page '/'
      await page.goto('');
      await expect(shell.sidebar).toBeVisible();
      await expect(focus.skipped).toBeVisible();
      await expect(focus.gate).toBeHidden();
    },
  );
});

test.describe('short dashboard and tour', () => {
  test(
    "a new visitor's short dashboard hides the full blocks until first activity",
    { tag: ['@REQ-GEN-14'] },
    async ({ page, dashboard, shell, focus, tour }) => {
      // 1. Open /dash and click focus-skip
      await dashboard.goto();
      await focus.skip.click();
      await expect(shell.sidebar).toBeVisible();

      // 2. Check the kept blocks first: only the short dashboard has a locked topic list
      await expect(dashboard.title).toBeVisible();
      await expect(dashboard.quickstart).toBeVisible();
      // A skipped focus keeps the track switch, set to all tracks.
      await expect(byTestId(page, 'dash-quickstart-track', 'all')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(dashboard.topics).toHaveAttribute('data-state', 'locked');
      await expect(dashboard.topicsLock).toBeVisible();

      // 3. Check the hidden blocks
      for (const block of dashboard.fullOnly) await expect(block).toHaveCount(0);

      // 4. Another /dash with no quiz, Recall or KB page in between does not arm the tour
      await page.reload();
      await expect(dashboard.topics).toHaveAttribute('data-state', 'locked');
      await expect(tour.pop).toHaveCount(0);
    },
  );

  for (const target of ['quiz', 'recall', 'kb'] as const) {
    test(
      `opening ${target} arms the tour on the next dashboard`,
      { tag: ['@REQ-GEN-14'] },
      async ({ dashboard, shell, focus, tour }) => {
        // 1. Open /dash, click focus-skip, then open the page
        await dashboard.goto();
        await focus.skip.click();
        await shell.open(target);
        await shell.expectActive(target);

        // 2. Open the dashboard
        await shell.open('dash');
        await expect(tour.pop).toBeVisible();
        await expect(tour.overlay).toHaveAttribute('data-key', 'today');
        await expect(tour.pop).toHaveAttribute('role', 'dialog');

        // 3. Check the blocks
        await expect(dashboard.today).toHaveCount(1);
        await expect(dashboard.ready).toHaveCount(1);
        await expect(dashboard.topics).toHaveAttribute('data-state', 'active');
      },
    );
  }

  test(
    'the tour runs through its steps to Готово',
    { tag: ['@REQ-GEN-14'] },
    async ({ dashboard, shell, focus, tour }) => {
      // 1. Skip the wizard, open /quiz, open the dashboard
      await dashboard.goto();
      await focus.skip.click();
      await shell.open('quiz');
      await shell.open('dash');
      await expect(tour.overlay).toHaveAttribute('data-key', 'today');
      await expect(tour.counter).toHaveAttribute('data-value', '1');
      await expect(tour.counter).toHaveAttribute('data-total', /^\d+$/);
      const total = await numberValue(tour.counter, 'data-total');
      await expect(tour.next).toHaveText('Далі');
      await expect(tour.skip).toBeVisible();

      // 2. Click tour-next once
      await tour.next.click();
      await expect(tour.overlay).toHaveAttribute('data-key', 'dash-summary-quiz');
      await expect(tour.counter).toHaveAttribute('data-value', '2');

      // 3. Walk to the last step
      await tour.walkToEnd();
      await expect(tour.overlay).toHaveAttribute('data-key', 'topics');
      await expect(tour.counter).toHaveAttribute('data-value', String(total));

      // 4. Click Готово
      await tour.next.click();
      await expect(tour.overlay).toHaveCount(0);
      await expect(dashboard.today).toBeVisible();
      await expect(dashboard.ready).toBeVisible();
    },
  );

  test(
    'tour-skip ends the tour and a reload does not start it again',
    { tag: ['@REQ-GEN-14'] },
    async ({ page, dashboard, shell, focus, tour }) => {
      // 1. Skip the wizard, open /kb, open the dashboard, click tour-skip
      await dashboard.goto();
      await focus.skip.click();
      await shell.open('kb');
      await shell.open('dash');
      await tour.skip.click();
      await expect(tour.overlay).toHaveCount(0);
      await expect(dashboard.today).toBeVisible();
      await expect(dashboard.ready).toBeVisible();

      // 2. Read qa-hub-tour-v1
      await expect.poll(() => readStorage(page, 'qa-hub-tour-v1')).toContain('"stage":"done"');

      // 3. Reload /dash
      await page.reload();
      await expect(dashboard.today).toBeVisible();
      await expect(tour.overlay).toHaveCount(0);
    },
  );

  test(
    'Escape ends the tour and a reload does not start it again',
    { tag: ['@REQ-GEN-14'] },
    async ({ page, dashboard, shell, focus, tour }) => {
      // 1. Skip the wizard, open /quiz, open the dashboard, tour-next once, press Escape
      await dashboard.goto();
      await focus.skip.click();
      await shell.open('quiz');
      await shell.open('dash');
      await tour.next.click();
      await expect(tour.counter).toHaveAttribute('data-value', '2');
      await page.keyboard.press('Escape');
      await expect(tour.overlay).toHaveCount(0);
      await expect(dashboard.today).toBeVisible();
      await expect(dashboard.ready).toBeVisible();
      await expect.poll(() => readStorage(page, 'qa-hub-tour-v1')).toContain('"stage":"done"');

      // 2. Reload /dash
      await page.reload();
      await expect(dashboard.today).toBeVisible();
      await expect(tour.overlay).toHaveCount(0);
    },
  );
});
