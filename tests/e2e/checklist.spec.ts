import type { ApiClient } from '../../src/api/client';
import type { Catalog } from '../../src/api/schemas';
import { expect, test } from '../../src/fixtures';
import { localDate } from '../../src/helpers/data';

// spec: specs/phase2-plan.md
// seed: tests/seed.spec.ts

/** An interview for TOMORROW: today is then the «Фініш» day and the checklist shows (no clock). */
function arrangeTomorrow(api: ApiClient, token: string, catalog: Catalog) {
  const topicId = catalog.topics[0]!.id;
  return api.createInterview(token, {
    date: localDate(1),
    level: 'middle',
    chapterIds: catalog.chapters.filter((c) => c.topicId === topicId).map((c) => c.id),
    minutesPerDay: 15,
  });
}

test.describe('PLAN-09 checklist before the interview', () => {
  test(
    'a tick saves at once and survives a reload',
    { tag: ['@REQ-PLAN-09'] },
    async ({ authedPage, user, api, catalog, dashboard, checklist }) => {
      const saved = async () => (await api.plan(user.token)).interview.checklist;

      // 1. Arrange an interview for tomorrow and open /dash
      await arrangeTomorrow(api, user.token, catalog);
      await dashboard.goto();
      await expect(dashboard.root).toHaveAttribute('data-state', 'finish');
      await expect(checklist.root).toHaveAttribute('data-state', 'eve');
      await expect(checklist.root).toHaveAttribute('data-value', '0');
      await expect(checklist.root).toHaveAttribute('data-total', '6');

      // 2. Tick «vacancy»
      await checklist.toggle('vacancy').click();
      await expect(checklist.item('vacancy')).toHaveAttribute('data-state', 'done');
      await expect(checklist.root).toHaveAttribute('data-value', '1');
      await expect.poll(saved).toEqual(['vacancy']);

      // 3. Reload: the tick is kept; untick returns the saved list to empty
      await authedPage.reload();
      await expect(checklist.item('vacancy')).toHaveAttribute('data-state', 'done');
      await expect(checklist.root).toHaveAttribute('data-value', '1');
      await checklist.toggle('vacancy').click();
      await expect(checklist.item('vacancy')).toHaveAttribute('data-state', 'todo');
      await expect(checklist.root).toHaveAttribute('data-value', '0');
      await expect.poll(saved).toEqual([]);
    },
  );

  test(
    'the tips rows open the sheet and Mark done ticks the item',
    { tag: ['@REQ-PLAN-09'] },
    async ({ authedPage, user, api, catalog, dashboard, checklist }) => {
      // 1. Arrange the same interview and open the sheet of «stories»
      await arrangeTomorrow(api, user.token, catalog);
      await dashboard.goto();
      await expect(checklist.root).toHaveAttribute('data-state', 'eve');
      await expect(checklist.tips('stories')).toBeVisible();
      await expect(checklist.tips('questions')).toBeVisible();
      await expect(checklist.tips('company')).toBeVisible();
      for (const key of ['vacancy', 'pitch', 'av'] as const)
        await expect(checklist.tips(key)).toHaveCount(0);
      await expect(checklist.item('stories')).toHaveAttribute('data-state', 'todo');
      await checklist.openTips('stories');
      await expect(checklist.sheetTip).toHaveAttribute('data-value', /^[1-9]\d*$/);

      // 2. Mark it done: the sheet closes, the item is ticked and saved
      await checklist.sheetDone.click();
      await expect(checklist.sheet).toHaveCount(0);
      await expect(checklist.item('stories')).toHaveAttribute('data-state', 'done');
      await expect
        .poll(async () => (await api.plan(user.token)).interview.checklist)
        .toEqual(['stories']);
      await authedPage.reload();
      await expect(checklist.item('stories')).toHaveAttribute('data-state', 'done');

      // 3. Open another row's sheet and close it with «later»: the row stays todo
      await checklist.openTips('questions');
      await checklist.sheetLater.click();
      await expect(checklist.sheet).toHaveCount(0);
      await expect(checklist.item('questions')).toHaveAttribute('data-state', 'todo');
    },
  );

  test(
    'all expands the list in place on a phone and every row shows at once elsewhere',
    { tag: ['@REQ-PLAN-09', '@responsive'] },
    async ({ authedPage, user, api, catalog, dashboard, checklist, device }) => {
      // 1. Arrange an interview for tomorrow and open /dash
      await arrangeTomorrow(api, user.token, catalog);
      await dashboard.goto();
      await expect(checklist.root).toHaveAttribute('data-state', 'eve');
      const total = Number(await checklist.root.getAttribute('data-total'));
      const url = authedPage.url();

      // 2. On a phone «all» expands the list; every layout then shows every row
      await checklist.showAll(device);
      await expect(checklist.items).toHaveCount(total);
      await expect(checklist.all).toHaveCount(0);

      // The list expands in place: «all» does not navigate
      await expect(authedPage).toHaveURL(url);
    },
  );
});
