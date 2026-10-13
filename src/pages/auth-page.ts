import { expect, type Locator, type Page } from '@playwright/test';
import type { Credentials } from '../api/client';

export type AuthMode = 'login' | 'register';

/** Sign-in and sign-up, `/login` and `/register` (one component, `auth[data-key=mode]`). */
export class AuthPage {
  readonly name: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly remember: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(readonly page: Page) {
    this.name = page.getByTestId('auth-name');
    this.email = page.getByTestId('auth-email');
    this.password = page.getByTestId('auth-password');
    this.remember = page.getByTestId('auth-remember');
    this.submit = page.getByTestId('auth-submit');
    this.error = page.getByTestId('auth-error');
  }

  async goto(mode: AuthMode): Promise<void> {
    await this.page.goto(mode);
    await expect(this.page.locator(`[data-testid="auth"][data-key="${mode}"]`)).toBeVisible();
  }

  async login({ email, password }: Credentials): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  async register({ email, password }: Credentials, displayName?: string): Promise<void> {
    if (displayName !== undefined) await this.name.fill(displayName);
    await this.login({ email, password });
  }

  /** The error box carries the API error code in `data-key` (e.g. `invalid_credentials`). */
  async expectError(code: string): Promise<void> {
    await expect(this.error).toHaveAttribute('data-key', code);
    await expect(this.email).toHaveAttribute('aria-invalid', 'true');
  }
}
