import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('shows login form', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'TCZ Anmeldung' })).toBeVisible();
      await expect(page.getByLabel('E-Mail')).toBeVisible();
      await expect(page.getByLabel('Passwort')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible();
    });

    test('successful login redirects to dashboard', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('E-Mail').fill('max@tcz.at');
      await page.getByLabel('Passwort').fill('max@tcz.at');
      await page.getByRole('button', { name: 'Anmelden' }).click();

      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByText('Hallo, Max!')).toBeVisible();
    });

    test('shows error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('E-Mail').fill('wrong@email.com');
      await page.getByLabel('Passwort').fill('wrongpassword');
      await page.getByRole('button', { name: 'Anmelden' }).click();

      await expect(page.getByText('E-Mail oder Passwort ist falsch')).toBeVisible();
      await expect(page).toHaveURL('/login');
    });

    test.skip('shows error for deactivated account', async ({ page }) => {
      // Note: This test requires a deactivated user in the test database
      // Skip this test unless a deactivated@tcz.at user exists
      await page.goto('/login');
      await page.getByLabel('E-Mail').fill('deactivated@tcz.at');
      await page.getByLabel('Passwort').fill('password');
      await page.getByRole('button', { name: 'Anmelden' }).click();

      await expect(page.getByText('Dein Konto wurde deaktiviert')).toBeVisible();
    });

    test('redirects authenticated user away from login page', async ({ page }) => {
      // First login
      await page.goto('/login');
      await page.getByLabel('E-Mail').fill('max@tcz.at');
      await page.getByLabel('Passwort').fill('max@tcz.at');
      await page.getByRole('button', { name: 'Anmelden' }).click();
      await expect(page).toHaveURL('/dashboard');

      // Try to access login page again
      await page.goto('/login');
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.getByLabel('E-Mail').fill('max@tcz.at');
      await page.getByLabel('Passwort').fill('max@tcz.at');
      await page.getByRole('button', { name: 'Anmelden' }).click();
      await expect(page).toHaveURL('/dashboard');
    });

    test('logout redirects to login page', async ({ page }) => {
      // Open user menu dropdown
      await page.getByTestId('user-menu-button').click();
      await page.getByRole('button', { name: 'Abmelden' }).click();
      await expect(page).toHaveURL('/login');
    });

    test('after logout, protected routes redirect to login', async ({ page }) => {
      // Open user menu dropdown
      await page.getByTestId('user-menu-button').click();
      await page.getByRole('button', { name: 'Abmelden' }).click();
      await expect(page).toHaveURL('/login');

      // Try to access protected route
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Protected Routes', () => {
    test('unauthenticated user is redirected to login', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');
    });

    test('unauthenticated user is redirected from profile', async ({ page }) => {
      await page.goto('/profile');
      await expect(page).toHaveURL('/login');
    });

    test('unauthenticated user is redirected from reservations', async ({ page }) => {
      await page.goto('/reservations');
      await expect(page).toHaveURL('/login');
    });

    test('unauthenticated user is redirected from favourites', async ({ page }) => {
      await page.goto('/favourites');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Session Persistence', () => {
    test('session persists across page refresh', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('E-Mail').fill('max@tcz.at');
      await page.getByLabel('Passwort').fill('max@tcz.at');
      await page.getByRole('button', { name: 'Anmelden' }).click();
      await expect(page).toHaveURL('/dashboard');

      // Refresh the page
      await page.reload();

      // Should still be logged in
      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByText('Hallo, Max!')).toBeVisible();
    });
  });
});
