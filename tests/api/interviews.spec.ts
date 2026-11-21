import { bearer, expectStatus, type InterviewInput } from '../../src/api/client';
import { ApiError, Interviews } from '../../src/api/schemas';
import { expect, test } from '../../src/fixtures';
import { localDate } from '../../src/helpers/data';

// spec: specs/phase2-plan.md (scenarios 1.3, 2.3)

test.describe('POST /me/interviews', () => {
  test(
    'the date must be tomorrow … today + 7, chapters non-empty, minutes 15/30/60',
    { tag: ['@REQ-PLAN-01'] },
    async ({ api, catalog, user }) => {
      const valid: InterviewInput = {
        date: localDate(1),
        level: 'middle',
        chapterIds: [catalog.chapters[0]!.id],
        minutesPerDay: 30,
      };
      const refused = [
        [{ ...valid, date: localDate(0) }, 'interview_date'],
        [{ ...valid, date: localDate(8) }, 'interview_date'],
        [{ ...valid, chapterIds: [] }, 'bad_request'],
        [{ ...valid, minutesPerDay: 20 }, 'bad_request'],
      ] as const;
      for (const [data, error] of refused) {
        const res = await api.raw.post('me/interviews', { data, headers: bearer(user.token) });
        await expectStatus(res, 400);
        expect(ApiError.parse(await res.json()).error, JSON.stringify(data)).toBe(error);
      }
      expect(
        (await api.interviews(user.token)).active,
        'nothing saved by a refused call',
      ).toBeNull();

      expect((await api.createInterview(user.token, valid)).date).toBe(localDate(1));
      const week = { ...valid, date: localDate(7), replace: true };
      expect((await api.createInterview(user.token, week)).date).toBe(localDate(7));
    },
  );

  test(
    'a second active interview is a 409 with the active one; replace: true swaps it',
    { tag: ['@REQ-PLAN-02'] },
    async ({ api, catalog, user }) => {
      const input: InterviewInput = {
        date: localDate(5),
        level: 'middle',
        chapterIds: [catalog.chapters[0]!.id],
        minutesPerDay: 30,
      };
      const first = await api.createInterview(user.token, input);
      const next = { ...input, date: localDate(2) };

      const res = await api.raw.post('me/interviews', { data: next, headers: bearer(user.token) });
      await expectStatus(res, 409);
      const body = (await res.json()) as unknown;
      expect(ApiError.parse(body).error).toBe('interview_exists');
      expect(Interviews.pick({ active: true }).parse(body).active?.id).toBe(first.id);
      expect((await api.interviews(user.token)).active?.id, 'the 409 kept the old one').toBe(
        first.id,
      );

      const second = await api.createInterview(user.token, { ...next, replace: true });
      const { active } = await api.interviews(user.token);
      expect(second.id).not.toBe(first.id);
      expect(active).toMatchObject({ id: second.id, date: localDate(2) });
    },
  );
});
