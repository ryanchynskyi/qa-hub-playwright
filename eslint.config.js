import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    'node_modules/',
    'test-results/',
    'playwright-report/',
    'blob-report/',
    '.stack/',
  ]),

  js.configs.recommended,

  // Type-aware rules: no-floating-promises, no-misused-promises, await-thenable and friends need
  // the TS program, so a forgotten `await` is caught before the test ever runs.
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Plain JS (this file, scripts/stack.mjs) is outside tsconfig: lint it without type info.
  {
    files: ['**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  // k6 scripts run in k6's own JS runtime, not Node: its globals instead of Node's.
  {
    files: ['perf/**/*.js'],
    languageOptions: { globals: { __ENV: 'readonly', __VU: 'readonly', __ITER: 'readonly' } },
  },

  // Playwright rules only where tests live: page objects and fixtures legitimately call expect
  // outside a test body, which no-standalone-expect would flag.
  {
    files: ['tests/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      // Recommended has these as warnings; they are the flakiness classics, so make them errors.
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-wait-for-selector': 'error',
      'playwright/no-element-handle': 'error',
      'playwright/no-page-pause': 'error',
      'playwright/no-force-option': 'error',
      // Locators come from test ids (docs/brief.md §5), not CSS/XPath strings. Anything else
      // (data-key, data-state, <html>) is built in src/ by page objects and helpers.
      'playwright/no-raw-locators': 'error',
      // Page-object methods named expect*() (shell.expectSignedIn) count as assertions.
      'playwright/expect-expect': ['error', { assertFunctionPatterns: ['^expect[A-Z]'] }],
      // `test.skip(condition, reason)` is a documented decision; a bare skip still fails lint.
      'playwright/no-skipped-test': ['error', { allowConditional: true }],
    },
  },

  // Last: turn off every stylistic rule that would fight Prettier.
  prettier,
);
