import { devices } from '@playwright/test';
import type { Device } from '../fixtures';

/**
 * The browser of a run (specs/COVERAGE.md, I-2 p. 6). Without SEED every run is chromium, as on a
 * PR; the nightly passes SEED (its run id), so each night picks a browser and the log and the
 * Allure report name the seed. `SEED=<n> npx playwright test` replays that night's config.
 */
export type Browser = 'chromium' | 'firefox' | 'webkit';

const BROWSERS: readonly Browser[] = ['chromium', 'firefox', 'webkit'];

/** Viewports of the app's layouts (docs/brief.md §10); the same on every browser. */
const VIEWPORTS: Record<Device, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 800, height: 800 },
  phone: { width: 390, height: 800 },
};

/** Base profile per browser and device. Firefox has no `isMobile`: its phone is only a viewport. */
const PROFILES: Record<Browser, Record<Device, (typeof devices)[string]>> = {
  chromium: {
    desktop: devices['Desktop Chrome'],
    tablet: devices['Desktop Chrome'],
    phone: devices['Pixel 7'],
  },
  firefox: {
    desktop: devices['Desktop Firefox'],
    tablet: devices['Desktop Firefox'],
    phone: devices['Desktop Firefox'],
  },
  webkit: {
    desktop: devices['Desktop Safari'],
    tablet: devices['Desktop Safari'],
    phone: devices['iPhone 13'],
  },
};

/** SEED → browser; throws on anything but a non-negative integer, so a typo is not chromium. */
export function browserFor(seed: string | undefined): Browser {
  if (seed === undefined || seed === '') return 'chromium';
  if (!/^\d+$/.test(seed)) throw new Error(`SEED must be a non-negative integer, got "${seed}"`);
  return BROWSERS[Number(BigInt(seed) % BigInt(BROWSERS.length))]!;
}

/** `use` of a UI project: the browser's profile for the device, with the app's viewport. */
export function deviceUse(browser: Browser, device: Device) {
  return { ...PROFILES[browser][device], browserName: browser, viewport: VIEWPORTS[device] };
}
