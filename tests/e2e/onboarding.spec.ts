import { expect, test } from '../../src/fixtures';
import { byTestId, numberValue } from '../../src/helpers/locators';
import { readStorage } from '../../src/helpers/storage';

// spec: specs/phase2-onboarding.md
// seed: tests/seed-new.spec.ts

test.use({ visitor: 'new' });

test.describe('first visit', () => {
  test(
    'a new visitor gets the guest home instead of the shell',
    { tag: ['@REQ-GEN-10'] },
    async ({ dashboard, shell, focus }) => {
      await dashboard.goto();
      await expect(focus.gate).toBeVisible();
      await expect(focus.home).toBeVisible();
      await expect(focus.homeStart).toHaveAttribute('href', /\/quiz\/manual\?first=1$/);
      await expect(focus.step).toHaveCount(0);
      await expect(shell.sidebar).toBeHidden();
      await expect(dashboard.root).toBeHidden();
    },
  );
});

test.describe('focus wizard', () => {
  test.beforeEach(async ({ dashboard, quiz, focus }) => {
    // The wizard opens only from the first-run results (DASH-026).
    await dashboard.goto();
    await focus.openAfterFirstRun(quiz);
  });

  test(
    'framework step: next is disabled until a framework is ticked',
    { tag: ['@REQ-GEN-11'] },
    async ({ focus }) => {
      const stacks = ['playwright', 'cypress', 'selenium', 'appium'];

      // 1. In focus-gate click focus-track auto
      await focus.track('auto').click();
      await expect(focus.step).toHaveText(/Крок 2 \/ 4/);
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
      await expect(focus.step).toHaveText(/Крок 1 \/ 4/);
      await expect(focus.skip).toBeVisible();
    },
  );

  test(
    'topics step: save is disabled with no topics',
    { tag: ['@REQ-GEN-11'] },
    async ({ focus }) => {
      const ticked = focus.ticked;

      // 1. Click focus-track manual, then focus-level junior
      await focus.track('manual').click();
      await focus.level('junior').click();
      await expect(focus.step).toHaveText(/Крок 3 \/ 3/);
      await expect(ticked.first()).toBeVisible();
      const count = await ticked.count();
      await expect(focus.next).toHaveCount(0);
      await expect(focus.save).toBeEnabled();
      await expect(focus.total).toHaveAttribute('data-value', String(count));

      // 2. Click every focus-topic with data-state on
      for (let i = 0; i < count; i++) await ticked.first().click();
      await expect(focus.total).toHaveAttribute('data-value', '0');
      await expect(focus.save).toBeDisabled();

      // 3. Click one focus-topic
      await focus.topics.first().click();
      await expect(focus.total).toHaveAttribute('data-value', '1');
      await expect(focus.save).toBeEnabled();
    },
  );

  test(
    'back returns one step and keeps the choice',
    { tag: ['@REQ-GEN-11'] },
    async ({ focus }) => {
      const ticked = focus.ticked;

      // 1. Manual, middle; untick all topics, tick sql
      await focus.track('manual').click();
      await focus.level('middle').click();
      await expect(focus.step).toHaveText(/Крок 3 \/ 3/);
      await expect(ticked.first()).toBeVisible();
      const count = await ticked.count();
      for (let i = 0; i < count; i++) await ticked.first().click();
      await focus.topic('sql').click();

      // 2. Click focus-back
      await focus.back.click();
      await expect(focus.step).toHaveText(/Крок 2 \/ 3/);
      await expect(focus.level('middle')).toHaveAttribute('aria-checked', 'true');

      // 3. Click focus-level middle again: the topics come back as they were left
      await focus.level('middle').click();
      await expect(focus.step).toHaveText(/Крок 3 \/ 3/);
      await expect(ticked).toHaveCount(1);
      await expect(focus.topic('sql')).toHaveAttribute('data-state', 'on');

      // 4. Click focus-back twice
      await focus.back.click();
      await expect(focus.step).toHaveText(/Крок 2 \/ 3/);
      await focus.back.click();
      await expect(focus.step).toHaveText(/Крок 1 \/ 3/);
      await expect(focus.back).toHaveCount(0);
    },
  );

  test(
    'saving closes the gate and shows the shell with the focus bar',
    { tag: ['@REQ-GEN-11'] },
    async ({ page, dashboard, shell, focus, tour }) => {
      // 1. Manual, junior; read focus-total N; save on the topics step
      await focus.track('manual').click();
      await focus.level('junior').click();
      await expect(focus.step).toHaveText(/Крок 3 \/ 3/);
      await expect(focus.total).toHaveAttribute('data-value', /^[1-9]\d*$/);
      const n = await numberValue(focus.total);
      await focus.save.click();
      await expect(focus.gate).toBeHidden();
      await expect(shell.sidebar).toBeVisible();
      await expect(dashboard.root).toBeVisible();
      // The first run was activity, so the dashboard tour starts right away.
      await expect(tour.overlay).toHaveAttribute('data-key', 'today');

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
    async ({ shell, focus }) => {
      // 1. Auto; tick cypress and appium; next
      await focus.track('auto').click();
      await focus.stack('cypress').click();
      await focus.stack('appium').click();
      await focus.next.click();
      await expect(focus.step).toHaveText(/Крок 3 \/ 4/);

      // 2. Click level junior; save on the topics step
      await focus.level('junior').click();
      await expect(focus.step).toHaveText(/Крок 4 \/ 4/);
      // The topic preset follows the ticked frameworks.
      await expect(focus.topic('cypress')).toHaveAttribute('data-state', 'on');
      await expect(focus.topic('appium')).toHaveAttribute('data-state', 'on');
      await expect(focus.total).toHaveAttribute('data-value', /^[1-9]\d*$/);
      const n = await numberValue(focus.total);
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
  test.beforeEach(async ({ dashboard, quiz, focus }) => {
    await dashboard.goto();
    await focus.openAfterFirstRun(quiz);
  });

  test(
    'skip closes the gate, shows the dashboard with the shell and the skipped line',
    { tag: ['@REQ-GEN-12'] },
    async ({ page, dashboard, shell, focus, tour }) => {
      // 1. The wizard is open on step 1
      await expect(focus.gate).toBeVisible();
      await expect(focus.skip).toBeVisible();

      // 2. Click focus-skip
      await focus.skip.click();
      await expect(focus.gate).toBeHidden();
      await expect(shell.sidebar).toBeVisible();
      await expect(dashboard.root).toBeVisible();
      await expect(focus.skipped).toContainText('Показуємо всі теми.');
      await expect(tour.overlay).toHaveAttribute('data-key', 'today');
      await expect(focus.setupOpen).toBeVisible();
      await expect(focus.bar).toHaveCount(0);

      // 3. Read localStorage qa-hub-focus
      await expect.poll(() => readStorage(page, 'qa-hub-focus')).toBe('skipped');
    },
  );

  test(
    'the skip survives a reload and /',
    { tag: ['@REQ-GEN-12'] },
    async ({ page, shell, focus }) => {
      // The gate checks here are about layout: the wizard itself opens only after a first run.
      // 1. Click focus-skip, reload /dash
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
  // DASH-030: a visitor who skipped the wizard and has no activity yet. The first visit now opens
  // the guest home, and the wizard only follows a first run, which is activity itself.
  test.use({ visitor: 'skipped' });

  test(
    "a new visitor's short dashboard hides the full blocks until first activity",
    { tag: ['@REQ-GEN-14'] },
    async ({ page, dashboard, shell, tour }) => {
      // 1. Open /dash with the focus skipped
      await dashboard.goto();
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
      async ({ dashboard, shell, tour }) => {
        // 1. Open /dash with the focus skipped, then open the page
        await dashboard.goto();
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
    { tag: ['@REQ-GEN-14', '@responsive'] },
    async ({ dashboard, shell, tour }) => {
      // 1. Open /dash with the focus skipped, open /quiz, open the dashboard
      await dashboard.goto();
      await shell.open('quiz');
      await shell.expectActive('quiz');
      await shell.open('dash');
      await expect(tour.overlay).toHaveAttribute('data-key', 'today');
      await expect(tour.counter).toHaveAttribute('data-value', '1');
      await expect(tour.counter).toHaveAttribute('data-total', /^\d+$/);
      const total = await numberValue(tour.counter, 'data-total');
      await expect(tour.next).toHaveText('Далі');
      await expect(tour.skip).toBeVisible();

      // 2. Click tour-next once
      await tour.ready();
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
    async ({ page, dashboard, shell, tour }) => {
      // 1. Open /dash with the focus skipped, open /kb, open the dashboard, click tour-skip
      await dashboard.goto();
      await shell.open('kb');
      await shell.expectActive('kb');
      await shell.open('dash');
      await tour.ready();
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
    async ({ page, dashboard, shell, tour }) => {
      // 1. Open /dash with the focus skipped, open /quiz, open the dashboard, tour-next once, press Escape
      await dashboard.goto();
      await shell.open('quiz');
      await shell.expectActive('quiz');
      await shell.open('dash');
      await tour.ready();
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
