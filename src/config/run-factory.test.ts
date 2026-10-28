/** Self-check of run-factory.ts (`npm run test:unit`, part of `npm run check`). */
import assert from 'node:assert/strict';
import { browserFor, deviceUse } from './run-factory.ts';

// No SEED is chromium, as on a PR.
assert.equal(browserFor(undefined), 'chromium');
assert.equal(browserFor(''), 'chromium');

// The same SEED replays the same browser, and seeds cover every browser.
assert.equal(browserFor('20251028123'), browserFor('20251028123'));
assert.deepEqual(
  new Set(['0', '1', '2'].map(browserFor)),
  new Set(['chromium', 'firefox', 'webkit']),
);

// A SEED that is not a number fails instead of falling back to chromium.
assert.throws(() => browserFor('abc'), /SEED must be/);
assert.throws(() => browserFor('-1'), /SEED must be/);

// Every browser × device runs that browser's profile at the app viewport.
for (const browser of ['chromium', 'firefox', 'webkit'] as const) {
  for (const device of ['desktop', 'tablet', 'phone'] as const) {
    const use = deviceUse(browser, device);
    assert.equal(use.browserName, browser);
    assert.equal(use.defaultBrowserType, browser, `${browser}/${device} profile`);
  }
}
assert.equal(deviceUse('firefox', 'phone').isMobile, false);
assert.equal(deviceUse('webkit', 'phone').viewport.width, 390);

console.log('run-factory: ok');
