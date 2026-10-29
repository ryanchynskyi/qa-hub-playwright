# Phase 2: Account block (AUTH-06, 08, 09, 11, 16, 18)

## Application Overview

Remember me, logout, Google sign-in (fake provider on the e2e server), Google flow security, password change and account deletion in QA Interview Hub (http://localhost:4273, uk UI, path routes). Explored live with seed tests/seed.spec.ts, project desktop. Every scenario starts from a blank browser (returning visitor preset by the context fixture: no focus wizard, no tour) and a fresh account; scenarios are independent. Test ids come from test-ids.md only. Already covered and NOT re-planned: tests/api/sessions.spec.ts (rotation, family revocation after the 30 s grace, password change ends other sessions and retires the old password), tests/api/auth.spec.ts (registration, login, httpOnly cookie, deleted account cannot log in), tests/e2e/auth.spec.ts (sign up, wrong password, sign in/out through the UI, reload keeps the session, profile opens, ?next=).

## Prerequisites

1. `ProfilePage` page object (src/pages/profile-page.ts, fixture `profile`): locators `profile` (data-state user|guest), `profile-method` by key (byTestId helper), `profile-password-current/new/save/message`, `profile-delete-confirm`, `profile-delete`, `profile-register`; goto('profile'). None exists today.
2. `FakeGoogle` helper (page-object style, src/pages/fake-google-page.ts): the consent page /api/__e2e/google?state=... is outside the app, has NO test ids; its snapshot is: textbox "Email", textbox "Name", button "Continue", button "Cancel". Use getByRole/getByLabel there with `submit(email, name?)` and `cancel()`. This is the only place role locators are allowed; a test-id for the fake page would be an app-side decision for the user.
3. `AuthPage.google` locator (`google-signin`). Errors from the Google return (google_state, google_cancelled) use the existing `expectError(code)`: checked live, the app sets aria-invalid on the email field for them too.
4. `Shell.logout()` exists; add `Shell.expectGuest()` (account-guest visible, account count 0) or reuse accountGuest.
5. `ApiClient` methods missing: `logout(refreshToken|cookie)`, `refresh(refreshToken)`, `googleExchange({code, nonce, remember})`. Move `googleLogin` from src/fixtures/index.ts into a shared helper (e.g. src/helpers/google.ts) split into `googleStart(request, email, nonceHash)` returning the code and `googleExchange`, so API tests can pass a wrong nonce. Never use page.request inside a step.
6. A Google cleanup: the `user`/`newCredentials` fixtures delete through a password login, which fails for a Google-only account (login 401 is treated as already gone, so the account leaks). Add a fixture (e.g. `googleAccount`) that creates a unique email, logs in through the fake Google and deletes via DELETE /me with the live session token in teardown, or delete via UI in the test itself.
7. A helper `restartBrowser(context)` (src/helpers) for AUTH-06: it returns a new browser context built from `context.storageState()` with every cookie whose `expires === -1` removed, plus the same preset as `prepareContext` (see `secondPage` in src/fixtures/index.ts: baseURL, locale uk-UA, timezoneId Europe/Kyiv). prepareContext is not exported yet: export it.

## Ambiguities (app vs requirement)

1. Checklist ids in the brief do not match $APP_DIR/docs/regression-checklist.md: there AUTH-007 is logout (UI), AUTH-008/009 are remember me on/off, AUTH-014 is Google sign-in (not "logout ends the session family"), AUTH-020 is the google_state tab check, PROF-007 password change, PROF-012 delete. The checklist has no UI check for "logout ends the family"; that is only proven by the API (see API tests). Tags use COVERAGE.md ids (AUTH-06...), checklist ids are cited per scenario only as a hint.
2. "Password reset for an unverified account" (AUTH-09): the app has NO forgot/reset-password page, link or endpoint (login page: only Google, email, password, remember, submit, switch link). What exists is the pre-hijacking protection: a Google sign-in with the email of a password account that is not verified revokes its refresh tokens and clears its password (google.ts userForGoogle). Observed live: after it, /profile shows password=off, google=on and "Add password" (no current-password field). Planned as that behaviour (3.2, 7.2). User decision (2026-10-28): the owner will add a password-reset feature; its test is planned then, not in this block.
3. Delete-button gating: checklist PROF-012 says "typed exactly"; the live app compares case-insensitively (PW-EXPLORE-2@EXAMPLE.COM enabled the button for pw-explore-2@example.com; one missing char kept it disabled). User decision (2026-10-28): intended, emails are case-insensitive everywhere (AUTH-004); the scenario asserts it.
4. Delete has no confirmation dialog and no toast; the app redirects to /dash as a guest and removes `qa-hub-rt`.
5. Remember me: the requirement says the refresh token is persisted in `qa-hub-rt`. Live: with the box ticked `qa-hub-rt` holds a 43-char token and the cookie qa_rt is persistent; unticked: `qa-hub-rt` is null. I could NOT read cookie attributes in the MCP browser (httpOnly, Set-Cookie not shown by the tools), so "cookie is a session cookie (expires -1)" and "persistent cookie" are taken from the brief (cypress-framework-brief section 7) and must be confirmed by the generator with context.cookies(). Also, with the cookie persistent the restart is survivable even without `qa-hub-rt`; the localStorage fallback applies only when the cookie is missing (checklist AUTH-008 "survives cleared cookies"). Clearing cookies in the MCP browser was not possible, so that fallback was not verified live. A test for it: context.clearCookies() then reload, expect signed in.
6. Browser restart model: Playwright's storageState includes session cookies (expires -1), so a plain new context from storageState would wrongly keep an unticked-remember session. The restart is therefore modelled by filtering expires === -1 cookies (Prerequisite 7). sessionStorage is dropped by a new context too, as in a real restart.
7. Google in the live UI WORKS: `google-signin` is visible on /login (also on /register), clicking it stores `qa-hub-google-nonce` in sessionStorage, redirects to the fake consent page, Continue lands on /dash signed in with `qa-hub-rt` set; Cancel gives /login?error=google_cancelled. The Google link href carries tz=Europe/Kiev (the account time zone option list also shows Europe/Kiev as selected, not Europe/Kyiv).
8. Observed once: a Google flow left waiting about 30 minutes on the fake consent page ended on /login?error=google_state after Continue (state/code expired or the nonce was lost). The TTL is not documented; kept out of the plan (Ideas).
9. The "other tab" requirement (AUTH-11): in the live app an opener tab copies sessionStorage into window.open tabs, so only a context.newPage() or a direct URL navigation models "a tab that did not start the flow".
10. Password change: the current session is kept, `qa-hub-rt` is unchanged in the changing tab (observed), the other sessions end; the wrong current password message is "Поточний пароль невірний." (state=error).

## Fixtures per scenario

Remember on/off: `user`, `auth`, helper restartBrowser. Logout: `user`, `authedPage`, `api`, `catalog`, `shell`. Google sign-in: `auth`, `googleAccount` (Prerequisite 6). Google on a password account: `user`, `auth`. Google security: `auth`, `user`, context.newPage(). Password change: `user`, `authedPage`, `secondPage`, `api`. Delete: `user`, `authedPage`, `api`. Accounts are created only through fixtures (API registration), never through the registration form, since sign up through the UI is already covered in tests/e2e/auth.spec.ts.

## Test Scenarios

### 1. AUTH-06 Remember me

**Seed:** `tests/seed.spec.ts`

#### 1.1. Remember me on (default): the session survives a browser restart

**File:** `tests/e2e/auth-remember.spec.ts`

**Steps:**

1. Fixtures: user, auth. Tag @REQ-AUTH-06 (checklist AUTH-008). Open /login; check `auth-remember` data-state=on; sign in as `user` with AuthPage.login. - expect: `auth-remember` has data-state=on before submit - expect: Lands on /dash, `account` contains user.email - expect: localStorage `qa-hub-rt` matches /^[\w-]{43}$/
2. Read context.cookies(). - expect: Cookie `qa_rt` is httpOnly and has expires > now (persistent), not -1 (confirm, see Ambiguity 5)
3. Restart: restartBrowser(context) (cookies with expires -1 dropped, localStorage kept). Open /dash in the new context. - expect: `account` contains user.email; no `account-guest`
4. Reload the new page, open /profile. - expect: Still signed in (the rotated token was persisted) - expect: `profile` data-state=user

#### 1.2. Remember me off: nothing is persisted and the session ends after a restart

**File:** `tests/e2e/auth-remember.spec.ts`

**Steps:**

1. Fixtures: user, auth. Tag @REQ-AUTH-06 (checklist AUTH-009). Open /login, untick `auth-remember` (data-state=off), sign in as `user`. - expect: Lands on /dash, `account` contains user.email
2. Read localStorage `qa-hub-rt` and context.cookies(). - expect: `qa-hub-rt` is null - expect: Cookie `qa_rt` has expires === -1 (session cookie)
3. Restart: restartBrowser(context). Open /dash. - expect: `account-guest` visible, `account` absent: the session did not survive

### 2. AUTH-08 Logout

**Seed:** `tests/seed.spec.ts`

#### 2.1. Logout returns to an empty guest and stays signed out after reload

**File:** `tests/e2e/auth-logout.spec.ts`

**Steps:**

1. Fixtures: user, authedPage, api, catalog, shell. Tag @REQ-AUTH-08 (checklist AUTH-007). Give the account progress through the ApiClient before the page loads the data: pick a section and question ids from `catalog`/`api.questions`, call api.finishQuiz(user.token, sectionId, ids); reload /dash. - expect: Signed in as user.email, shell.totalXp() > 0
2. shell.logout() (`nav-logout`; More sheet on phones). - expect: `account-guest` visible, `account` absent - expect: shell.totalXp() === 0
3. Open /profile, then reload. - expect: `profile` data-state=guest, `profile-register` visible - expect: After reload still guest with XP 0; no import banner offering the account's progress
4. Read localStorage. - expect: `qa-hub-rt` absent

### 3. AUTH-09 Google sign-in and unverified account

**Seed:** `tests/seed.spec.ts`

#### 3.1. Google sign-in through the fake provider creates an account and keeps the session on reload

**File:** `tests/e2e/auth-google.spec.ts`

**Steps:**

1. Fixtures: auth, googleAccount (unique email + Google cleanup). Tag @REQ-AUTH-09 (checklist AUTH-014). Open /login, click `google-signin`. - expect: URL is /api/__e2e/google?state=..., title "Fake Google" - expect: sessionStorage `qa-hub-google-nonce` is set (not asserted in the spec: an implementation detail; 4.2 and API 7.3 prove the nonce is required)
2. FakeGoogle.submit(email, 'PW Google') (Email, Name, Continue). - expect: Lands on /dash; `account` contains the email
3. Reload, open /profile. - expect: Still signed in - expect: `profile-method` key=google data-state=on, key=password data-state=off - expect: `profile-password-current` absent (the card is "Додати пароль")

#### 3.2. Google sign-in with the email of an unverified password account clears its password

**File:** `tests/e2e/auth-google.spec.ts`

**Steps:**

1. Fixtures: user (password account), auth. Tag @REQ-AUTH-09 (checklist AUTH-020 in the brief; see Ambiguity 2). Open /login, click `google-signin`, FakeGoogle.submit(user.email). - expect: Lands on /dash signed in as user.email (the same account)
2. Open /profile. - expect: `profile-method` password=off, google=on - expect: No `profile-password-current`
3. shell.logout(), open /login, sign in with user.email and user.password. - expect: `auth-error` data-key=invalid_credentials: the old password no longer works

### 4. AUTH-11 Google flow security

**Seed:** `tests/seed.spec.ts`

#### 4.1. A Google return link opened in a tab that did not start the flow is not redeemed

**File:** `tests/e2e/auth-google-security.spec.ts`

**Steps:**

1. Fresh guest `page`. Tag @REQ-AUTH-11 (checklist AUTH-020). Navigate to /auth/google?code=abc123 (no `qa-hub-google-nonce` in this tab). - expect: URL matches /\/login\?error=google_state/
2. Read the error and the shell. - expect: `auth-error` data-key=google_state, text "Сесія входу через Google застаріла. Спробуй ще раз." (AuthPage.expectError, no aria-invalid) - expect: `account-guest` visible

#### 4.2. Completing the Google flow in another tab fails and the starting tab stays a guest

**File:** `tests/e2e/auth-google-security.spec.ts`

**Steps:**

1. Fixture: user, auth. Tag @REQ-AUTH-11. In tab A (`page`) open /login, click `google-signin`, wait for the fake page, copy its URL (state=...). - expect: Tab A is on /api/__e2e/google?state=...
2. Tab B = context.newPage() (same cookies, empty sessionStorage): go to the copied URL, FakeGoogle.submit(user.email). - expect: Tab B ends on /login?error=google_state, `auth-error` data-key=google_state, `account-guest` visible
3. ~~api.login(user) with the ORIGINAL password. - expect: 200~~ Dropped (user decision, step 9.5): the callback links an existing unverified account and drops its password before the nonce is checked (AUTH-09 by design), so this check cannot pass. The spec uses a new `googleEmail` in tab B instead of user.email.

### 5. AUTH-16 Change password in the profile

**Seed:** `tests/seed.spec.ts`

#### 5.1. Changing the password in the profile signs out the other session and keeps this one

**File:** `tests/e2e/profile-password.spec.ts`

**Steps:**

1. Fixtures: user, authedPage (session 1), secondPage (session 2; open /dash and expect `account`), profile. Tag @REQ-AUTH-16 (checklist PROF-007). In session 1 open /profile, fill `profile-password-current` with user.password, `profile-password-new` with a new password from helpers/data, click `profile-password-save`. - expect: `profile-password-message` data-state=ok, text "Пароль збережено. Інші пристрої вийшли з акаунта." - expect: Both inputs are cleared
2. Session 1: reload /profile. - expect: `account` still contains the email
3. Session 2: reload /dash. - expect: `account-guest` visible: the other session ended
4. api.login with the new password, then with the old one. - expect: New: 200; old: 401 invalid_credentials

### 6. AUTH-18 Delete account in the profile

**Seed:** `tests/seed.spec.ts`

#### 6.1. The delete button is enabled only after the account email is typed

**File:** `tests/e2e/profile-delete.spec.ts`

**Steps:**

1. Fixtures: user, authedPage, profile. Tag @REQ-AUTH-18 (checklist PROF-012). Open /profile. - expect: `profile-delete-confirm` empty, `profile-delete` disabled
2. Type another email, then user.email minus the last character. - expect: `profile-delete` stays disabled
3. Replace the text with user.email. - expect: `profile-delete` enabled
4. Clear the field. - expect: `profile-delete` disabled again; api.login still 200 (nothing was deleted)

#### 6.2. Deleting the account in the profile signs out and frees the email

**File:** `tests/e2e/profile-delete.spec.ts`

**Steps:**

1. Fixtures: user, authedPage, api, profile. Tag @REQ-AUTH-18. On /profile type user.email into `profile-delete-confirm`, click `profile-delete` (no confirm dialog). - expect: Lands on /dash as a guest: `account-guest` visible, `qa-hub-rt` absent
2. api login with the deleted credentials. - expect: 401 invalid_credentials
3. api.register with the same email and password. - expect: 201: the email can register again (fixture teardown deletes it)

### 7. API tests (for tests/api)

**Seed:** `tests/seed.spec.ts`

#### 7.1. AUTH-08 logout ends the session family server-side

**File:** `tests/api/logout.spec.ts`

**Steps:**

1. `user` logs in twice with remember:true (families F1 and F2). POST auth/logout with F1's refresh token. Tag @REQ-AUTH-08 (checklist AUTH-007/014 in the brief). - expect: Logout succeeds, the cookie is cleared
2. POST auth/refresh with F1's old token; DELETE /me with F1's pre-logout access token; POST auth/refresh with F2's token. - expect: F1 refresh 401 - expect: DELETE /me with F1's token 401 unauthorized (sensitive routes need a live session) - expect: F2 refresh 200: logout ends only its own family

#### 7.2. AUTH-09 Google linking an unverified password account revokes sessions and clears the password

**File:** `tests/api/google.spec.ts`

**Steps:**

1. `user` logs in (S1). Run the fake Google handshake with user.email and POST auth/google/exchange. Tag @REQ-AUTH-09. - expect: Exchange 200, same user id as the password account
2. Refresh S1; api.login with the old password. - expect: Refresh 401; login 401 invalid_credentials

#### 7.3. AUTH-11 a Google login code cannot be redeemed without the matching nonce

**File:** `tests/api/google.spec.ts`

**Steps:**

1. Handshake with nonceHash = sha256(nonceA); POST auth/google/exchange with nonceB, then with no nonce, then with nonceA (fresh handshake per attempt). Tag @REQ-AUTH-11. - expect: Wrong and missing nonce rejected (non-2xx; the generator confirms status/error code, google.ts line ~227) - expect: Correct nonce 200
2. GET auth/google with no nonceHash and with a non-hex nonceHash, maxRedirects 0. - expect: Not a 302 to the provider (start rejected; google.ts requires 64 hex chars)

#### 7.4. AUTH-06 the remember flag controls the refresh token (API)

**File:** `tests/api/remember.spec.ts`

**Steps:**

1. api.login with remember:true, then with remember:false. Tag @REQ-AUTH-06 (checklist AUTH-008/009). - expect: true: body has refreshToken and Set-Cookie qa_rt has Max-Age or Expires (about 30 days) - expect: false: no refreshToken in the body; session cookie (no Max-Age/Expires)

### 8. Ideas (not planned, the user decides)

**Seed:** `tests/seed.spec.ts`

#### 8.1. Ideas

**File:** `none (not a test)`

**Steps:**

1. Remember on, cookies cleared: context.clearCookies() then reload keeps the session via the `qa-hub-rt` localStorage fallback; logout removes `qa-hub-rt` (checklist AUTH-008). - expect: Signed in after clearCookies
2. Wrong current password in the profile: `profile-password-message` data-state=error, text "Поточний пароль невірний.", session stays (observed live). - expect: Error shown, account unchanged
3. Google cancel: Cancel on the fake page gives /login?error=google_cancelled (checklist AUTH-016); Google with remember unticked leaves `qa-hub-rt` empty (AUTH-015); Google with the email of an existing password account signs into it (AUTH-017, overlaps the unverified scenario). - expect: Error shown / no token stored
4. Expiry of the Google state/code (observed once after ~30 min wait): needs the TTL from the owner or page.clock. - expect: /login?error=google_state
5. Delete the account that has progress: its leaderboard and chat entries after deletion; delete a Google-only account (confirm field still requires the email); case-insensitive confirm (Ambiguity 3). - expect: Per owner decision
6. Registration without a name works (observed); not part of this block. - expect: n/a
