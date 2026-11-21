import type { ApiClient, Credentials } from '../../src/api/client';
import { bearer, expectError } from '../../src/api/client';
import type { AskedQuestions, Catalog, Interview } from '../../src/api/schemas';
import {
  dashAfterInterviews,
  day,
  interviewInput,
  interviewThenJump,
  noon,
  topicChapters,
} from '../../src/helpers/clock';
import { DEFAULT_PASSWORD, uniqueEmail } from '../../src/helpers/data';
import { newNonce } from '../../src/helpers/google';
import { expect, test } from '../../src/fixtures';

// spec: specs/phase2-plan-clock.md (scenarios 6.1–6.8, Suite 6 block of the Corrections)
// seed: tests/seed.spec.ts

type Suggested = AskedQuestions['suggested'][number];

/** Interview on D0+1, clock D0+2, result «офер» saved; the asked list of that interview. */
async function pastInterview(
  api: ApiClient,
  catalog: Catalog,
  serverClock: (at: string) => Promise<void>,
  user: Credentials,
) {
  const interview = await interviewThenJump(api, catalog, serverClock, user, 2);
  const token = (await api.login(user)).accessToken;
  await api.setInterviewOutcome(token, interview.id, 'offer');
  const asked = await api.askedQuestions(token, interview.id);
  return { interview, token, asked };
}

/** Clock D0: one interview on D0+1 per account (one topic), then clock D0+2. */
async function startAccounts(
  api: ApiClient,
  catalog: Catalog,
  serverClock: (at: string) => Promise<void>,
  accounts: Credentials[],
): Promise<Interview[]> {
  await serverClock(noon(0));
  const interviews: Interview[] = [];
  for (const account of accounts) {
    const token = (await api.login(account)).accessToken;
    interviews.push(await api.createInterview(token, interviewInput(catalog, day(1))));
  }
  await serverClock(noon(2));
  return interviews;
}

/** Result «офер», then one mark: `questionId`, or the first suggestion. Returns that suggestion. */
async function mark(
  api: ApiClient,
  account: Credentials,
  interview: Interview,
  questionId?: string,
): Promise<Suggested> {
  const token = (await api.login(account)).accessToken;
  await api.setInterviewOutcome(token, interview.id, 'offer');
  const [first] = (await api.askedQuestions(token, interview.id)).suggested;
  expect(first, 'a suggestion for the interview').toBeDefined();
  await api.saveAskedQuestions(token, interview.id, {
    questionIds: [questionId ?? first?.id ?? ''],
    texts: [],
  });
  return first as Suggested;
}

/** The own question in the owner's inbox, found by its unique text (the inbox is database-wide). */
async function inboxItem(api: ApiClient, adminToken: string, text: string) {
  const item = (await api.adminAsked(adminToken)).items.find((i) => i.text === text);
  if (!item) throw new Error('own question is not in the admin inbox');
  return item;
}

