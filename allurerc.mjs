/**
 * Allure Report 3 (specs/COVERAGE.md, I-2). `npm run report:allure` builds it from allure-results/;
 * the nightly sets ALLURE_HISTORY to the history file it keeps on the gh-pages branch, so the
 * report shows trends, flaky tests and durations across nights.
 */
import { defineConfig } from 'allure';

export default defineConfig({
  name: `QA Hub e2e${process.env.APP_REF ? ` · app ${process.env.APP_REF}` : ''}`,
  output: 'allure-report',
  historyPath: process.env.ALLURE_HISTORY ?? 'allure-history.jsonl',
  historyLimit: 30,
  // First match wins; the order goes from the most to the least specific cause.
  categories: [
    {
      name: 'Infrastructure',
      messageRegex:
        '.*(ECONNREFUSED|ECONNRESET|socket hang up|net::ERR_|webServer|Service Unavailable|status 50[234]).*',
      matchedStatuses: ['failed', 'broken'],
    },
    {
      name: 'Test defect',
      messageRegex:
        '.*(strict mode violation|is not a function|Cannot read propert|TypeError|ReferenceError|SyntaxError).*',
      matchedStatuses: ['failed', 'broken'],
    },
    {
      name: 'Product bug',
      matchedStatuses: ['failed'],
    },
  ],
  plugins: {
    awesome: { options: { singleFile: false, reportLanguage: 'en' } },
  },
});
