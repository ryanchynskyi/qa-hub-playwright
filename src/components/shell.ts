import { expect, type Locator, type Page } from '@playwright/test';
import type { Lang } from '../api/schemas';
import type { Device } from '../fixtures';
import { readGuest } from '../helpers/guest-storage';
import { byTestId, numberValue } from '../helpers/locators';

/** Main links are on every layout (the phone tab bar); the rest live in the "Ще" sheet on phones. */
const MAIN_LINKS = ['dash', 'quiz', 'courses', 'kb'] as const;
/** The narrow rail (901–1279px, tablet) folds these into its "Ще" popover (`rail-pop`). */
const RAIL_MORE: readonly string[] = ['whats-new', 'tutorial', 'bug', 'feedback', 'admin'];
export type NavTarget =
  | (typeof MAIN_LINKS)[number]
  | 'recall'
  | 'leaderboard'
  | 'tutorial'
  | 'profile'
  | 'bug'
  | 'feedback';

/**
 * The app shell around every page: navigation, level/XP, language switch, account row.
 *
 * It hides the layout differences (docs/brief.md §10) so tests read the same on every project:
 * desktop/tablet have a rail, phones a bottom tab bar plus the More sheet. A test says
 * `shell.open('leaderboard')`, and the component knows to open the sheet first on a phone (or the
 * narrow rail's popover on a tablet).
 */
export class Shell {
  readonly sidebar: Locator;
  readonly tabbar: Locator;
  readonly breadcrumb: Locator;
  readonly moreButton: Locator;
  readonly moreSheet: Locator;
  readonly accountGuest: Locator;
  readonly account: Locator;
  /** The top-bar streak pill: `data-value` = the streak as the client computes it (rest days count). */
  readonly streak: Locator;

  constructor(
    readonly page: Page,
    readonly device: Device,
  ) {
    this.sidebar = page.getByTestId('sidebar');
    this.tabbar = page.getByTestId('tabbar');
    this.breadcrumb = page.getByTestId('breadcrumb');
    this.moreButton = page.getByTestId('nav-more');
    this.moreSheet = page.getByTestId('more-sheet');
    this.accountGuest = page.getByTestId('account-guest');
    this.account = page.getByTestId('account');
    this.streak = page.getByTestId('streak');
  }

  get isPhone(): boolean {
    return this.device === 'phone';
  }

  link(target: NavTarget | 'logout'): Locator {
    return this.page.getByTestId(`nav-${target}`);
  }

  async open(target: NavTarget): Promise<void> {
    if (this.isPhone && !(MAIN_LINKS as readonly string[]).includes(target)) {
      await this.openMoreSheet();
    }
    if (this.device === 'tablet' && RAIL_MORE.includes(target)) {
      await this.page.getByTestId('nav-rail-more').click();
      await expect(this.page.getByTestId('rail-pop')).toBeVisible();
    }
    await this.link(target).click();
  }

  /** Active link: `aria-current="page"`. On phones only main links are on screen without the sheet. */
  async expectActive(target: NavTarget): Promise<void> {
    await expect(this.link(target)).toHaveAttribute('aria-current', 'page');
  }

  async openMoreSheet(): Promise<void> {
    await this.moreButton.click();
    await expect(this.moreSheet).toBeVisible();
  }

  /**
   * Total XP: `xp-total` (data-value is readable while its tooltip is hidden) for an account; guests
   * have no XP in the top bar, so theirs comes from the guest store. Read it inside `expect.poll`
   * right after a sign-in: until the account renders, the guest branch answers.
   */
  async totalXp(): Promise<number> {
    const xp = this.page.getByTestId('xp-total');
    if ((await xp.count()) > 0) return numberValue(xp);
    return (await readGuest(this.page))?.stats?.totalXp ?? 0;
  }

  /** Switches the UI language with the UA/EN buttons (in the More sheet on phones). */
  async switchLanguage(lang: Lang): Promise<void> {
    if (this.isPhone) await this.openMoreSheet();
    await byTestId(this.page.getByTestId('lang-switch-topbar'), 'lang-option', lang).click();
    await this.expectLanguage(lang);
  }

  /** The app sets `<html lang>` on every language change. */
  async expectLanguage(lang: Lang): Promise<void> {
    await expect(this.page.locator('html')).toHaveAttribute('lang', lang);
  }

  /**
   * Layout rules per viewport (docs/brief.md §10). The branching lives here, not in the test:
   * a spec states "the layout matches the device" and runs unchanged on every project.
   */
  async expectLayout(): Promise<void> {
    switch (this.device) {
      case 'desktop':
        await expect(this.sidebar).toBeVisible();
        await expect(this.breadcrumb).toBeVisible();
        await expect(this.tabbar).toHaveCount(0);
        break;
      case 'tablet': {
        // Narrow rail: numbers instead of labels, so its links are named by aria-label.
        await expect(this.sidebar).toHaveAttribute('data-mode', 'narrow');
        const box = await this.sidebar.boundingBox();
        expect(box?.width, 'narrow rail width').toBeLessThanOrEqual(72);
        await expect(this.link('quiz')).toHaveAttribute('aria-label', /\S/);
        break;
      }
      case 'phone':
        await expect(this.sidebar).toHaveCount(0);
        await expect(this.tabbar).toBeVisible();
        await expect(this.moreButton).toBeVisible();
        break;
    }
  }

  async expectSignedIn(email: string): Promise<void> {
    if (this.isPhone) await this.openMoreSheet();
    await expect(this.account).toContainText(email);
    if (this.isPhone) await this.page.keyboard.press('Escape');
  }

  /**
   * Signs out and waits for the guest line: logout finishes asynchronously (brief §13). The line
   * is visually hidden (`sr-only`), so it is attached, never visible.
   */
  async logout(): Promise<void> {
    if (this.isPhone) await this.openMoreSheet();
    await this.link('logout').click();
    await expect(this.accountGuest).toBeAttached();
  }
}
