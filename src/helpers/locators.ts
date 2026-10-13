import type { Locator, Page } from '@playwright/test';

/**
 * Locator by test id, optionally narrowed by `data-key`.
 *
 * Repeated items share one test id and carry their identity in `data-key` (section id, question
 * id, option index, language...): `byTestId(page, 'quiz-section', 'sql')`. Visible text is never
 * used: the UI is bilingual (docs/brief.md §5).
 */
export function byTestId(scope: Page | Locator, id: string, key?: string | number): Locator {
  if (key === undefined) return scope.getByTestId(id);
  return scope.locator(`[data-testid="${id}"][data-key="${key}"]`);
}

/**
 * Reads a number from a data attribute (`data-value` by default, or `data-total`). The app puts
 * raw numbers there so tests never parse localised text like "усього 42 XP".
 */
export async function numberValue(
  locator: Locator,
  attribute: 'data-value' | 'data-total' = 'data-value',
): Promise<number> {
  const raw = await locator.getAttribute(attribute);
  const value = Number(raw);
  if (raw === null || raw === '' || Number.isNaN(value)) {
    throw new Error(`${attribute} of ${locator.toString()} is not a number: ${raw}`);
  }
  return value;
}
