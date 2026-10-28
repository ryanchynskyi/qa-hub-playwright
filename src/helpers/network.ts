import type { Page } from '@playwright/test';
import { env } from '../config/env';

/** `500`: the server answers with an error; `abort`: the connection drops; `delayMs`: a slow answer. */
export type Fault = 500 | 'abort' | { delayMs: number };

/**
 * Breaks one API endpoint for this page until the returned `restore` is called: `breakApi(page,
 * 'quiz/check', 'abort')`. Only requests to that path fail; the rest of the API works.
 */
export async function breakApi(
  page: Page,
  path: string,
  fault: Fault,
): Promise<() => Promise<void>> {
  // shortcut: exact URL, a query string would not match; switch to a glob when an endpoint needs one.
  const url = `${env.apiURL}${path}`;
  await page.route(url, async (route) => {
    if (fault === 500) return route.fulfill({ status: 500, json: { error: 'injected' } });
    if (fault === 'abort') return route.abort('connectionfailed');
    await new Promise((resolve) => setTimeout(resolve, fault.delayMs));
    return route.fallback();
  });
  return () => page.unroute(url);
}
