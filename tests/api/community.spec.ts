import { expect, test } from '../../src/fixtures';

// Markup a naive renderer would run; the API must store and return it as plain text. Unique per
// test so the message can be found in the shared chat feed.
const html = (tag: string) => `<img src=x onerror="alert('${tag}')"><b>${tag}</b>`;

test.describe('user text is stored verbatim', { tag: ['@REQ-SOC-04', '@REQ-NFR-04'] }, () => {
  test('chat message', async ({ api, user }) => {
    const text = html(`chat-${Date.now()}`);
    const { id } = await api.postChat(user.token, text);
    const messages = await api.chatMessages();
    expect(messages.find((message) => message.id === id)?.text).toBe(text);
  });

  test('comment', async ({ api, user, catalog }) => {
    const questionId = catalog.questions[0]!.id;
    const text = html(`comment-${Date.now()}`);
    await api.postComment(user.token, questionId, text);
    const items = await api.comments(questionId);
    expect(items.map((item) => item.text)).toContain(text);
  });
});
