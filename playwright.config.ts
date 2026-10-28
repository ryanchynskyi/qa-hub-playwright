import { defineConfig } from '@playwright/test';
import { env } from './src/config/env';
import { browserFor, deviceUse } from './src/config/run-factory';
import type { Device, FrameworkOptions } from './src/fixtures';

/**
 * Tag filter of a project. A project's `grep` replaces the top-level one, so every project builds
 * its own: all required tags must be in the title (regex lookaheads = AND).
 * - prod: only @prod-safe (read-only) tests, on every project;
 * - tablet/phone: only @responsive tests (layout checks), desktop runs all UI tests.
 */
function grepFor(device?: Device): RegExp | undefined {
  const required: string[] = [];
  if (env.isProd) required.push('@prod-safe');
  if (device && device !== 'desktop') required.push('@responsive');
  return required.length ? new RegExp(required.map((tag) => `(?=.*${tag})`).join('')) : undefined;
}

const browser = browserFor(process.env.SEED);
// The config loads in every worker too; log the run's config once, from the main process.
if (process.env.SEED && process.env.TEST_WORKER_INDEX === undefined) {
  console.log(`SEED=${process.env.SEED} → ${browser}`);
}

/** A UI project per layout of the app (docs/brief.md §10), on the run's browser. */
function uiProject(device: Device) {
  return {
    name: device,
    testIgnore: 'api/**',
    grep: grepFor(device),
    use: { ...deviceUse(browser, device), device },
  };
}

export default defineConfig<FrameworkOptions>({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.isCI ? 1 : 0,
  reporter: [
    [env.isCI ? 'github' : 'list'],
    ['html', { open: 'never' }],
    // Raw results for the Allure report (allurerc.mjs); APP_* come from the CI workflow.
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        environmentInfo: {
          target: env.target,
          browser,
          seed: process.env.SEED ?? 'none',
          app_ref: process.env.APP_REF ?? 'local',
          app_sha: process.env.APP_SHA ?? 'local',
        },
      },
    ],
  ],
  globalSetup: './src/setup/global-setup.ts',

  use: {
    baseURL: env.baseURL,
    // Daily tasks reset at the user's local midnight; a fixed zone keeps runs near midnight stable.
    timezoneId: 'Europe/Kyiv',
    locale: 'uk-UA',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'api', testDir: './tests/api', grep: grepFor() },
    uiProject('desktop'),
    uiProject('tablet'),
    uiProject('phone'),
  ],

  // The local stack: Postgres, the app's e2e API (:3200) and the built web app (:4273).
  // Locally an already running stack (`npm run stack`) is reused; prod has no web server.
  webServer: env.isProd
    ? undefined
    : {
        command: 'node scripts/stack.mjs',
        url: env.baseURL,
        reuseExistingServer: !env.isCI,
        timeout: 300_000,
        stdout: 'ignore',
      },
});
