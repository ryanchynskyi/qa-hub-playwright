import type { Page } from '@playwright/test';
import { expect, test } from '../../src/fixtures';
import { localDate } from '../../src/helpers/data';
import { readStorage } from '../../src/helpers/storage';
import { DashboardPage } from '../../src/pages/dashboard-page';
import { InterviewPage } from '../../src/pages/interview-page';

// spec: specs/phase2-plan.md
// seed: tests/seed.spec.ts

/** The focus is device-local (test-ids.md, `qa-hub-focus`); a reload would restore `skipped`. */
async function expectFocus(page: Page, topicId: string, level: string): Promise<void> {
  const saved = JSON.parse((await readStorage(page, 'qa-hub-focus')) ?? '{}') as {
    level?: string;
    topics?: string[];
  };
  expect(saved).toMatchObject({ level, topics: [topicId] });
}

test.describe('PLAN-03 onboarding and the add-date tile', () => {
  test(
    'Done with a date saves the focus and an interview',
    { tag: ['@REQ-PLAN-03'] },
    async ({ authedPage, user, api, catalog, focus, interview, dashboard }) => {
      const topicId = catalog.topics[0]!.id;
      // 1. On /dash open the focus setup, pick a topic, next
      await focus.setupOpen.click();
      await focus.toLevelStep(topicId);
      await expect(interview.onboard).toBeVisible();

      // 2. Pick in3, 15 minutes and senior
      await interview.chip('in3').click();
      await interview.minutes(15).click();
      await focus.level('senior').click();
      await expect(interview.onboardSum).toHaveAttribute('data-value', localDate(3));

      // 3. Save
      await focus.save.click();
      await expect(dashboard.root).toHaveAttribute('data-state', 'plan');
      const { active } = await api.interviews(user.token);
      expect(active?.date).toBe(localDate(3));
      expect(active?.minutesPerDay).toBe(15);
      expect(active?.level).toBe('senior');
      const chapters = catalog.chapters.filter((c) => c.topicId === topicId).map((c) => c.id);
      expect([...(active?.chapterIds ?? [])].sort()).toEqual(chapters.sort());
      await expectFocus(authedPage, topicId, 'senior');
      await expect(authedPage).toHaveURL(/\/dash$/);
    },
  );

  test(
    'Done without a date saves only the focus',
    { tag: ['@REQ-PLAN-03'] },
    async ({ authedPage, user, api, catalog, focus, interview, dashboard }) => {
      const topicId = catalog.topics[0]!.id;
      // 1. Reach step 2 and save without picking a date
      await focus.setupOpen.click();
      await focus.toLevelStep(topicId);
      await expect(interview.onboard).toBeVisible();
      await expect(interview.onboardSum).toHaveCount(0);
      await focus.save.click();

      // 2. The wizard is closed, no interview exists, the add-date tile is offered
      await expect(focus.step).toHaveCount(0);
      await expect(dashboard.addDate).toBeVisible();
      await expect(dashboard.root).not.toHaveAttribute('data-state', 'plan');
      expect((await api.interviews(user.token)).active).toBeNull();
      await expectFocus(authedPage, topicId, 'middle');
      await expect(authedPage).toHaveURL(/\/dash$/);
    },
  );

  test(
    'with an active interview step 2 has no date block',
    { tag: ['@REQ-PLAN-03'] },
    async ({ authedPage, user, api, catalog, focus, interview, dashboard }) => {
      // 1. Arrange an interview, open /dash, open the setup, pick a topic, next
      await api.createInterview(user.token, {
        date: localDate(3),
        level: 'middle',
        chapterIds: catalog.chapters
          .filter((c) => c.topicId === catalog.topics[0]!.id)
          .map((c) => c.id),
        minutesPerDay: 30,
      });
      await dashboard.goto();
      await focus.setupOpen.click();
      await focus.toLevelStep();
      await expect(focus.level('middle')).toBeVisible();
      await expect(focus.save).toBeVisible();
      await expect(interview.onboard).toHaveCount(0);
      await expect(authedPage).toHaveURL(/\/dash$/);
    },
  );

  test(
    'the add-date tile leads to the form and is gone after adding; never for a guest',
    { tag: ['@REQ-PLAN-03'] },
    async ({ page, secondPage, catalog }) => {
      // `page` stays the guest; the signed-in side is `secondPage` (same user, another context).
      const signedDash = new DashboardPage(secondPage);
      const signedInterview = new InterviewPage(secondPage);

      // 1. Signed in without an interview: the tile leads to the form
      await signedDash.goto();
      await expect(signedDash.addDate).toBeVisible();
      await signedDash.addDateLink.click();
      await expect(secondPage).toHaveURL(/\/profile\/interview$/);

      // 2. Add an interview through the form (in3: tomorrow would make the dashboard «finish») and open /dash
      await signedInterview.chip('in3').click();
      await signedInterview.toggleTopic(catalog.topics[0]!.id);
      await signedInterview.save.click();
      await expect(secondPage).toHaveURL(/\/plan$/);
      await signedDash.goto();
      await expect(signedDash.root).toHaveAttribute('data-state', 'plan');
      await expect(signedDash.addDate).toHaveCount(0);

      // 3. A guest never gets the tile
      const guestDash = new DashboardPage(page);
      await guestDash.goto();
      await expect(guestDash.root).toBeVisible();
      await expect(guestDash.addDate).toHaveCount(0);
    },
  );
});
