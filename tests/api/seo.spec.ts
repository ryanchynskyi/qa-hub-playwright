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
