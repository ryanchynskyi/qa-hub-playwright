// spec: specs/phase2-import.md
// seed: tests/seed.spec.ts
import { expect, test } from '../../src/fixtures';
import {
  readGuest,
  readGuestBackup,
  restoreGuestFromBackup,
} from '../../src/helpers/guest-storage';

type Fixtures = Pick<
  Parameters<Parameters<typeof test>[2]>[0],
  'api' | 'catalog' | 'quiz' | 'auth' | 'shell' | 'newCredentials'
>;

/** Answers as a guest (`true` = correct), then signs up in the same browser; returns the ids. */
async function guestThenSignUp(
  { api, catalog, quiz, auth, shell, newCredentials }: Fixtures,
  correct: boolean[],
): Promise<string[]> {
  const section = catalog.sections.find((s) => s.questionCount >= correct.length);
  expect(section, `a section with ${correct.length}+ questions`).toBeDefined();
  await quiz.goto(section!.id);
  await quiz.startRun();
  const ids = await quiz.answerSeries(api, correct);
  await auth.goto('register');
  await auth.register(newCredentials);
  await shell.expectSignedIn(newCredentials.email);
  return ids;
}

// Texts are asserted only where the plan requires a wording; `lang` is pinned to uk by the fixture.
test.describe('Import of guest progress (UI)', () => {
  test(
    'Banner after sign-up offers the guest progress with its counts',
    { tag: ['@REQ-PROG-12'] },
    async ({ page, api, catalog, quiz, auth, shell, importBanner, newCredentials }) => {
      const f = { page, api, catalog, quiz, auth, shell, importBanner, newCredentials };
      // 1. As a fresh guest answer 2 questions (1 correct, 1 wrong)
      // 2. Sign up with newCredentials in the same browser
      await guestThenSignUp(f, [true, false]);

      // 3. The banner names the guest source and counts 2 answers and 0 cards (numbers only: #90)
      await expect(importBanner.banner).toContainText('гостьовий режим');
      await expect(importBanner.banner).toHaveText(/\(2\D+, 0\D+\)/);
      await expect(importBanner.move).toBeEnabled();
      await expect(importBanner.later).toBeEnabled();
      await expect(importBanner.never).toBeEnabled();
    },
  );

  test(
    'Move imports the guest progress, XP is server-recomputed, backup is kept',
    { tag: ['@REQ-PROG-13'] },
    async ({ page, api, catalog, quiz, auth, shell, importBanner, newCredentials }) => {
      const f = { page, api, catalog, quiz, auth, shell, importBanner, newCredentials };
      // 1. As a guest answer 2 questions correctly, then sign up
      const ids = await guestThenSignUp(f, [true, true]);

      // 2. Move: the outcome shows +X XP and the banner goes
      await importBanner.move.click();
      const xp = await importBanner.movedXp();
      expect(xp).toBeGreaterThan(0);
      await expect(importBanner.banner).toBeHidden();

      // 3. Reload: once the account XP is shown, no banner; UI and API both hold X and the answers
      await page.reload();
      await expect.poll(() => shell.totalXp()).toBe(xp);
      await expect(importBanner.banner).toHaveCount(0);
      await expect(importBanner.done).toHaveCount(0);
      const { accessToken } = await api.login(newCredentials);
      const progress = await api.progress(accessToken);
      expect(progress.stats.totalXp).toBe(xp);
      expect(Object.keys(progress.questions)).toEqual(expect.arrayContaining(ids));

      // 4. localStorage: the backup holds both answers, the guest store is emptied (key kept)
      const backup = await readGuestBackup(page);
      expect(Object.keys(backup!.questions)).toEqual(expect.arrayContaining(ids));
      const guest = await readGuest(page);
      expect(guest!.questions).toEqual({});
      expect(guest!.cards).toEqual({});
    },
  );

  test(
    'Importing the same data again reports Nothing new and adds no XP',
    { tag: ['@REQ-PROG-14'] },
    async ({ page, api, catalog, quiz, auth, shell, importBanner, newCredentials }) => {
      const f = { page, api, catalog, quiz, auth, shell, importBanner, newCredentials };
      // 1. As a guest answer 1 question correctly, sign up and move it
      await guestThenSignUp(f, [true]);
      await importBanner.move.click();
      const xp = await importBanner.movedXp();
      expect(xp).toBeGreaterThan(0);
      await expect.poll(() => shell.totalXp()).toBe(xp);

      // 2. Put the moved data back into the guest store (as from another device) and reload
      await restoreGuestFromBackup(page);
      await page.reload();
      await expect(importBanner.banner).toHaveText(/\(1\D+, 0\D+\)/);

      // 3. Move again: "nothing new", no "+n XP"; after a reload UI and API XP are unchanged
      await importBanner.move.click();
      await expect(importBanner.doneMessage).toContainText('Нового нічого');
      await expect(importBanner.doneMessage).not.toHaveText(/\+\d+ XP/);
      await page.reload();
      await expect.poll(() => shell.totalXp()).toBe(xp);
      const { accessToken } = await api.login(newCredentials);
      expect((await api.progress(accessToken)).stats.totalXp).toBe(xp);
    },
  );
});
