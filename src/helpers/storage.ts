import type { Page } from '@playwright/test';

/** Raw localStorage value (null if absent); keys: $APP_DIR/docs/test-ids.md. */
export const readStorage = (page: Page, key: string): Promise<string | null> =>
  page.evaluate((k) => localStorage.getItem(k), key);
