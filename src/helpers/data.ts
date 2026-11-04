import { randomUUID } from 'node:crypto';

/** Test accounts use the reserved .test TLD and a random part, so parallel tests never collide. */
export function uniqueEmail(prefix = 'pw'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@example.test`;
}

export const DEFAULT_PASSWORD = 'correct-horse-battery';

/** The e2e API treats this Google-verified address as the owner ($APP_DIR/apps/api/scripts/e2e-server.ts). */
export const ADMIN_EMAIL = 'admin@example.test';

/** A marker for the row a test creates: admin lists are shared with parallel tests. */
export function uniqueText(prefix = 'pw'): string {
  return `${prefix}-${randomUUID()}`;
}

/** A valid 2x2 PNG. */
export const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP4z8DAAMIM////ZwAAHu8E/KPItPcAAAAASUVORK5CYII=';

/** A file for `setInputFiles`; the app reads `mimeType`, never the name. */
export const pngFile = (name = 'shot.png', mimeType = 'image/png') => ({
  name,
  mimeType,
  buffer: Buffer.from(PNG_BASE64, 'base64'),
});

/** Plain text: `mimeType` decides if the dialog takes it, the bytes if the browser can decode it. */
export const textFile = (name = 'note.txt', mimeType = 'text/plain') => ({
  name,
  mimeType,
  buffer: Buffer.from('not an image'),
});

/** The UI renders inline code without its backticks; API texts are markdown. */
// shortcut: inline code only (45 options carry `**` globs, not bold), use a markdown parser if bold or links appear in options
export const stripInlineCode = (markdown: string): string => markdown.replaceAll('`', '');

/** Cyrillic block: English pages must not contain it (docs/brief.md §11). */
export const CYRILLIC = /[Ѐ-ӿ]/;
