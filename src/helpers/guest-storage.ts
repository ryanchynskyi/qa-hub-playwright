import type { Page } from '@playwright/test';
import type { CardState } from '../api/schemas';

/** Keys of the app's guest store ($APP_DIR apps/web/src/progress/guest-store.ts). */
const GUEST_KEY = 'qa-hub-guest-v1';
/** Where the app keeps the guest state it has just moved into an account. */
const BACKUP_KEY = 'qa-hub-guest-v1.imported';

/** Only the parts tests read; the store is app-internal JSON, never written by hand. */
export interface GuestState {
  questions: Record<string, unknown>;
  cards: Record<string, CardState>;
}

const read = (page: Page, key: string): Promise<GuestState | null> =>
  page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    return raw === null ? null : (JSON.parse(raw) as GuestState);
  }, key);

export const readGuest = (page: Page) => read(page, GUEST_KEY);
export const readGuestBackup = (page: Page) => read(page, BACKUP_KEY);

/** Puts the moved guest state back, as if it came from another device; the caller reloads. */
export async function restoreGuestFromBackup(page: Page): Promise<void> {
  await page.evaluate(
    ([guest, backup]) => {
      const saved = localStorage.getItem(backup);
      if (saved === null) throw new Error(`no ${backup} in localStorage`);
      localStorage.setItem(guest, saved);
    },
    [GUEST_KEY, BACKUP_KEY] as const,
  );
}
