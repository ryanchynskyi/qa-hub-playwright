import type { ApiClient } from '../../src/api/client';
import { bearer, expectError } from '../../src/api/client';
import {
  dashAfterInterviews,
  day,
  ddmm,
  interviewInput,
  interviewThenJump,
  noon,
} from '../../src/helpers/clock';
import { readStorage } from '../../src/helpers/storage';
import { expect, test } from '../../src/fixtures';

// spec: specs/phase2-plan-clock.md (scenarios 5.1–5.9)
// seed: tests/seed.spec.ts

/** Answers 3 questions of today's plan round right, so the account has a readiness. */
async function answerThreeRight(api: ApiClient, token: string, date: string): Promise<void> {
  const { questionIds } = await api.startPlanDay(token, date);
  for (const id of questionIds.slice(0, 3)) {
    const result = await api.checkAnswer(id, await api.correctIndex(id), token);
    expect(result.outcome).toBe('correct');
  }
}

test.describe('PLAN-11 «Як пройшла?», move, history, profile tiles (UI + server clock)', () => {
  test(
    'the day after the interview the card is day1 and one answer saves to the history',
    { tag: ['@REQ-PLAN-11'] },
    async ({
      api,
      askCard,
      askedCard,
      catalog,
      dashboard,
      interviews,
      page,
      serverClock,
      signIn,
      user,
    }) => {
      // 1. Clock D0, interview D0+1; clock D0+2 12:00 (the day after), log in, open /dash.
      const interview = await interviewThenJump(api, catalog, serverClock, user, 2);
      await signIn(user);
      await page.clock.install({ time: noon(2) });
      await dashboard.goto();

      await expect(askCard.root).toHaveAttribute('data-state', 'day1');
      await expect(askCard.root).toHaveAttribute('data-value', day(1));
      await expect(askCard.title).toContainText(ddmm(day(1)));
      for (const key of ['offer', 'waiting', 'failed', 'moved'] as const) {
        await expect(askCard.option(key)).toBeVisible();
        await expect(askCard.option(key)).not.toBeChecked();
      }
      await expect(askCard.save).toBeDisabled();
      await expect(askCard.later).toBeVisible();
      await expect(askCard.close).toBeVisible();
      await expect(dashboard.tickerItem('ask')).toBeVisible();

      // 2. Pick «чекаю», save.
      await askCard.option('waiting').check();
      await askCard.save.click();
      await expect(askedCard.root).toHaveAttribute('data-state', 'list');
      await expect(askCard.root).toHaveCount(0);

      const { past } = await api.interviews((await api.login(user)).accessToken);
      expect(past[0]).toMatchObject({ id: interview.id, outcome: 'waiting' });
      await interviews.goto();
      await expect(interviews.row(interview.id)).toHaveAttribute('data-state', 'waiting');
      await expect(interviews.row(interview.id)).toHaveAttribute('data-value', day(1));
    },
  );

  test(
    'days 2 to 7 show the late card, after day 7 there is none',
    { tag: ['@REQ-PLAN-11'] },
    async ({
      api,
      askCard,
      catalog,
      dashboard,
      interviews,
      page,
      serverClock,
      shell,
      signIn,
      user,
    }) => {
      // 1. Interview D0+1, 3 right answers of its round on D0 (so a readiness exists); clock D0+3
      // (day 2); open /dash.
      await serverClock(noon(0));
      let token = (await api.login(user)).accessToken;
      const interview = await api.createInterview(token, interviewInput(catalog, day(1)));
      await answerThreeRight(api, token, day(0));
      await serverClock(noon(3));
      token = (await api.login(user)).accessToken;
      const readiness = (await api.interviews(token)).past[0]?.readiness;
      expect(readiness, 'the readiness on the interview date').toEqual(expect.any(Number));
      await signIn(user);
      await page.clock.install({ time: noon(3) });
      await dashboard.goto();

      await expect(askCard.root).toHaveAttribute('data-state', 'late');
      await expect(askCard.root).toHaveAttribute('data-value', day(1));
      await expect(askCard.title).toContainText(ddmm(day(1)));
      await expect(askCard.readiness).toHaveAttribute('data-value', String(readiness));
      await expect(askCard.save).toBeVisible();
      await expect(askCard.later).toBeVisible();

      // 2. Clock D0+8 (day 7): still late.
      await serverClock(noon(8));
      await signIn(user);
      await page.clock.setSystemTime(noon(8));
      await dashboard.goto();
      await expect(askCard.root).toHaveAttribute('data-state', 'late');
      await expect(askCard.root).toHaveAttribute('data-value', day(1));

      // 3. Clock D0+9 (day 8): no card, no ticker item; the history keeps the row without a result.
      await serverClock(noon(9));
      await signIn(user);
      await page.clock.setSystemTime(noon(9));
      await dashAfterInterviews(interviews, shell, dashboard, interview.id);
      await expect(askCard.root).toHaveCount(0);
      await expect(dashboard.tickerItem('ask')).toHaveCount(0);

      await interviews.goto();
      await expect(interviews.row(interview.id)).toHaveAttribute('data-state', 'none');
    },
  );

  test(
    '«Пізніше» and × hide the card until tomorrow',
    { tag: ['@REQ-PLAN-11'] },
    async ({
      api,
      askCard,
      catalog,
      dashboard,
      interviews,
      page,
      serverClock,
      shell,
      signIn,
      user,
    }) => {
      // 1. A late card (day 2); «Пізніше».
      const interview = await interviewThenJump(api, catalog, serverClock, user, 3);
      await signIn(user);
      await page.clock.install({ time: noon(3) });
      await dashboard.goto();
      await expect(askCard.root).toHaveAttribute('data-state', 'late');
      await askCard.later.click();
      await expect(askCard.root).toHaveCount(0);
      const hidden = JSON.parse(
        (await readStorage(page, 'qa-hub-ask-later-v1')) ?? 'null',
      ) as unknown;
      expect(hidden).toMatchObject({ id: interview.id, date: day(3) });

      // 2. A new page load the same day: still hidden.
      await dashAfterInterviews(interviews, shell, dashboard, interview.id);
      await expect(askCard.root).toHaveCount(0);

      // 3. Clock +1 day: the card is back.
      await serverClock(noon(4));
      await signIn(user);
      await page.clock.setSystemTime(noon(4));
      await dashboard.goto();
      await expect(askCard.root).toHaveAttribute('data-state', 'late');

      // 4. × instead of «Пізніше»: the same, hidden today and back tomorrow.
      await askCard.close.click();
      await expect(askCard.root).toHaveCount(0);
      await dashAfterInterviews(interviews, shell, dashboard, interview.id);
      await expect(askCard.root).toHaveCount(0);
      await serverClock(noon(5));
      await signIn(user);
      await page.clock.setSystemTime(noon(5));
      await dashboard.goto();
      await expect(askCard.root).toHaveAttribute('data-state', 'late');
    },
  );

  test(
    '«Перенесли» moves the same interview and writes nothing to the history',
    { tag: ['@REQ-PLAN-11'] },
    async ({
      api,
      askCard,
      catalog,
      dashboard,
      interview,
      interviews,
      page,
      serverClock,
      signIn,
      user,
    }) => {
      // 1. A late card with no other active interview; pick «Перенесли».
      const moved = await interviewThenJump(api, catalog, serverClock, user, 3);
      await signIn(user);
      await page.clock.install({ time: noon(3) });
      await dashboard.goto();
      await expect(askCard.root).toHaveAttribute('data-state', 'late');
      await expect(askCard.readiness).toHaveCount(1);
      await askCard.option('moved').check();

      await expect(askCard.move).toBeVisible();
      for (const key of ['tomorrow', 'in3', 'week'] as const) {
        await expect(askCard.chip(key)).toBeVisible();
      }
      await expect(interview.date).toHaveValue('');
      await expect(askCard.save).toBeDisabled();
      await expect(askCard.readiness).toHaveCount(0);

      // 2. Chip in3, save.
      await askCard.chip('in3').click();
      await askCard.save.click();
      await expect(dashboard.root).toHaveAttribute('data-state', 'plan');
      await expect(askCard.root).toHaveCount(0);

      const list = await api.interviews((await api.login(user)).accessToken);
      expect(list.active).toMatchObject({ id: moved.id, date: day(6), outcome: null });
      expect(list.past).toHaveLength(0);

      await interviews.goto();
      await expect(interviews.empty).toBeVisible();
      await expect(interviews.tile('past')).toHaveAttribute('data-value', '0');
      await expect(interviews.rows).toHaveCount(0);
    },
  );

  test(
    'a move onto an existing active interview asks interview-replace',
    { tag: ['@REQ-PLAN-11'] },
    async ({ api, askCard, catalog, dashboard, interview, page, serverClock, signIn, user }) => {
      // 1. A on D0+1 (past on D0+3); on D0+3 an interview B on D0+5; pick «Перенесли», in3, save.
      const a = await interviewThenJump(api, catalog, serverClock, user, 3);
      let token = (await api.login(user)).accessToken;
      const b = await api.createInterview(token, interviewInput(catalog, day(5)));
      await signIn(user);
      await page.clock.install({ time: noon(3) });
      await dashboard.goto();
      // A10: with an active interview the card stays, only the ticker item `ask` goes (the
      // card and the plan's ticker item are both drawn, so both answers are in).
      await expect(askCard.root).toHaveAttribute('data-state', 'late');
      await expect(dashboard.tickerItem('interview')).toBeVisible();
      await expect(dashboard.tickerItem('ask')).toHaveCount(0);
      await askCard.option('moved').check();
      await askCard.chip('in3').click();
      await askCard.save.click();

      await expect(askCard.replace).toBeVisible();
      await expect(interview.replaceWas).toHaveAttribute('data-value', day(5));
      await expect(interview.replaceNext).toHaveAttribute('data-value', day(6));

      // 2. «Лишити»: the dialog closes, nothing moved.
      await interview.replaceKeep.click();
      await expect(askCard.root).toBeVisible();
      await expect(askCard.replace).toHaveCount(0);
      token = (await api.login(user)).accessToken;
      let list = await api.interviews(token);
      expect(list.active).toMatchObject({ id: b.id, date: day(5) });
      expect(list.past[0]).toMatchObject({ id: a.id, outcome: null });

      // 3. Save again and «Замінити» (per test-ids; not observed in the UI).
      await askCard.save.click();
      await expect(askCard.replace).toBeVisible();
      await askCard.replaceConfirm.click();
      await expect(askCard.root).toHaveCount(0);
      list = await api.interviews(token);
      expect(list.active).toMatchObject({ id: a.id, date: day(6), outcome: null });
      expect(list.past).toHaveLength(0);
    },
  );

  test(
    '/profile/interviews lists newest first and a row changes the result',
    { tag: ['@REQ-PLAN-11'] },
    async ({ api, catalog, interviews, page, serverClock, signIn, user }) => {
      // 1. Three past interviews through clock jumps (one active at a time): D0+1 offer,
      // D0+4 unanswered, D0+9 waiting; 3 right answers on D0 give them a readiness.
      await serverClock(noon(0));
      let token = (await api.login(user)).accessToken;
      const first = await api.createInterview(token, interviewInput(catalog, day(1)));
      await answerThreeRight(api, token, day(0));
      await serverClock(noon(2));
      token = (await api.login(user)).accessToken;
      await api.setInterviewOutcome(token, first.id, 'offer');
      const second = await api.createInterview(token, interviewInput(catalog, day(4)));
      await serverClock(noon(5));
      token = (await api.login(user)).accessToken;
      const third = await api.createInterview(token, interviewInput(catalog, day(9)));
      await serverClock(noon(10));
      token = (await api.login(user)).accessToken;
      await api.setInterviewOutcome(token, third.id, 'waiting');

      await signIn(user);
      await page.clock.install({ time: noon(10) });
      await interviews.goto();

      await expect(interviews.rows).toHaveCount(3);
      expect(await interviews.rowKeys()).toEqual([third.id, second.id, first.id]);
      await expect(interviews.rows.nth(0)).toHaveAttribute('data-value', day(9));
      await expect(interviews.rows.nth(1)).toHaveAttribute('data-value', day(4));
      await expect(interviews.rows.nth(2)).toHaveAttribute('data-value', day(1));
      await expect(interviews.row(third.id)).toHaveAttribute('data-state', 'waiting');
      await expect(interviews.row(second.id)).toHaveAttribute('data-state', 'none');
      await expect(interviews.row(first.id)).toHaveAttribute('data-state', 'offer');
      await expect(interviews.tile('offer')).toHaveAttribute('data-value', '1');
      await expect(interviews.tile('waiting')).toHaveAttribute('data-value', '1');
      // Each row shows the readiness stored for its interview.
      for (const stored of (await api.interviews(token)).past) {
        expect(stored.readiness, `readiness of ${stored.date}`).toEqual(expect.any(Number));
        await expect(interviews.rowReadiness(stored.id)).toHaveAttribute(
          'data-value',
          String(stored.readiness),
        );
      }

      // 2. The «чекаю» row: the sheet opens on it; change to «офер», save.
      await interviews.row(third.id).click();
      await expect(interviews.sheet).toBeVisible();
      await expect(interviews.option('waiting')).toHaveAttribute('aria-checked', 'true');
      await interviews.option('offer').click();
      await interviews.save.click();
      await expect(interviews.sheet).toHaveCount(0);
      await expect(interviews.row(third.id)).toHaveAttribute('data-state', 'offer');
      await expect(interviews.tile('offer')).toHaveAttribute('data-value', '2');
      await expect(interviews.tile('waiting')).toHaveAttribute('data-value', '0');
    },
  );

  test(
    'the profile «Співбесіди» tiles follow the results',
    { tag: ['@REQ-PLAN-11'] },
    async ({ api, catalog, interviews, page, profile, serverClock, signIn, user }) => {
      // 1. /profile after one «чекаю» past interview.
      const interview = await interviewThenJump(api, catalog, serverClock, user, 2);
      await api.setInterviewOutcome((await api.login(user)).accessToken, interview.id, 'waiting');
      await signIn(user);
      await page.clock.install({ time: noon(2) });
      await profile.goto();

      await expect(interviews.tile('past')).toHaveAttribute('data-value', '1');
      await expect(interviews.tile('offer')).toHaveAttribute('data-value', '0');
      await expect(interviews.tile('waiting')).toHaveAttribute('data-value', '1');
      await expect(interviews.tile('failed')).toHaveAttribute('data-value', '0');

      // 2. The history page (opened directly: `interview-history-link` has no row of its own in
      // test-ids.md yet, see the plan's Corrections): the same tiles and no next interview.
      await interviews.goto();
      await expect(interviews.rows).toHaveCount(1);
      await expect(interviews.next).toHaveAttribute('data-state', 'none');
      await expect(interviews.tile('past')).toHaveAttribute('data-value', '1');
      await expect(interviews.tile('offer')).toHaveAttribute('data-value', '0');
      await expect(interviews.tile('waiting')).toHaveAttribute('data-value', '1');
      await expect(interviews.tile('failed')).toHaveAttribute('data-value', '0');
    },
  );

  test(
    'a guest on /profile/interviews is sent to the login',
    { tag: ['@REQ-PLAN-11'] },
    async ({ page }) => {
      // 1. In a guest context open /profile/interviews.
      await page.goto('profile/interviews');
      await expect(page).toHaveURL(/\/login\?next=%2Fprofile%2Finterviews$/);
    },
  );

  test(
    'outcome and move API rejections',
    { tag: ['@REQ-PLAN-11'] },
    async ({ api, catalog, otherUser, serverClock, user }) => {
      // Setup: clock D0, an interview D0+1 for the user and for another account; clock D0+2.
      await serverClock(noon(0));
      let token = (await api.login(user)).accessToken;
      const a = await api.createInterview(token, interviewInput(catalog, day(1)));
      const foreign = await api.createInterview(
        (await api.login(otherUser)).accessToken,
        interviewInput(catalog, day(1)),
      );
      await serverClock(noon(2));
      token = (await api.login(user)).accessToken;
      const headers = bearer(token);

      // 1. Outcome: an invalid value, a foreign interview id, an active interview.
      const invalid = await api.raw.put(`me/interviews/${a.id}/outcome`, {
        data: { outcome: 'bogus' },
        headers,
      });
      await expectError(invalid, 400, 'bad_request');
      const other = await api.raw.put(`me/interviews/${foreign.id}/outcome`, {
        data: { outcome: 'offer' },
        headers,
      });
      await expectError(other, 404, 'not_found');
      const b = await api.createInterview(token, interviewInput(catalog, day(4)));
      const active = await api.raw.put(`me/interviews/${b.id}/outcome`, {
        data: { outcome: 'offer' },
        headers,
      });
      await expectError(active, 404, 'not_found');

      // Move: a date outside tomorrow … +7 (today and +8), then onto the active B.
      for (const date of [day(2), day(10)]) {
        const res = await api.raw.post(`me/interviews/${a.id}/move`, { data: { date }, headers });
        await expectError(res, 400, 'interview_date');
      }
      const clash = await api.raw.post(`me/interviews/${a.id}/move`, {
        data: { date: day(3) },
        headers,
      });
      await expectError(clash, 409, 'interview_exists');
      expect((await api.interviews(token)).active?.id).toBe(b.id);

      // With replace: A takes a date after B's, so a surviving B would come back as `active`.
      const replaced = await api.moveInterview(token, a.id, { date: day(5), replace: true });
      expect(replaced).toMatchObject({ id: a.id, date: day(5) });
      const list = await api.interviews(token);
      expect(list.active?.id).toBe(a.id);
      expect(list.past).toHaveLength(0);

      // 2. A result, then a move: the interview is reopened with the result and the frozen
      // readiness cleared (intended, see «Неоднозначності» in specs/COVERAGE.md).
      await serverClock(noon(6));
      token = (await api.login(user)).accessToken;
      expect((await api.setInterviewOutcome(token, a.id, 'waiting')).outcome).toBe('waiting');
      const moved = await api.moveInterview(token, a.id, { date: day(8) });
      expect(moved).toMatchObject({ id: a.id, date: day(8), outcome: null, readiness: null });
      const after = await api.interviews(token);
      expect(after.active).toMatchObject({ id: a.id, outcome: null });
      expect(after.past).toHaveLength(0);
    },
  );
});
