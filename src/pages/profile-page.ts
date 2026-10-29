import { expect, type Locator, type Page } from '@playwright/test';
import { byTestId } from '../helpers/locators';

export type SignInMethod = 'password' | 'google';

/** `/profile`: stats card, account settings (password, sign-in methods) and account deletion. */
export class ProfilePage {
  readonly card: Locator;
  readonly register: Locator;
  readonly currentPassword: Locator;
  readonly newPassword: Locator;
  readonly savePassword: Locator;
  readonly passwordMessage: Locator;
  readonly deleteConfirm: Locator;
  readonly deleteButton: Locator;

  constructor(readonly page: Page) {
    this.card = page.getByTestId('profile');
    this.register = page.getByTestId('profile-register');
    this.currentPassword = page.getByTestId('profile-password-current');
    this.newPassword = page.getByTestId('profile-password-new');
    this.savePassword = page.getByTestId('profile-password-save');
    this.passwordMessage = page.getByTestId('profile-password-message');
    this.deleteConfirm = page.getByTestId('profile-delete-confirm');
    this.deleteButton = page.getByTestId('profile-delete');
  }

  /** `data-state` on the method row is `on|off`. */
  method(key: SignInMethod): Locator {
    return byTestId(this.page, 'profile-method', key);
  }

  async goto(): Promise<void> {
    await this.page.goto('profile');
    await expect(this.card).toBeVisible();
  }

  async changePassword(next: string, current: string): Promise<void> {
    await this.currentPassword.fill(current);
    await this.newPassword.fill(next);
    await this.savePassword.click();
  }

  async deleteAccount(email: string): Promise<void> {
    await this.deleteConfirm.fill(email);
    await this.deleteButton.click();
  }
}
