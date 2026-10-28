import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';
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

/** A UI project per layout of the app (docs/brief.md §10). */
function uiProject(device: Device, use: FrameworkOptions & Record<string, unknown>) {
  return {
    name: device,
    testIgnore: 'api/**',
    grep: grepFor(device),
    use: { ...use, device },
  };
}

export default defineConfig<FrameworkOptions>({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.isCI ? 1 : 0,
  reporter: [[env.isCI ? 'github' : 'list'], ['html', { open: 'never' }]],
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
    uiProject('desktop', { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }),
    uiProject('tablet', { ...devices['Desktop Chrome'], viewport: { width: 800, height: 800 } }),
    uiProject('phone', { ...devices['Pixel 7'], viewport: { width: 390, height: 800 } }),
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
