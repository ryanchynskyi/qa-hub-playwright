import type { Catalog } from '../../src/api/schemas';
import { expect, test } from '../../src/fixtures';
import { localDate } from '../../src/helpers/data';

// spec: specs/phase2-plan.md
// seed: tests/seed.spec.ts

/** A topic with at least `min` chapters and its chapter ids, taken from the catalog. */
function topicWith(catalog: Catalog, min: number, skip = 0) {
  const topics = catalog.topics
    .map((topic) => ({
      id: topic.id,
      chapterIds: catalog.chapters.filter((c) => c.topicId === topic.id).map((c) => c.id),
    }))
    .filter((topic) => topic.chapterIds.length >= min);
  const found = topics[skip];
  if (!found) throw new Error(`The catalog has no topic with ${min} chapters (skip ${skip})`);
  return found;
}

test.describe('PLAN-01 add an interview', () => {
  test(
    'a valid interview opens the plan and shows on the profile',
    { tag: ['@REQ-PLAN-01'] },
    async ({ authedPage, user, api, catalog, interview, plan }) => {
      const topic = topicWith(catalog, 1);
      const date = localDate(3);

      // 1. Open /profile/interview, pick in3, 60 minutes, senior and one topic
      await interview.goto();
      await interview.chip('in3').click();
      await interview.minutes(60).click();
      await interview.level('senior').click();
      await interview.toggleTopic(topic.id);
      await expect(interview.date).toHaveAttribute('data-value', date);
      await expect(interview.days).toHaveAttribute('data-value', '3');
      await expect(interview.save).toBeEnabled();
      await expect(interview.total).toHaveAttribute('data-value', String(topic.chapterIds.length));

      // 2. Click save
      await interview.save.click();
      await expect(authedPage).toHaveURL(/\/plan$/);
      await expect(plan.days).toHaveAttribute('data-value', '3');
      await expect(plan.minutes).toHaveAttribute('data-value', '60');
      await expect(plan.interview).toHaveAttribute('data-key', date);
      await expect(plan.interview).toHaveAttribute('data-value', 'senior');

      // 3. Open /profile
      await authedPage.goto('profile');
      await expect(interview.upcoming).toHaveAttribute('data-state', 'set');
      await expect(interview.upcoming).toHaveAttribute('data-value', date);
      await expect(interview.upcomingDays).toHaveAttribute('data-value', '3');

      // 4. The saved interview through the API
      const { active, past } = await api.interviews(user.token);
      expect(active?.date).toBe(date);
      expect(active?.level).toBe('senior');
      expect(active?.minutesPerDay).toBe(60);
      expect([...(active?.chapterIds ?? [])].sort()).toEqual([...topic.chapterIds].sort());
      expect(past).toEqual([]);
    },
  );

  test(
    'the boundary dates tomorrow and today+7 are accepted, today and today+8 refused in the form',
    { tag: ['@REQ-PLAN-01'] },
    async ({ authedPage, catalog, interview }) => {
      // 1. Open the form, pick one topic, fill today
      await interview.goto();
      await interview.toggleTopic(topicWith(catalog, 1).id);
      await interview.date.fill(localDate(0));
      await expect(interview.dateError).toBeVisible();
      await expect(interview.save).toBeDisabled();

      // 2. Fill today+8
      await interview.date.fill(localDate(8));
      await expect(interview.dateError).toBeVisible();
      await expect(interview.save).toBeDisabled();

      // 3. Fill tomorrow, then today+7
      await interview.date.fill(localDate(1));
      await expect(interview.dateError).toHaveCount(0);
      await expect(interview.save).toBeEnabled();
      await expect(interview.days).toHaveAttribute('data-value', '1');
      await interview.date.fill(localDate(7));
      await expect(interview.dateError).toHaveCount(0);
      await expect(interview.save).toBeEnabled();
      await expect(interview.days).toHaveAttribute('data-value', '7');
      await expect(authedPage).toHaveURL(/\/profile\/interview$/);
    },
  );

  test(
    'a guest opening the interview route is sent to the login with next',
    { tag: ['@REQ-PLAN-01'] },
    async ({ page, interview }) => {
      // 1. As a guest open /profile/interview
      await page.goto('profile/interview');
      await expect(page).toHaveURL(/\/login\?next=%2Fprofile%2Finterview$/);
      await expect(interview.root).toHaveCount(0);
    },
  );

  test(
    'the form is three steps on a phone, a reload on step 3 returns to step 1, and one page elsewhere',
    { tag: ['@REQ-PLAN-01', '@responsive'] },
    async ({ authedPage, catalog, interview, device }) => {
      const topic = topicWith(catalog, 1);
      const date = localDate(1);

      // 1. Open /profile/interview and fill the date with tomorrow
      await interview.goto();
      await interview.date.fill(date);

      // 2. A phone walks three steps (back, then a reload on step 3 loses the state); others see one page
      await interview.toTopics(device, date);

      // 3. Pick a topic and save: the app opens /plan
      await interview.toggleTopic(topic.id);
      await interview.save.click();
      await expect(authedPage).toHaveURL(/\/plan$/);
    },
  );
});

