// spec: specs/phase2-daily.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import type { ApiClient } from '../../src/api/client';
import type { Catalog, DailyTask } from '../../src/api/schemas';

const TASK_TYPES: DailyTask['type'][] = [
  'ANSWER_N',
  'ACCURACY',
  'REVIEW_DUE',
  'READ_ARTICLE',
  'CODE_REVIEW',
  'WEAK_SPOT',
];
const TZ = 'Europe/Kyiv';

function localDate(at: Date): string {
  return at.toLocaleDateString('en-CA', { timeZone: TZ });
}

/** First task the API can advance with answers (ANSWER_N / CODE_REVIEW); a fresh set always has one. */
function answerableTask(tasks: DailyTask[]): DailyTask {
  const task = tasks.find((t) => t.type === 'ANSWER_N' || t.type === 'CODE_REVIEW');
  if (!task) throw new Error(`No ANSWER_N/CODE_REVIEW task in ${tasks.map((t) => t.type).join()}`);
  return task;
}

/** `times` correct answers to questions not in `skip`, matching the task's sections or topic (no topic: any). */
async function answerFor(
  api: ApiClient,
  catalog: Catalog,
  token: string,
  task: DailyTask,
  times: number,
  skip: string[] = [],
): Promise<void> {
  const sectionIds =
    task.params.sectionIds ??
    catalog.sections
      .filter((s) => !task.params.topicId || s.topicId === task.params.topicId)
      .map((s) => s.id);
  let done = 0;
  for (const sectionId of sectionIds) {
    for (const question of await api.questions(sectionId)) {
      if (done === times) return;
      if (skip.includes(question.id)) continue;
      await api.checkAnswer(question.id, await api.correctIndex(question.id), token);
      done++;
    }
  }
  expect(done, `questions available for ${task.type} ${task.id}`).toBe(times);
}

