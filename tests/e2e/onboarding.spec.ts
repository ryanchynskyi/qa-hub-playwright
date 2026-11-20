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
      // The home lives inside the normal shell; only the wizard after the first run replaces it.
      await expect(focus.home).toBeVisible();
      await expect(focus.homeStart).toHaveAttribute('href', /\/quiz\/manual\?first=1$/);
      await expect(focus.gate).toHaveCount(0);
      await expect(focus.step).toHaveCount(0);
      await expect(shell.sidebar).toBeVisible();
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
    'topics step: next is disabled until a topic is ticked',
    { tag: ['@REQ-GEN-11'] },
    async ({ focus }) => {
      // 1. Step 1: nothing is ticked, next is disabled, skip exists on step 2 only
      await expect(focus.step).toHaveAttribute('data-value', '1');
      await expect(focus.topics.first()).toBeVisible();
      await expect(focus.ticked).toHaveCount(0);
      await expect(focus.total).toHaveAttribute('data-value', '0');
      await expect(focus.next).toBeDisabled();
      await expect(focus.skip).toHaveCount(0);

      // 2. Tick one topic, then another
      await focus.topics.first().click();
      await expect(focus.ticked).toHaveCount(1);
      await expect(focus.total).toHaveAttribute('data-value', '1');
      await expect(focus.next).toBeEnabled();
      await focus.topics.nth(1).click();
      await expect(focus.total).toHaveAttribute('data-value', '2');

      // 3. Untick both: next is disabled again
      await focus.ticked.first().click();
      await focus.ticked.first().click();
      await expect(focus.total).toHaveAttribute('data-value', '0');
      await expect(focus.next).toBeDisabled();
    },
  );

  test(
    'level step: middle is preselected and back keeps the ticked topics',
    { tag: ['@REQ-GEN-11'] },
    async ({ focus }) => {
      // 1. Tick sql, next
      await focus.toLevelStep('sql');
      await expect(focus.level('middle')).toHaveAttribute('aria-checked', 'true');
      await expect(focus.save).toBeEnabled();
      await expect(focus.skip).toBeVisible();

      // 2. A click on a level only selects it
      await focus.level('senior').click();
      await expect(focus.level('senior')).toHaveAttribute('aria-checked', 'true');
      await expect(focus.step).toHaveAttribute('data-value', '2');

      // 3. Click focus-back: step 1 with sql still ticked
      await focus.back.click();
      await expect(focus.step).toHaveAttribute('data-value', '1');
      await expect(focus.ticked).toHaveCount(1);
      await expect(focus.topic('sql')).toHaveAttribute('data-state', 'on');
      await expect(focus.back).toHaveCount(0);
    },
  );

  test(
    'saving closes the gate and shows the dashboard with the focus summary',
    { tag: ['@REQ-GEN-11'] },
    async ({ page, dashboard, shell, focus, tour }) => {
      // 1. Tick two topics, next, junior, save
      const picked = [
        await focus.topics.first().getAttribute('data-key'),
        await focus.topics.nth(1).getAttribute('data-key'),
      ];
      await focus.topics.first().click();
      await focus.topics.nth(1).click();
      await expect(focus.total).toHaveAttribute('data-value', '2');
      await focus.next.click();
      await expect(focus.step).toHaveAttribute('data-value', '2');
      await focus.level('junior').click();
      await focus.save.click();
      await expect(focus.gate).toBeHidden();
      await expect(shell.sidebar).toBeVisible();
      await expect(dashboard.root).toBeVisible();
      // The first run was activity, so the dashboard tour starts right away.
      await expect(tour.overlay).toHaveAttribute('data-key', 'today');

      // 2. The focus summary in dash-ready counts the ticked topics
      await expect(focus.summary).toHaveAttribute('data-value', '2');
      await expect(focus.skipped).toHaveCount(0);
      // The saved focus is JSON {track, level, topics, scope} (test-ids.md, qa-hub-focus).
      const saved = JSON.parse((await readStorage(page, 'qa-hub-focus')) ?? '{}') as {
        level?: string;
        topics?: string[];
      };
      expect(saved.level).toBe('junior');
      expect([...(saved.topics ?? [])].sort()).toEqual([...picked].sort());

      // 3. Reload: the focus is kept, the wizard does not come back
      await page.reload();
      await expect(focus.summary).toHaveAttribute('data-value', '2');
      await expect(focus.gate).toBeHidden();
    },
  );
});

test.describe('focus skip', () => {
  test.beforeEach(async ({ dashboard, quiz, focus }) => {
    await dashboard.goto();
    await focus.openAfterFirstRun(quiz);
    // Skip exists on step 2 only.
    await focus.toLevelStep();
  });

  test(
    'skip closes the gate, shows the dashboard with the shell and the skipped line',
    { tag: ['@REQ-GEN-12'] },
    async ({ page, dashboard, shell, focus, tour }) => {
      // 1. The wizard is open on step 2
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
      await expect(focus.summary).toHaveCount(0);

      // 3. Read localStorage qa-hub-focus: the ticked topic is not saved
      await expect.poll(() => readStorage(page, 'qa-hub-focus')).toBe('skipped');
    },
  );

  test(
    'the skip survives a reload and /',
    { tag: ['@REQ-GEN-12'] },
    async ({ page, shell, focus }) => {
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

        // 3. Check the blocks the tour unhides
        await expect(dashboard.today).toHaveCount(1);
        await expect(dashboard.ready).toHaveCount(1);
        await expect(dashboard.topicsLock).toHaveCount(0);
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
      await expect(tour.overlay).toHaveAttribute('data-key', 'dash-ready');
      await expect(tour.counter).toHaveAttribute('data-value', '2');

      // 3. Walk to the last step
      await tour.walkToEnd();
      await expect(tour.overlay).toHaveAttribute('data-key', 'why-open');
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