test.describe('PLAN-02 one active interview', () => {
  test(
    'a second interview asks before replacing and keep leaves the old one',
    { tag: ['@REQ-PLAN-02'] },
    async ({ authedPage, user, api, catalog, interview }) => {
      const topicA = topicWith(catalog, 1);
      const topicB = topicWith(catalog, 1, 1);
      const dateA = localDate(5);
      const dateB = localDate(2);

      // 1. Arrange the active interview A and open the form
      const a = await api.createInterview(user.token, {
        date: dateA,
        level: 'middle',
        chapterIds: topicA.chapterIds,
        minutesPerDay: 30,
      });
      await interview.goto();
      await expect(interview.replaces).toHaveAttribute('data-value', dateA);

      // 2. Pick date B and a topic, save
      await interview.date.fill(dateB);
      await interview.toggleTopic(topicB.id);
      await interview.save.click();
      await expect(interview.replace).toBeVisible();
      await expect(interview.replaceWas).toHaveAttribute('data-value', dateA);
      await expect(interview.replaceNext).toHaveAttribute('data-value', dateB);

      // 3. Keep the old one
      await interview.replaceKeep.click();
      await expect(interview.replace).toBeHidden();
      await expect(authedPage).toHaveURL(/\/profile\/interview$/);
      const { active } = await api.interviews(user.token);
      expect(active?.id).toBe(a.id);
      expect(active?.date).toBe(dateA);
    },
  );

  test(
    'Replace saves the new interview and the old one is no longer active',
    { tag: ['@REQ-PLAN-02'] },
    async ({ authedPage, user, api, catalog, interview, plan }) => {
      const topicA = topicWith(catalog, 1);
      const topicB = topicWith(catalog, 1, 1);
      const dateB = localDate(2);

      // 1. Arrange A, fill the form with B, save and confirm
      const a = await api.createInterview(user.token, {
        date: localDate(5),
        level: 'middle',
        chapterIds: topicA.chapterIds,
        minutesPerDay: 30,
      });
      await interview.goto();
      await interview.date.fill(dateB);
      await interview.toggleTopic(topicB.id);
      await interview.save.click();
      await interview.replaceConfirm.click();
      await expect(authedPage).toHaveURL(/\/plan$/);
      await expect(plan.days).toHaveAttribute('data-value', '2');

      // 2. The API has B as the active interview
      const { active } = await api.interviews(user.token);
      expect(active?.date).toBe(dateB);
      expect(active?.id).not.toBe(a.id);
    },
  );

  test(
    'Change the date changes date and level and shows the old days only when the date differs',
    { tag: ['@REQ-PLAN-02'] },
    async ({ authedPage, user, api, catalog, interview }) => {
      const topic = topicWith(catalog, 1);
      const a = await api.createInterview(user.token, {
        date: localDate(3),
        level: 'middle',
        chapterIds: topic.chapterIds,
        minutesPerDay: 30,
      });

      // 1. On /profile open the dialog and fill A's own date
      await authedPage.goto('profile');
      await interview.openChange();
      await interview.date.fill(a.date);
      await expect(interview.days).toHaveAttribute('data-value', '3');
      await expect(interview.daysWas).toHaveCount(0);

      // 2. Fill today+5 and pick senior
      await interview.date.fill(localDate(5));
      await interview.changeLevel('senior').click();
      await expect(interview.days).toHaveAttribute('data-value', '5');
      await expect(interview.daysWas).toHaveAttribute('data-value', '3');

      // 3. Save, reload /profile
      await interview.changeSave.click();
      await expect(interview.change).toBeHidden();
      await authedPage.reload();
      await expect(interview.upcoming).toHaveAttribute('data-value', localDate(5));
      await expect(interview.upcomingDays).toHaveAttribute('data-value', '5');
      const { active } = await api.interviews(user.token);
      expect(active?.level).toBe('senior');
      expect(active?.chapterIds).toEqual(a.chapterIds);
    },
  );

  test(
    'the topics link opens the edit form prefilled and saves with PATCH',
    { tag: ['@REQ-PLAN-02'] },
    async ({ authedPage, user, api, catalog, interview }) => {
      const topic = topicWith(catalog, 2);
      const chapterIds = topic.chapterIds.slice(0, 2);
      const a = await api.createInterview(user.token, {
        date: localDate(3),
        level: 'middle',
        chapterIds,
        minutesPerDay: 30,
      });

      // 1. On /profile open the dialog and follow the topics link
      await authedPage.goto('profile');
      await interview.openChange();
      await interview.topicsEdit.click();
      await expect(authedPage).toHaveURL(/\/profile\/interview\?edit=1$/);
      await expect(interview.form).toHaveAttribute('data-state', 'edit');
      await expect(interview.date).toHaveAttribute('data-value', a.date);
      await expect(interview.total).toHaveAttribute('data-value', '2');

      // 2. Untick one chapter and save
      await interview.toggleSection(chapterIds[0]!);
      await interview.save.click();
      await expect(authedPage).toHaveURL(/\/plan$/);
      const { active } = await api.interviews(user.token);
      expect(active?.id).toBe(a.id);
      expect(active?.chapterIds).toEqual([chapterIds[1]]);
    },
  );
});
