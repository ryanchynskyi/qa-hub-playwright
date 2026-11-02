import type { ApiClient } from '../api/client';
import type { Catalog } from '../api/schemas';

/**
 * Gives an account a place on the board (it lists users with XP only). Only the first correct
 * answer of a question earns XP, so more XP takes more distinct questions.
 */
export async function earnXp(
  api: ApiClient,
  token: string,
  catalog: Catalog,
  questions = 1,
): Promise<void> {
  for (const { id } of catalog.questions.slice(0, questions)) {
    await api.checkAnswer(id, await api.correctIndex(id), token);
  }
}
