import { randomUUID } from 'node:crypto';

/** Test accounts use the reserved .test TLD and a random part, so parallel tests never collide. */
export function uniqueEmail(prefix = 'pw'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@example.test`;
}

export const DEFAULT_PASSWORD = 'correct-horse-battery';

/** The e2e API treats this Google-verified address as the owner ($APP_DIR/apps/api/scripts/e2e-server.ts). */
export const ADMIN_EMAIL = 'admin@example.test';

/** The UI renders inline code without its backticks; API texts are markdown. */
// shortcut: inline code only (45 options carry `**` globs, not bold), use a markdown parser if bold or links appear in options
export const stripInlineCode = (markdown: string): string => markdown.replaceAll('`', '');

/** Cyrillic block: English pages must not contain it (docs/brief.md §11). */
export const CYRILLIC = /[Ѐ-ӿ]/;
