import { bearer } from '../../src/api/client';
import { expect, test } from '../../src/fixtures';

test.describe('anonymous chat messages', { tag: ['@REQ-SOC-05'] }, () => {
  test('the tag is stable per author, differs between authors and hides who wrote', async ({
    api,
    user,
    otherUser,
  }) => {
    const first = await api.postChat(user.token, `pw-anon-${crypto.randomUUID()}`, true);
    const second = await api.postChat(user.token, `pw-anon-${crypto.randomUUID()}`, true);
    const other = await api.postChat(otherUser.token, `pw-anon-${crypto.randomUUID()}`, true);
    const otherAgain = await api.postChat(otherUser.token, `pw-anon-${crypto.randomUUID()}`, true);

    expect(first.anonNumber).not.toBeNull();
    expect(second.anonNumber).toBe(first.anonNumber);
    expect(other.anonNumber).not.toBeNull();
    expect(other.anonNumber).not.toBe(first.anonNumber);
    expect(otherAgain.anonNumber).toBe(other.anonNumber);

    // Raw JSON on purpose: the zod schema would drop an unexpected field instead of showing it.
    const res = await api.raw.get('chat/messages');
    expect(res.status()).toBe(200);
    const { messages } = (await res.json()) as { messages: Record<string, unknown>[] };
    const { id: userId } = await api.me(user.token);
    const { id: otherUserId } = await api.me(otherUser.token);
    for (const posted of [first, second, other, otherAgain]) {
      const message = messages.find((m) => m.id === posted.id)!;
      expect(message.anonNumber).toBe(posted.anonNumber);
      expect(message.name).toBeNull();
      expect(Object.keys(message).sort()).toEqual([
        'anonNumber',
        'createdAt',
        'deleted',
        'id',
        'isMine',
        'name',
        'text',
      ]);
      const raw = JSON.stringify(message);
      for (const secret of [
        user.email,
        otherUser.email,
        user.displayName,
        otherUser.displayName,
        userId,
        otherUserId,
      ]) {
        expect(raw).not.toContain(secret);
      }
    }
  });

  test('a named message has no tag', async ({ api, user }) => {
    const message = await api.postChat(user.token, `pw-named-${crypto.randomUUID()}`);
    expect(message).toMatchObject({ name: user.displayName, anonNumber: null });
  });
});

test.describe('chat access and limits', { tag: ['@REQ-SOC-03'] }, () => {
  test('a guest reads, but cannot post', async ({ api }) => {
    expect((await api.raw.get('chat/messages')).status()).toBe(200);

    const res = await api.raw.post('chat/messages', { data: { text: 'pw-guest' } });
    expect(res.status()).toBe(401);
  });

  for (const [name, text, status] of [
    ['empty', '', 400],
    ['only spaces', '   ', 400],
    ['501 characters', 'x'.repeat(501), 400],
    ['500 characters', 'x'.repeat(500), 201],
    ['1 character', 'x', 201],
  ] as const) {
    test(`a message of ${name} gets ${status}`, async ({ api, user }) => {
      const res = await api.raw.post('chat/messages', {
        data: { text },
        headers: bearer(user.token),
      });
      expect(res.status()).toBe(status);
    });
  }
});
