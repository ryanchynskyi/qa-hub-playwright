import { expect, type Locator, type Page } from '@playwright/test';
import type { Lang } from '../api/schemas';
import type { Device } from '../fixtures';
import { byTestId, numberValue } from '../helpers/locators';

/** Main links are on every layout; the rest live in the "Ще" (More) sheet on phones. */
const MAIN_LINKS = ['dash', 'quiz', 'recall', 'kb'] as const;
export type NavTarget =
  (typeof MAIN_LINKS)[number] | 'leaderboard' | 'chat' | 'tutorial' | 'profile';

/**
 * The app shell around every page: navigation, level/XP, language switch, account row.
 *
 * It hides the layout differences (docs/brief.md §10) so tests read the same on every project:
 * desktop/tablet have a sidebar, phones a bottom tab bar plus the More sheet. A test says
 * `shell.open('chat')`, and the component knows to open the sheet first on a phone.
 */
export class Shell {
  readonly sidebar: Locator;
  readonly tabbar: Locator;
  readonly breadcrumb: Locator;
  readonly moreButton: Locator;
  readonly moreSheet: Locator;
  readonly accountGuest: Locator;
  readonly account: Locator;

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
    await this.link(target).click();
  }

  /** Active main link: `aria-current="page"` (only main links are visible on every layout). */
  async expectActive(target: (typeof MAIN_LINKS)[number]): Promise<void> {
    await expect(this.link(target)).toHaveAttribute('aria-current', 'page');
  }

  async openMoreSheet(): Promise<void> {
    await this.moreButton.click();
    await expect(this.moreSheet).toBeVisible();
  }

  /** Total XP from `xp-total`; its data-value is readable even while the tooltip is hidden. */
  totalXp(): Promise<number> {
    return numberValue(this.page.getByTestId('xp-total'));
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
        // Icon rail: a narrow sidebar whose links are named by aria-label instead of text.
        await expect(this.sidebar).toBeVisible();
        const box = await this.sidebar.boundingBox();
        expect(box?.width, 'icon rail width').toBeLessThanOrEqual(64);
        await expect(this.link('quiz')).toHaveAttribute('aria-label', /\w+/);
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

  /** Signs out and waits for the guest row: logout finishes asynchronously (brief §13). */
  async logout(): Promise<void> {
    if (this.isPhone) await this.openMoreSheet();
    await this.link('logout').click();
    await expect(this.accountGuest).toBeVisible();
  }
}
