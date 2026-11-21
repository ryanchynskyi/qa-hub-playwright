import type { Page, Route } from '@playwright/test';
import { env } from '../config/env';

/** `500`: the server answers with an error; `abort`: the connection drops; `delayMs`: a slow answer. */
export type Fault = 500 | 'abort' | { delayMs: number };

/**
 * Breaks one API endpoint for this page until the returned `restore` is called: `breakApi(page,
 * 'quiz/check', 'abort')`. Only requests to that path fail; the rest of the API works. `path` is a
 * Playwright glob, so a query string needs one: `comments?*targetId=*`.
 */
export async function breakApi(
  page: Page,
  path: string,
  fault: Fault,
): Promise<() => Promise<void>> {
  const url = `${env.apiURL}${path}`;
  const handler = async (route: Route): Promise<void> => {
    if (fault === 500) return route.fulfill({ status: 500, json: { error: 'injected' } });
    if (fault === 'abort') return route.abort('connectionfailed');
    await new Promise((resolve) => setTimeout(resolve, fault.delayMs));
    return route.fallback();
  };
  await page.route(url, handler);
  // Only this handler: another route on the same URL stays and takes over.
  return () => page.unroute(url, handler);
}

/**
 * Records every request this page sends to an API path from now on (`me/quiz/finish`), for "was
 * it sent, and with what body" checks: `expect(sent).toHaveLength(0)`. The array fills as they go.
 * A listener, not a `route`: nothing is mocked. JSON bodies only (every API body is JSON).
 */
export function recordApiRequests(page: Page, path: string): { method: string; body: unknown }[] {
  const url = `${env.apiURL}${path}`;
  const sent: { method: string; body: unknown }[] = [];
  page.on('request', (request) => {
    if (request.url().split('?')[0] !== url) return;
    sent.push({ method: request.method(), body: request.postDataJSON() as unknown });
  });
  return sent;
}