test.describe('Daily tasks (UI)', () => {
  test('New guest gets 3 pending tasks', { tag: ['@REQ-PROG-02'] }, async ({ dashboard }) => {
    // 1. Open /dash as a fresh guest
    await dashboard.goto();
    await expect(dashboard.today).toHaveAttribute('data-value', '0');
    await expect(dashboard.today).toHaveAttribute('data-total', '3');
    await expect(dashboard.todayState).toHaveAttribute('data-state', 'run');

    // 2. Count the task elements
    await expect(dashboard.tasks).toHaveCount(3);
    for (const task of await dashboard.tasks.all()) {
      await expect(task).toHaveAttribute('data-state', 'pending');
    }

    // 3. Read key and data-type of each
    const date = localDate(new Date());
    const keys = await dashboard.taskKeys();
    const slots = keys.map((key) => {
      expect(key).toMatch(new RegExp(`^${date}:\\d+$`));
      return key.split(':')[1];
    });
    expect(new Set(slots).size, 'three different slots').toBe(3);
    for (const task of await dashboard.tasks.all()) {
      const type = await task.getAttribute('data-type');
      expect(TASK_TYPES).toContain(type);
    }

    // 4. Inspect task-start: only the first task is primary
    const starts = dashboard.taskStart(dashboard.tasks);
    await expect(starts).toHaveCount(3);
    await expect(starts.first()).toHaveAttribute('data-state', 'primary');
    await expect(starts.nth(1)).not.toHaveAttribute('data-state', 'primary');
    await expect(starts.nth(2)).not.toHaveAttribute('data-state', 'primary');
    await expect(dashboard.todayContinue).toBeVisible();
  });

  test(
    'Count chosen on an untouched guest set applies at once',
    { tag: ['@REQ-PROG-02'] },
    async ({ dashboard, profile }) => {
      // 1. Remember the 3 task keys, then open /profile
      await dashboard.goto();
      await expect(dashboard.tasks).toHaveCount(3);
      const original = await dashboard.taskKeys();
      await profile.goto();

      // 2. Click option 5
      await profile.setDailyCount(5);
      await expect(profile.dailyOption(5)).toHaveAttribute('aria-pressed', 'true');
      await expect(profile.dailyPending).toHaveCount(0);

      // 3. Open /dash
      await dashboard.goto();
      await expect(dashboard.today).toHaveAttribute('data-total', '5');
      await expect(dashboard.tasks).toHaveCount(5);
      for (const task of await dashboard.tasks.all()) {
        await expect(task).toHaveAttribute('data-state', 'pending');
      }
      expect((await dashboard.taskKeys()).slice(0, 3)).toEqual(original);

      // 4. Return to /profile, choose 3, open /dash
      await profile.goto();
      await profile.setDailyCount(3);
      await dashboard.goto();
      await expect(dashboard.today).toHaveAttribute('data-total', '3');
      await expect(dashboard.tasks).toHaveCount(3);
      expect(await dashboard.taskKeys()).toEqual(original);
    },
  );

  test(
    'Account: the choice is saved on the server and survives reload',
    { tag: ['@REQ-PROG-02'] },
    async ({ authedPage, profile, dashboard, user, api }) => {
      // 1. Open /profile, click option 4
      await profile.goto();
      await profile.setDailyCount(4);
      await expect(profile.dailyError).toHaveCount(0);

      // 2. Reload /profile
      await authedPage.reload();
      await expect(profile.dailyOption(4)).toHaveAttribute('aria-pressed', 'true');

      // 3. Open /dash
      await dashboard.goto();
      await expect(dashboard.today).toHaveAttribute('data-total', '4');
      await expect(dashboard.tasks).toHaveCount(4);

      // 4. The server agrees
      const progress = await api.progress(user.token);
      expect(progress.dailyTaskCount).toBe(4);
      expect(progress.daily?.tasks).toHaveLength(4);
    },
  );

  test(
    'Account: a started set keeps its size, the hint shows',
    { tag: ['@REQ-PROG-02'] },
    async ({ authedPage: _signedIn, profile, dashboard, user, api, catalog }) => {
      // 1. Start the set through the API
      const before = (await api.progress(user.token)).daily;
      expect(before?.tasks, 'a set of 3 tasks').toHaveLength(3);
      const task = answerableTask(before!.tasks);
      await answerFor(api, catalog, user.token, task, 1);
      const started = (await api.progress(user.token)).daily!.tasks.find((t) => t.id === task.id)!;
      expect(started.progress > 0 || started.completedAt !== null).toBe(true);
      const keys = before!.tasks.map((t) => t.id);

      // 2. Open /profile, click option 5
      await profile.goto();
      await profile.setDailyCount(5);
      await expect(profile.dailyPending).toBeVisible();

      // 3. Open /dash: the old size is kept
      await dashboard.goto();
      await expect(dashboard.today).toHaveAttribute('data-total', '3');
      await expect(dashboard.tasks).toHaveCount(3);
      expect((await dashboard.taskKeys()).sort()).toEqual([...keys].sort());

      // 4. Back on /profile click option 3
      await profile.goto();
      await profile.setDailyCount(3);
      await expect(profile.dailyPending).toHaveCount(0);
    },
  );

  test(
    'Guest: a deferred count applies on the next local day',
    { tag: ['@REQ-PROG-02'] },
    async ({ page, dashboard, profile, quiz, api, catalog }) => {
      const start = new Date('2026-11-02T10:00:00+02:00');
      const today = localDate(start);
      const tomorrow = localDate(new Date(start.getTime() + 24 * 3600 * 1000));
      // The clock goes in before the first load, so the app never sees the real date.
      await page.clock.install({ time: start });

      // 1. As a guest, start the set (one correct answer in the task's section), open /profile
      await dashboard.goto();
      await expect(dashboard.tasks).toHaveCount(3);
      const task = dashboard.taskOfType('ANSWER_N').or(dashboard.taskOfType('CODE_REVIEW')).first();
      const href = await dashboard.taskStart(task).getAttribute('href');
      // ANSWER_N without a topic links to /quiz?pick=1: any section advances it.
      const sectionId = /\/quiz\/([^/?#]+)/.exec(href ?? '')?.[1] ?? catalog.sections[0]!.id;
      const taskKey = await task.getAttribute('data-key');
      await quiz.goto(sectionId);
      await quiz.startRun();
      await quiz.answerCorrectly(api);
      await dashboard.goto();
      await expect(dashboard.task(taskKey ?? '')).not.toHaveAttribute('data-state', 'pending');
      await profile.goto();

      // 2. Click option 5
      await profile.setDailyCount(5);
      await expect(profile.dailyPending).toBeVisible();
      await dashboard.goto();
      await expect(dashboard.today).toHaveAttribute('data-total', '3');
      expect(taskKey).toMatch(new RegExp(`^${today}:`));

      // 3. Advance the clock past local midnight and reload /dash
      await page.clock.fastForward('15:00:00');
      await page.reload();
      await expect(dashboard.today).toHaveAttribute('data-total', '5');
      await expect(dashboard.tasks).toHaveCount(5);
      for (const key of await dashboard.taskKeys()) {
        expect(key).toMatch(new RegExp(`^${tomorrow}:\\d+$`));
      }
    },
  );

  test(
    'Task goes pending → running → done, reward added once',
    { tag: ['@REQ-PROG-03'] },
    async ({ authedPage, dashboard, user, api, catalog }) => {
      // 1. CODE_REVIEW (target 3): 5 tasks of a fresh account always hold one
      const { daily } = await api.setDailyCount(user.token, 5);
      const task = daily!.tasks.find((t) => t.type === 'CODE_REVIEW')!;
      await authedPage.reload();
      const row = dashboard.task(task.id);
      const progress = dashboard.taskProgress(row);
      await expect(row).toHaveAttribute('data-state', 'pending');
      await expect(progress).toHaveAttribute('data-value', '0');
      await expect(progress).toHaveAttribute('data-total', String(task.target));
      await expect(progress).toHaveAttribute('data-reward', String(task.rewardXp));

      // 2. target-1 correct answers, reload
      await answerFor(api, catalog, user.token, task, task.target - 1);
      await authedPage.reload();
      await expect(row).toHaveAttribute('data-state', 'running');
      await expect(progress).toHaveAttribute('data-value', String(task.target - 1));
      await expect(dashboard.today).toHaveAttribute('data-value', '0');
      const midLog = (await api.progress(user.token)).xpLog;
      expect(midLog.filter((e) => e.reason === 'daily_task')).toHaveLength(0);

      // 3. The last answer, reload
      const answered = Object.keys((await api.progress(user.token)).questions);
      await answerFor(api, catalog, user.token, task, 1, answered);
      await authedPage.reload();
      await expect(row).toHaveAttribute('data-state', 'done');
      await expect(progress).toHaveAttribute('data-value', String(task.target));
      await expect(dashboard.taskStart(row)).toHaveCount(0);
      await expect(dashboard.today).toHaveAttribute('data-value', '1');

      // 4. Exactly one daily_task reward
      const rewards = (await api.progress(user.token)).xpLog.filter(
        (e) => e.reason === 'daily_task',
      );
      expect(rewards).toHaveLength(1);
      expect(rewards[0]!.refId).toBe(task.id);
      expect(rewards[0]!.amount).toBe(Number(await progress.getAttribute('data-reward')));
    },
  );
});
