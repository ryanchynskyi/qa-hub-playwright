import { randomUUID } from 'node:crypto';

/** Test accounts use the reserved .test TLD and a random part, so parallel tests never collide. */
export function uniqueEmail(prefix = 'pw'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@example.test`;
}

export const DEFAULT_PASSWORD = 'correct-horse-battery';

/** Cyrillic block: English pages must not contain it (docs/brief.md §11). */
export const CYRILLIC = /[Ѐ-ӿ]/;
