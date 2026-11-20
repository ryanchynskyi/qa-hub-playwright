import { expect, test } from '../../src/fixtures';

// Markup a naive renderer would run; the API must store and return it as plain text. Unique per
// test so the message can be found among the shared comments.
const html = (tag: string) => `<img src=x onerror="alert('${tag}')"><b>${tag}</b>`;

test.describe('user text is stored verbatim', { tag: ['@REQ-SOC-04', '@REQ-NFR-04'] }, () => {
  test('comment', async ({ api, user, catalog }) => {
    const questionId = catalog.questions[0]!.id;
    const text = html(`comment-${Date.now()}`);
    await api.postComment(user.token, questionId, text);
    const items = await api.comments(questionId);
    expect(items.map((item) => item.text)).toContain(text);
  });
});
