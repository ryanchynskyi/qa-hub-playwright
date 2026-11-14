# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/chat.spec.ts >> chat access and limits >> a message of empty gets 400
- Location: tests/api/chat.spec.ts:75:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 404
```

# Test source

```ts
  1  | import { bearer } from '../../src/api/client';
  2  | import { expect, test } from '../../src/fixtures';
  3  | 
  4  | test.describe('anonymous chat messages', { tag: ['@REQ-SOC-05'] }, () => {
  5  |   test('the tag is stable per author, differs between authors and hides who wrote', async ({
  6  |     api,
  7  |     user,
  8  |     otherUser,
  9  |   }) => {
  10 |     const first = await api.postChat(user.token, `pw-anon-${crypto.randomUUID()}`, true);
  11 |     const second = await api.postChat(user.token, `pw-anon-${crypto.randomUUID()}`, true);
  12 |     const other = await api.postChat(otherUser.token, `pw-anon-${crypto.randomUUID()}`, true);
  13 |     const otherAgain = await api.postChat(otherUser.token, `pw-anon-${crypto.randomUUID()}`, true);
  14 | 
  15 |     expect(first.anonNumber).not.toBeNull();
  16 |     expect(second.anonNumber).toBe(first.anonNumber);
  17 |     expect(other.anonNumber).not.toBeNull();
  18 |     expect(other.anonNumber).not.toBe(first.anonNumber);
  19 |     expect(otherAgain.anonNumber).toBe(other.anonNumber);
  20 | 
  21 |     // Raw JSON on purpose: the zod schema would drop an unexpected field instead of showing it.
  22 |     const res = await api.raw.get('chat/messages');
  23 |     expect(res.status()).toBe(200);
  24 |     const { messages } = (await res.json()) as { messages: Record<string, unknown>[] };
  25 |     const { id: userId } = await api.me(user.token);
  26 |     const { id: otherUserId } = await api.me(otherUser.token);
  27 |     for (const posted of [first, second, other, otherAgain]) {
  28 |       const message = messages.find((m) => m.id === posted.id)!;
  29 |       expect(message.anonNumber).toBe(posted.anonNumber);
  30 |       expect(message.name).toBeNull();
  31 |       expect(Object.keys(message).sort()).toEqual([
  32 |         'anonNumber',
  33 |         'createdAt',
  34 |         'deleted',
  35 |         'id',
  36 |         'isMine',
  37 |         'name',
  38 |         'text',
  39 |       ]);
  40 |       const raw = JSON.stringify(message);
  41 |       for (const secret of [
  42 |         user.email,
  43 |         otherUser.email,
  44 |         user.displayName,
  45 |         otherUser.displayName,
  46 |         userId,
  47 |         otherUserId,
  48 |       ]) {
  49 |         expect(raw).not.toContain(secret);
  50 |       }
  51 |     }
  52 |   });
  53 | 
  54 |   test('a named message has no tag', async ({ api, user }) => {
  55 |     const message = await api.postChat(user.token, `pw-named-${crypto.randomUUID()}`);
  56 |     expect(message).toMatchObject({ name: user.displayName, anonNumber: null });
  57 |   });
  58 | });
  59 | 
  60 | test.describe('chat access and limits', { tag: ['@REQ-SOC-03'] }, () => {
  61 |   test('a guest reads, but cannot post', async ({ api }) => {
  62 |     expect((await api.raw.get('chat/messages')).status()).toBe(200);
  63 | 
  64 |     const res = await api.raw.post('chat/messages', { data: { text: 'pw-guest' } });
  65 |     expect(res.status()).toBe(401);
  66 |   });
  67 | 
  68 |   for (const [name, text, status] of [
  69 |     ['empty', '', 400],
  70 |     ['only spaces', '   ', 400],
  71 |     ['501 characters', 'x'.repeat(501), 400],
  72 |     ['500 characters', 'x'.repeat(500), 201],
  73 |     ['1 character', 'x', 201],
  74 |   ] as const) {
  75 |     test(`a message of ${name} gets ${status}`, async ({ api, user }) => {
  76 |       const res = await api.raw.post('chat/messages', {
  77 |         data: { text },
  78 |         headers: bearer(user.token),
  79 |       });
> 80 |       expect(res.status()).toBe(status);
     |                            ^ Error: expect(received).toBe(expected) // Object.is equality
  81 |     });
  82 |   }
  83 | });
  84 | 
```