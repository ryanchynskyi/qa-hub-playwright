import { expect, test } from '../../src/fixtures';

// Static HTML from the web host (`request` uses baseURL, not the API): what search engines see
// before any JavaScript runs. Prerendered pages point at the production origin on every host.
const SITE = 'https://qa-interview.com/';
const TITLE = 'QA Interview Hub';

const indexable = [
  { path: '', lang: 'uk', alternates: { uk: '', en: 'en/' } },
  { path: 'en/kb/', lang: 'en', alternates: { uk: 'kb/', en: 'en/kb/' } },
];
const appShells = ['dash/', 'en/leaderboard/'];

test.describe('prerendered HTML and SEO', { tag: ['@prod-safe', '@REQ-GEN-07'] }, () => {
  for (const { path, lang, alternates } of indexable) {
    test(`/${path} is indexable with canonical and hreflang`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toContain(`<html lang="${lang}"`);
      // A descriptive title; the bare site name is what app shells get.
      expect(html).toMatch(new RegExp(`<title>[^<]*${TITLE}[^<]*</title>`));
      expect(html).not.toContain(`<title>${TITLE}</title>`);
      expect(html).toContain(`<link rel="canonical" href="${SITE}${path}"`);
      expect(html).toContain(`hreflang="uk" href="${SITE}${alternates.uk}"`);
      expect(html).toContain(`hreflang="en" href="${SITE}${alternates.en}"`);
      expect(html).toContain(`hreflang="x-default" href="${SITE}${alternates.uk}"`);
      expect(html).not.toContain('name="robots"');
    });
  }

  for (const path of appShells) {
    test(`/${path} is an app shell marked noindex`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toContain('<meta name="robots" content="noindex"');
      expect(html).not.toContain('rel="canonical"');
    });
  }

  test('robots.txt allows crawling and the sitemap lists only indexable pages', async ({
    request,
  }) => {
    const robots = await (await request.get('robots.txt')).text();
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).not.toMatch(/^Disallow: \/$/m);
    expect(robots).toContain(`Sitemap: ${SITE}sitemap.xml`);

    const sitemap = await (await request.get('sitemap.xml')).text();
    for (const { path } of indexable) expect(sitemap).toContain(`<loc>${SITE}${path}</loc>`);
    for (const path of appShells) expect(sitemap).not.toContain(`${SITE}${path}`);
  });
});

// Plain strings only: HTML escaping would hide a leak of text with & < > or quotes.
const plain = (text: string) => text.length > 20 && !/[&<>"']/.test(text);

test(
  'a prerendered quiz section ships no question text and no explanations',
  { tag: ['@REQ-NFR-03'] },
  async ({ request, api }) => {
    const sectionId = 'sql';
    const html = await (await request.get(`quiz/${sectionId}/`)).text();
    // The prerendered page, not the bare app shell (which would pass this test vacuously).
    expect(html).toContain(`<link rel="canonical" href="${SITE}quiz/${sectionId}/"`);
    const questions = (await api.questions(sectionId)).filter((q) => plain(q.text)).slice(0, 5);
    expect(questions.length).toBeGreaterThan(0);
    // choice null records nothing.
    const checks = await Promise.all(questions.map((q) => api.checkAnswer(q.id, null)));
    const explanations = checks.map((c) => c.explanation).filter(plain);
    for (const { text } of questions) expect.soft(html).not.toContain(text);
    for (const explanation of explanations) expect.soft(html).not.toContain(explanation);
  },
);
