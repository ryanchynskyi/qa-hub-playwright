import { request } from '@playwright/test';
import { env } from '../config/env';

const TIMEOUT_MS = env.isProd ? 120_000 : 60_000;
const POLL_MS = 2_000;

/**
 * Waits until the API answers /health with a live database. Locally webServer only waits for the
 * web port; in prod the Render free plan sleeps and the first request can take about a minute.
 * Without this, the first tests of a run fail on a cold API instead of on a real bug.
 */
export default async function globalSetup(): Promise<void> {
  const api = await request.newContext({ baseURL: env.apiURL });
  const deadline = Date.now() + TIMEOUT_MS;
  let lastError = '';
  try {
    while (Date.now() < deadline) {
      try {
        const res = await api.get('health', { timeout: POLL_MS * 5 });
        if (res.ok()) {
          const body = (await res.json()) as { db?: string };
          if (body.db === 'up') return;
          lastError = `db is ${body.db}`;
        } else {
          lastError = `HTTP ${res.status()}`;
        }
      } catch (e) {
        lastError = (e as Error).message;
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    throw new Error(`API at ${env.apiURL} is not ready after ${TIMEOUT_MS} ms: ${lastError}`);
  } finally {
    await api.dispose();
  }
}
