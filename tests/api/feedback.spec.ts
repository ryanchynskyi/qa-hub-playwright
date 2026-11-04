import { randomUUID } from 'node:crypto';
import type { APIResponse } from '@playwright/test';
import { bearer, UPLOAD_CONTEXT, type ApiClient } from '../../src/api/client';
import { expect, test } from '../../src/fixtures';
import { PNG_BASE64, uniqueText } from '../../src/helpers/data';

/** BUG_IMAGE_MAX_BYTES of the app: the limit of one decoded image. */
const IMAGE_MAX_BYTES = 1_500_000;

const png = { mime: 'image/png', data: PNG_BASE64 };
const base64 = (bytes: number[]) => Buffer.from(bytes).toString('base64');
/** The server checks only the magic bytes of these two. */
const jpeg = { mime: 'image/jpeg', data: base64([0xff, 0xd8, 0xff, 0xe0]) };
const webp = {
  mime: 'image/webp',
  data: base64([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
};
const pngOfSize = (size: number) => {
  const bytes = Buffer.alloc(size);
  Buffer.from(PNG_BASE64, 'base64').copy(bytes);
  return { mime: 'image/png', data: bytes.toString('base64') };
};

const post = (api: ApiClient, path: string, data: object, token?: string): Promise<APIResponse> =>
  api.raw.post(path, { data: { ...UPLOAD_CONTEXT, ...data }, headers: bearer(token) });

const postBug = (api: ApiClient, text: string, images?: object[]) =>
  post(api, 'bug-reports', { text, images });

const postFeedback = (api: ApiClient, rating: unknown, extra: object = {}) =>
  post(api, 'feedback', { rating, ...extra });

const markSeen = (api: ApiClient, number: number, token?: string) =>
  api.raw.post(`me/feedback/${number}/seen`, { headers: bearer(token) });

const adminItem = async (api: ApiClient, adminToken: string, id: string) => {
  const { items } = await api.adminFeedback(adminToken);
  return items.find((item) => item.id === id)!;
};

async function expectError(res: APIResponse, status: number, error: string): Promise<void> {
  expect(res.status(), await res.text()).toBe(status);
  expect(((await res.json()) as { error: string }).error).toBe(error);
}

test.describe('bug report text', { tag: ['@REQ-FB-02'] }, () => {
  test('5 to 4000 characters pass, the rest is refused', async ({ api, adminToken }) => {
    await expectError(await postBug(api, 'abcd'), 400, 'bad_request');
    expect((await postBug(api, 'abcde')).status()).toBe(201);
    await expectError(await postBug(api, 'a'.repeat(4001)), 400, 'bad_request');

    const longest = uniqueText('bug').padEnd(4000, 'a');
    const { id } = (await (await postBug(api, longest)).json()) as { id: number };
    const { items } = await api.adminBugReports(adminToken);
    expect(items.find((item) => item.id === id)!.text).toBe(longest);
  });

  test('spaces do not count towards the minimum', async ({ api }) => {
    await expectError(await postBug(api, '  abcd  '), 400, 'bad_request');
  });
});

test.describe('images of bug reports and feedback', () => {
  test(
    'up to 3 are kept, a 4th is refused',
    { tag: ['@REQ-FB-03'] },
    async ({ api, adminToken }) => {
      const three = [png, jpeg, webp];

      const bug = await postBug(api, uniqueText('bug'), three);
      expect(bug.status()).toBe(201);
      const { id } = (await bug.json()) as { id: number };
      const { items } = await api.adminBugReports(adminToken);
      expect(items.find((item) => item.id === id)!.images.map((image) => image.mime)).toEqual(
        expect.arrayContaining(['image/png', 'image/jpeg', 'image/webp']),
      );

      const feedback = await postFeedback(api, 5, { images: three });
      expect(feedback.status()).toBe(201);
      const created = (await feedback.json()) as { id: string };
      expect((await adminItem(api, adminToken, created.id)).images).toHaveLength(3);

      const four = [...three, png];
      await expectError(await postBug(api, uniqueText('bug'), four), 400, 'bad_request');
      await expectError(await postFeedback(api, 5, { images: four }), 400, 'bad_request');
    },
  );

  test(
    'the server checks the content, not the declared type',
    { tag: ['@REQ-FB-04'] },
    async ({ api }) => {
      const text = base64([...Buffer.from('not an image')]);
      const refused = [
        { mime: 'image/png', data: text },
        { mime: 'image/jpeg', data: PNG_BASE64 },
        { mime: 'image/webp', data: PNG_BASE64 },
        { mime: 'image/png', data: 'not base64!' },
      ];
      for (const image of refused) {
        await expectError(await postBug(api, uniqueText('bug'), [image]), 400, 'bad_image');
        await expectError(await postFeedback(api, 5, { images: [image] }), 400, 'bad_image');
      }
      const gif = { mime: 'image/gif', data: text };
      await expectError(await postBug(api, uniqueText('bug'), [gif]), 400, 'bad_request');
    },
  );

  test('one image is limited to 1.5 MB', { tag: ['@REQ-FB-03'] }, async ({ api }) => {
    const res = await postBug(api, uniqueText('bug'), [pngOfSize(IMAGE_MAX_BYTES + 1)]);
    await expectError(res, 400, 'image_too_large');
    const atLimit = await postBug(api, uniqueText('bug'), [pngOfSize(IMAGE_MAX_BYTES)]);
    expect(atLimit.status()).toBe(201);
  });
});

test.describe('feedback rating and text', { tag: ['@REQ-FB-05'] }, () => {
  test('the rating is a whole number from 1 to 5', async ({ api }) => {
    for (const rating of [0, 6, 3.5, undefined]) {
      await expectError(await postFeedback(api, rating), 400, 'bad_request');
    }
    for (const rating of [1, 5]) {
      expect((await postFeedback(api, rating)).status()).toBe(201);
    }
  });

  test('the comment is optional, up to 1000 characters', async ({ api }) => {
    const longest = await postFeedback(api, 4, { text: 'a'.repeat(1000) });
    expect(longest.status()).toBe(201);
    const tooLong = await postFeedback(api, 4, { text: 'a'.repeat(1001) });
    await expectError(tooLong, 400, 'bad_request');
  });
});

test.describe('feedback number and author', { tag: ['@REQ-FB-06'] }, () => {
  test('a user gets a higher number each time, under their name', async ({
    api,
    user,
    adminToken,
  }) => {
    const first = await api.sendFeedback(4, user.token);
    const second = await api.sendFeedback(2, user.token);
    expect(second.number).toBeGreaterThan(first.number);

    const item = await adminItem(api, adminToken, second.id);
    expect(item).toMatchObject({
      number: second.number,
      rating: 2,
      author: user.displayName,
      canReply: true,
    });
  });

  test('a guest has no author and cannot be answered', async ({ api, adminToken }) => {
    const { id, number } = await api.sendFeedback(3);
    expect(await adminItem(api, adminToken, id)).toMatchObject({
      number,
      author: null,
      canReply: false,
    });
  });
});

test.describe('the reply to feedback', { tag: ['@REQ-FB-07'] }, () => {
  const putReply = (api: ApiClient, id: string, reply: string, token: string) =>
    api.raw.put(`admin/feedback/${id}/reply`, { data: { reply }, headers: bearer(token) });

  test('a guest has no one to reply to', async ({ api, adminToken }) => {
    const { id } = await api.sendFeedback(3);
    await expectError(await putReply(api, id, 'hello', adminToken), 409, 'no_author');
  });

  test('1 to 2000 characters, spaces do not count', async ({ api, user, adminToken }) => {
    const { id } = await api.sendFeedback(3, user.token);
    await expectError(await putReply(api, id, '   ', adminToken), 400, 'bad_request');
    await expectError(await putReply(api, id, 'a'.repeat(2001), adminToken), 400, 'bad_request');
    expect((await putReply(api, id, 'a'.repeat(2000), adminToken)).status()).toBe(200);
  });

  test('an unknown feedback is 404', async ({ api, adminToken }) => {
    await expectError(await putReply(api, randomUUID(), 'hello', adminToken), 404, 'not_found');
    await expectError(await putReply(api, 'not-a-uuid', 'hello', adminToken), 404, 'not_found');
  });

  test('seen is idempotent, and editing the reply makes it unseen again', async ({
    api,
    user,
    adminToken,
  }) => {
    const { id, number } = await api.sendFeedback(3, user.token);
    const isSeen = async () =>
      (await api.myFeedback(user.token)).items.find((item) => item.number === number)!.seen;

    const reply = uniqueText('reply');
    await api.replyToFeedback(adminToken, id, reply);
    expect(await isSeen()).toBe(false);
    expect((await api.myFeedback(user.token)).items[0]!.reply).toBe(reply);

    expect((await markSeen(api, number, user.token)).status()).toBe(204);
    expect((await markSeen(api, number, user.token)).status()).toBe(204);
    expect(await isSeen()).toBe(true);

    await api.replyToFeedback(adminToken, id, uniqueText('edited'));
    expect(await isSeen()).toBe(false);
  });
});

test.describe('my feedback', { tag: ['@REQ-FB-08'] }, () => {
  test('newest first, only my own', async ({ api, user, otherUser }) => {
    const first = await api.sendFeedback(5, user.token);
    const second = await api.sendFeedback(2, user.token);
    const { items } = await api.myFeedback(user.token);
    expect(items.map((item) => item.number)).toEqual([second.number, first.number]);
    expect((await api.myFeedback(otherUser.token)).items).toEqual([]);
  });

  test('someone else’s number is the same 404 as an unknown one', async ({
    api,
    user,
    otherUser,
  }) => {
    const { number } = await api.sendFeedback(5, user.token);
    await expectError(await markSeen(api, number, otherUser.token), 404, 'not_found');
    await expectError(await markSeen(api, 2_147_483_647, otherUser.token), 404, 'not_found');
  });

  test('a guest has no list', async ({ api }) => {
    expect((await api.raw.get('me/feedback')).status()).toBe(401);
    expect((await markSeen(api, 1)).status()).toBe(401);
  });
});

test.describe('bug report status', { tag: ['@REQ-ADM-04'] }, () => {
  const patch = (api: ApiClient, id: number | string, status: string, token: string) =>
    api.raw.patch(`admin/bug-reports/${id}`, { data: { status }, headers: bearer(token) });

  test('done and back to open; the open counter leaves out done reports', async ({
    api,
    adminToken,
  }) => {
    const { id } = await api.sendBugReport(uniqueText('bug'));
    const statusInList = async () =>
      (await api.adminBugReports(adminToken)).items.find((item) => item.id === id)!.status;
    expect(await statusInList()).toBe('open');

    await api.setBugStatus(adminToken, id, 'done');
    expect(await statusInList()).toBe('done');
    // The two counts are separate queries, so a parallel test's new report can hide the gap once.
    await expect
      .poll(async () => {
        const { open, total } = await api.adminBugReports(adminToken);
        return total - open;
      })
      .toBeGreaterThan(0);

    await api.setBugStatus(adminToken, id, 'open');
    expect(await statusInList()).toBe('open');
  });

  test('an unknown report or status is refused', async ({ api, adminToken }) => {
    const { id } = await api.sendBugReport(uniqueText('bug'));
    await expectError(await patch(api, id, 'closed', adminToken), 400, 'bad_request');
    await expectError(await patch(api, 2_147_483_647, 'done', adminToken), 404, 'not_found');
    await expectError(await patch(api, 'abc', 'done', adminToken), 404, 'not_found');
  });
});
