import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

// Local e2e stack from scripts/stack.mjs (docs/brief.md §2.1). Hard-coded for now: env profiles
// (TARGET=local|prod) and the guard against production come on day 3. The trailing slash matters:
// in prod the app lives under /qa-interview-tests/, so tests should navigate with relative paths
// ('./#/dash'), which resolve against a base that ends in '/'.
const BASE_URL = 'http://localhost:4273/';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [[isCI ? 'github' : 'list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    // Daily tasks reset at the user's local midnight; a fixed zone keeps runs near midnight stable.
    timezoneId: 'Europe/Kyiv',
    locale: 'uk-UA',
    // No retries locally, so 'on-first-retry' would never record a trace there.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
});
