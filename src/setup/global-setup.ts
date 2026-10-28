import { request } from '@playwright/test';
import { env } from '../config/env';

const TIMEOUT_MS = 30_000;
const POLL_MS = 2_000;

/**
 * Waits until the API answers /health with a live database, so a down API or database fails the
 * run once, with the reason, instead of failing every test. Prod runs on a Render plan without
 * sleep (REQ-NFR-09), so no cold-start allowance is needed.
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