test.describe('PLAN-12 «Які питання тобі ставили?» (UI + API)', () => {
  test(
    'after the result the asked card offers suggestions, search and one own question',
    { tag: ['@REQ-PLAN-12'] },
    async ({
      api,
      askedCard,
      catalog,
      dashboard,
      interviews,
      page,
      serverClock,
      shell,
      signIn,
      user,
    }) => {
      // 1. Past interview on D0+1, clock D0+2, result saved through the API; open /dash.
      const { interview, token, asked } = await pastInterview(api, catalog, serverClock, user);
      const [first] = asked.suggested;
      expect(first, 'a suggestion').toBeDefined();
      // Suggestions are questions of the interview's chapters and level.
      const chapters = topicChapters(catalog);
      const bank = await api.questions(first?.sectionId ?? '');
      for (const suggestion of asked.suggested) {
        const question = bank.find((q) => q.id === suggestion.id);
        expect(chapters, suggestion.id).toContain(question?.chapterId);
        expect(question?.level, suggestion.id).toBe(interview.level);
      }
      // A question of the interview's chapters that is NOT suggested, found by its own text.
      const candidate = bank.find(
        (q) => chapters.includes(q.chapterId) && !asked.suggested.some((s) => s.id === q.id),
      );
      expect(candidate, 'a question to find through the search').toBeDefined();
      const term = (candidate?.text ?? '').slice(0, 40).trim();
      expect((await api.askedSearch(token, term)).map((q) => q.id)).toContain(candidate?.id);
      const own = `own ${newNonce().nonce}`;

      await signIn(user);
      await page.clock.install({ time: noon(2) });
      await dashAfterInterviews(interviews, shell, dashboard, interview.id);

      await expect(askedCard.root).toHaveAttribute('data-state', 'list');
      await expect(askedCard.root).toHaveAttribute('data-value', day(1));
      await expect(askedCard.options).toHaveCount(4);
      for (const suggestion of asked.suggested) {
        await expect(askedCard.option(suggestion.id)).toHaveAttribute('data-state', 'off');
      }
      await expect(askedCard.save).toHaveAttribute('data-value', '0');
      await expect(askedCard.save).toBeDisabled();
      await expect(askedCard.later).toBeVisible();
      await expect(askedCard.text).toBeVisible();

      // 2. Check the first suggestion.
      await askedCard.option(first?.id ?? '').check();
      await expect(askedCard.option(first?.id ?? '')).toHaveAttribute('data-state', 'on');
      await expect(askedCard.save).toHaveAttribute('data-value', '1');

      // 3. Search: no hit for a nonce, then a term from a question's own text; mark the result;
      // fill one own question.
      await askedCard.search.fill(newNonce().nonce);
      await expect(askedCard.none).toBeVisible();
      await askedCard.search.fill(term);
      await expect(askedCard.result(candidate?.id ?? '')).toBeVisible();
      await askedCard.result(candidate?.id ?? '').click();
      await expect(askedCard.result(candidate?.id ?? '')).toHaveAttribute('data-state', 'on');
      await expect(askedCard.save).toHaveAttribute('data-value', '2');
      await askedCard.text.fill(own);
      await expect(askedCard.save).toHaveAttribute('data-value', '3');

      // 4. Save.
      await askedCard.save.click();
      await expect(askedCard.root).toHaveAttribute('data-state', 'thanks');
      // marks + own questions (test-ids: asked-thanks-count)
      await expect(askedCard.thanksCount).toHaveAttribute('data-value', '3');
      // Both marked questions are of one section (`bank`), so one row.
      await expect(askedCard.sections).toHaveAttribute('data-key', first?.sectionId ?? '');

      const saved = await api.askedQuestions(token, interview.id);
      expect(saved.picked.map((q) => q.id).sort()).toEqual(
        [first?.id ?? '', candidate?.id ?? ''].sort(),
      );
      expect(saved.texts).toEqual([own]);
    },
  );

  test(
    '«Пізніше» hides the asked card until tomorrow',
    { tag: ['@REQ-PLAN-12'] },
    async ({
      api,
      askedCard,
      catalog,
      dashboard,
      interviews,
      page,
      serverClock,
      shell,
      signIn,
      user,
    }) => {
      // 1. Setup as 6.1; «Пізніше»: the card goes and stays hidden after a reload the same day.
      const { interview } = await pastInterview(api, catalog, serverClock, user);
      await signIn(user);
      await page.clock.install({ time: noon(2) });
      await dashAfterInterviews(interviews, shell, dashboard, interview.id);
      await expect(askedCard.root).toHaveAttribute('data-state', 'list');
      await askedCard.later.click();
      await expect(askedCard.root).toHaveCount(0);
      await dashAfterInterviews(interviews, shell, dashboard, interview.id);
      await expect(askedCard.root).toHaveCount(0);

      // 2. Clock +1 day: the card is back.
      await serverClock(noon(3));
      await signIn(user);
      await page.clock.setSystemTime(noon(3));
      await dashAfterInterviews(interviews, shell, dashboard, interview.id);
      await expect(askedCard.root).toHaveAttribute('data-state', 'list');
    },
  );

  test(
    'the history sheet row «Питання» edits the marks',
    { tag: ['@REQ-PLAN-12'] },
    async ({ api, askedCard, catalog, interviews, page, serverClock, signIn, user }) => {
      // 1. Setup with 1 mark + 1 own text saved through the API; open the history, the row.
      const { interview, token, asked } = await pastInterview(api, catalog, serverClock, user);
      const [first] = asked.suggested;
      expect(first, 'a suggestion').toBeDefined();
      const own = `own ${newNonce().nonce}`;
      await api.saveAskedQuestions(token, interview.id, {
        questionIds: [first?.id ?? ''],
        texts: [own],
      });
      await signIn(user);
      await page.clock.install({ time: noon(2) });
      await interviews.goto();
      await interviews.row(interview.id).click();
      await expect(interviews.sheet).toBeVisible();
      await expect(interviews.questions).toHaveAttribute('data-value', '2');

      // 2. Open the editor; uncheck the mark; save.
      await interviews.questions.click();
      await expect(askedCard.sheet).toBeVisible();
      await expect(askedCard.option(first?.id ?? '')).toHaveAttribute('data-state', 'on');
      await expect(askedCard.stored).toHaveAttribute('data-value', '1');
      await askedCard.option(first?.id ?? '').uncheck();
      await expect(askedCard.option(first?.id ?? '')).toHaveAttribute('data-state', 'off');
      await askedCard.save.click();

      // The save returns to the result sheet, where the count is the own question only.
      await expect(askedCard.sheet).toHaveCount(0);
      await expect(interviews.questions).toHaveAttribute('data-value', '1');
      const saved = await api.askedQuestions(token, interview.id);
      expect(saved.picked).toHaveLength(0);
      expect(saved.texts).toEqual([own]);
    },
  );

  test(
    'a question marked by 3 users shows the quiz tag, also to guests',
    { tag: ['@REQ-PLAN-12'] },
    async ({ api, catalog, otherUser, page, quiz, serverClock, user }) => {
      const third: Credentials = { email: uniqueEmail('pw-asked'), password: DEFAULT_PASSWORD };
      await api.register({ ...third, displayName: 'PW Third' });
      try {
        // 1. Three accounts, one interview each; the same question marked by all.
        const accounts = [user, otherUser, third];
        const [a, b, c] = await startAccounts(api, catalog, serverClock, accounts);
        const target = await mark(api, user, a as Interview);
        // The absolute counts hold because the clock project runs alone and accounts are deleted.
        const one = await api.questions(target.sectionId);
        expect(
          one.find((q) => q.id === target.id)?.asked ?? null,
          'marks left by an interrupted run: npm run stack:reset',
        ).toBeNull();
        await mark(api, otherUser, b as Interview, target.id);
        await mark(api, third, c as Interview, target.id);

        const section = await api.questions(target.sectionId);
        expect(section.find((q) => q.id === target.id)?.asked).toBe(3);
        expect(section.filter((q) => q.id !== target.id && q.asked != null)).toEqual([]);

        // 2. A guest (`page`, a new context: no quiz cache) steps to the question in «Усі питання».
        await quiz.goto(target.sectionId);
        await quiz.startRun('all');
        const taggedBefore = await quiz.seek(target.id);
        expect(taggedBefore, 'skipped questions that showed the tag').toBe(0);
        await expect(quiz.askedTag).toHaveAttribute('data-value', '3');
        await expect(quiz.askedNote).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`/quiz/${target.sectionId}`));
      } finally {
        await api.deleteAccount((await api.login(third)).accessToken, third.email);
      }
    },
  );

  test(
    'two users are not enough for the tag',
    { tag: ['@REQ-PLAN-12'] },
    async ({ api, catalog, otherUser, serverClock, user }) => {
      const third: Credentials = { email: uniqueEmail('pw-asked'), password: DEFAULT_PASSWORD };
      await api.register({ ...third, displayName: 'PW Third' });
      try {
        // 1. Two accounts mark the same question: `asked` stays null.
        const [a, b, c] = await startAccounts(api, catalog, serverClock, [user, otherUser, third]);
        const target = await mark(api, user, a as Interview);
        await mark(api, otherUser, b as Interview, target.id);
        const two = await api.questions(target.sectionId);
        expect(two.find((q) => q.id === target.id)).toBeDefined();
        expect(
          two.find((q) => q.id === target.id)?.asked ?? null,
          'null at 2 (or marks left by an interrupted run: npm run stack:reset)',
        ).toBeNull();

        // 2. A third account marks it: `asked` is 3.
        await mark(api, third, c as Interview, target.id);
        const three = await api.questions(target.sectionId);
        expect(three.find((q) => q.id === target.id)?.asked).toBe(3);
      } finally {
        await api.deleteAccount((await api.login(third)).accessToken, third.email);
      }
    },
  );

  test(
    'an own question reaches the admin inbox without a name',
    { tag: ['@REQ-PLAN-12'] },
    async ({ adminToken, api, catalog, serverClock, user }) => {
      // 1. A user saves an own question with a unique text on a past interview.
      const { interview, token } = await pastInterview(api, catalog, serverClock, user);
      const own = `own ${newNonce().nonce}`;
      await api.saveAskedQuestions(token, interview.id, { questionIds: [], texts: [own] });
      // The owner's token was minted before the jump (real time); back to real time to use it.
      await api.setClock({ offsetMs: 0 });

      // The raw key set first: the strict schema in `inboxItem` would fail on a leak before it.
      const rawList = (await (
        await api.raw.get('admin/asked', { headers: bearer(adminToken) })
      ).json()) as { items: Record<string, unknown>[] };
      const rawItem = rawList.items.find((i) => i.text === own);
      expect(rawItem).toBeDefined();
      expect(Object.keys(rawItem ?? {}).sort()).toEqual(
        ['chapters', 'createdAt', 'id', 'interviewDate', 'level', 'status', 'text'].sort(),
      );
      const item = await inboxItem(api, adminToken, own);
      const ids = topicChapters(catalog);
      expect(item).toMatchObject({
        status: 'open',
        level: interview.level,
        interviewDate: interview.date,
        chapters: catalog.chapters.filter((c) => ids.includes(c.id)).map((c) => c.title),
      });
      // Signed out: 401; a plain user: 403 (recorded from the app).
      await expectError(await api.raw.get('admin/asked'), 401, 'unauthorized');
      const plain = (await api.login(user)).accessToken;
      await expectError(
        await api.raw.get('admin/asked', { headers: bearer(plain) }),
        403,
        'forbidden',
      );

      // 2. Mark it done, read again.
      const done = await api.setAskedStatus(adminToken, item.id, 'done');
      expect(done.status).toBe('done');
      expect((await inboxItem(api, adminToken, own)).status).toBe('done');
    },
  );

  test(
    'the admin inbox filter asked shows the own question',
    { tag: ['@REQ-PLAN-12'] },
    async ({ admin, adminToken, api, catalog, serverClock, user }) => {
      // The owner session exists only inside fixtures: written from the plan, not walked.
      // 1. Setup: an own question on a past interview; real time again for the owner's session.
      const { interview, token } = await pastInterview(api, catalog, serverClock, user);
      const own = `own ${newNonce().nonce}`;
      await api.saveAskedQuestions(token, interview.id, { questionIds: [], texts: [own] });
      await api.setClock({ offsetMs: 0 });
      const { id } = await inboxItem(api, adminToken, own);
      const asked = admin.asked(id);

      // The inbox, the chip `asked`, the row: open, without an author.
      await admin.reload();
      await admin.filter('asked').click();
      await expect(admin.filter('asked')).toHaveAttribute('data-state', 'active');
      await expect(asked.row).toBeVisible();
      await expect(asked.row).toHaveAttribute('data-state', 'open');
      await expect(asked.row).not.toContainText(user.email);
      await expect(asked.row).not.toContainText(user.displayName);

      // The toggle switches it to done.
      await admin.expand(asked.row);
      await expect(asked.body).toHaveAttribute('data-state', 'open');
      await expect(asked.body).not.toContainText(user.email);
      await expect(asked.body).not.toContainText(user.displayName);
      await asked.toggle.click();
      await expect(asked.body).toHaveAttribute('data-state', 'done');
      expect((await inboxItem(api, adminToken, own)).status).toBe('done');
    },
  );

  test(
    'asked-question API rejections',
    { tag: ['@REQ-PLAN-12'] },
    async ({ api, catalog, serverClock, user }) => {
      const { interview, token, asked } = await pastInterview(api, catalog, serverClock, user);
      const url = `me/interviews/${interview.id}/questions`;
      const headers = bearer(token);
      const [first] = asked.suggested;
      expect(first, 'a suggestion').toBeDefined();

      // 1. Unknown id, 301 characters, one own text over the limit: the codes the app answers.
      await expectError(
        await api.raw.put(url, { data: { questionIds: ['no-such-question'], texts: [] }, headers }),
        400,
        'bad_request',
      );
      await expectError(
        await api.raw.put(url, { data: { questionIds: [], texts: ['x'.repeat(301)] }, headers }),
        400,
        'bad_request',
      );
      await expectError(
        await api.raw.put(url, {
          data: { questionIds: [], texts: ['a', 'b', 'c', 'd', 'e', 'f'] },
          headers,
        }),
        400,
        'asked_texts_limit',
      );
      // The limit counts the stored ones too: 5 stored, then 1 more.
      await api.saveAskedQuestions(token, interview.id, {
        questionIds: [],
        texts: ['a', 'b', 'c', 'd', 'e'],
      });
      await expectError(
        await api.raw.put(url, { data: { questionIds: [], texts: ['f'] }, headers }),
        400,
        'asked_texts_limit',
      );

      // Duplicated ids: one mark.
      await api.saveAskedQuestions(token, interview.id, {
        questionIds: [first?.id ?? '', first?.id ?? ''],
        texts: [],
      });
      const saved = await api.askedQuestions(token, interview.id);
      expect(saved.picked.map((q) => q.id)).toEqual([first?.id]);
    },
  );
});
