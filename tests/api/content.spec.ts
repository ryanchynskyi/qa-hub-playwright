import { expect, test } from '../../src/fixtures';

test.describe('content API', { tag: ['@prod-safe'] }, () => {
  test('health reports a live database and content', { tag: '@smoke' }, async ({ api }) => {
    const health = await api.health(); // the zod schema asserts status=ok, db=up, counts > 0
    expect(health.content.questions).toBeGreaterThan(0);
  });

  test('catalog is consistent with health counts and itself', async ({ api, catalog }) => {
    const health = await api.health();
    // Volumes change with content edits: compare two sources, never hard-code a number.
    expect(catalog.questions).toHaveLength(health.content.questions);
    expect(catalog.recallCards).toHaveLength(health.content.recallCards);

    const sectionIds = new Set(catalog.sections.map((s) => s.id));
    const chapterIds = new Set(catalog.chapters.map((c) => c.id));
    for (const q of catalog.questions) {
      expect.soft(sectionIds, `section of question ${q.id}`).toContain(q.sectionId);
      expect.soft(chapterIds, `chapter of question ${q.id}`).toContain(q.chapterId);
    }
    for (const section of catalog.sections) {
      const count = catalog.questions.filter((q) => q.sectionId === section.id).length;
      expect.soft(section.questionCount, `questionCount of ${section.id}`).toBe(count);
    }
  });

  // Security invariant: the quiz client must not be able to read answers before checking.
  // Raw JSON on purpose: the zod schema would silently drop a leaked field.
  test('questions of every section carry no answers', async ({ api, catalog }) => {
    for (const section of catalog.sections) {
      await test.step(section.id, async () => {
        const res = await api.raw.get(`sections/${section.id}/questions`);
        expect(res.status()).toBe(200);
        const questions = (await res.json()) as Record<string, unknown>[];
        expect(questions).toHaveLength(section.questionCount);
        for (const q of questions) {
          expect.soft(q, `question ${String(q.id)}`).not.toHaveProperty('correctIndex');
          expect.soft(q, `question ${String(q.id)}`).not.toHaveProperty('explanation');
        }
      });
    }
  });

  test('English content is served with lang=en', async ({ api, catalog }) => {
    const sectionId = catalog.sections[0]!.id;
    const [uk, en] = await Promise.all([
      api.questions(sectionId, 'uk'),
      api.questions(sectionId, 'en'),
    ]);
    expect(en.map((q) => q.id)).toEqual(uk.map((q) => q.id));
    expect(en[0]!.text).not.toBe(uk[0]!.text);
  });
});

test.describe('knowledge base search', { tag: ['@prod-safe'] }, () => {
  test('finds articles for a 2+ character query', async ({ api }) => {
    const hits = await api.search('join', 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(5);
  });

  const invalid = [
    { name: 'query shorter than 2 characters', query: 'q=j' },
    { name: 'limit above 50', query: 'q=join&limit=51' },
  ];
  for (const { name, query } of invalid) {
    test(`rejects a ${name} with 400`, async ({ api }) => {
      const res = await api.raw.get(`kb/search?${query}`);
      expect(res.status()).toBe(400);
      expect(await res.json()).toMatchObject({ error: 'bad_request' });
    });
  }
});
