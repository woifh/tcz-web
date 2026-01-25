import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('E-Mail').fill('max@tcz.at');
    await page.getByLabel('Passwort').fill('max@tcz.at');
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test.describe('Layout', () => {
    test('shows navigation header', async ({ page }) => {
      await expect(page.getByRole('navigation')).toBeVisible();
      await expect(page.getByText('TCZ')).toBeVisible();
    });

    test('shows user greeting in header', async ({ page }) => {
      await expect(page.getByText('Hallo, Max!')).toBeVisible();
    });

    test('shows logout button', async ({ page }) => {
      // Logout button is in user menu dropdown
      await page.getByTestId('user-menu-button').click();
      await expect(page.getByRole('button', { name: 'Abmelden' })).toBeVisible();
    });
  });

  test.describe('Date Navigation', () => {
    test('shows current date', async ({ page }) => {
      // Should show today's date in the date picker/display
      await expect(page.getByTestId('current-date')).toBeVisible();
    });

    test('can navigate to next day', async ({ page }) => {
      const initialDate = await page.getByTestId('current-date').textContent();
      await page.getByTestId('next-day').click();
      const newDate = await page.getByTestId('current-date').textContent();
      expect(newDate).not.toBe(initialDate);
    });

    test('can navigate to previous day', async ({ page }) => {
      // First go to next day
      await page.getByTestId('next-day').click();
      const afterNext = await page.getByTestId('current-date').textContent();

      // Then go back
      await page.getByTestId('prev-day').click();
      const afterPrev = await page.getByTestId('current-date').textContent();

      expect(afterPrev).not.toBe(afterNext);
    });

    test('can jump to today', async ({ page }) => {
      // Navigate away from today
      await page.getByTestId('next-day').click();
      await page.getByTestId('next-day').click();

      // Remember the date after navigating
      const afterNav = await page.getByTestId('current-date').textContent();

      // Click today button
      await page.getByRole('button', { name: 'Heute' }).click();

      // Should be back to a different date (today)
      const afterToday = await page.getByTestId('current-date').textContent();
      expect(afterToday).not.toBe(afterNav);
    });
  });

  test.describe('Court Grid', () => {
    test('shows 6 courts', async ({ page }) => {
      await expect(page.getByTestId('court-1')).toBeVisible();
      await expect(page.getByTestId('court-2')).toBeVisible();
      await expect(page.getByTestId('court-3')).toBeVisible();
      await expect(page.getByTestId('court-4')).toBeVisible();
      await expect(page.getByTestId('court-5')).toBeVisible();
      await expect(page.getByTestId('court-6')).toBeVisible();
    });

    test('shows time slots from 8:00 to 21:00', async ({ page }) => {
      await expect(page.getByText('08:00')).toBeVisible();
      await expect(page.getByText('21:00')).toBeVisible();
    });

    test('shows legend', async ({ page }) => {
      // Wait for page to fully load
      await page.waitForSelector('[data-status]', { timeout: 10000 });
      // Legend shows status descriptions
      await expect(page.getByText('Frei', { exact: true })).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Belegt', { exact: true })).toBeVisible();
      await expect(page.getByText('Gesperrt', { exact: true })).toBeVisible();
    });
  });

  test.describe('Slot Status', () => {
    test('available slots are clickable', async ({ page }) => {
      // Find an available slot and verify it's clickable
      const availableSlot = page.locator('[data-status="available"]').first();
      await expect(availableSlot).toBeVisible();
      await expect(availableSlot).toBeEnabled();
    });

    test('clicking available slot opens booking modal', async ({ page }) => {
      const availableSlot = page.locator('[data-status="available"]').first();
      await availableSlot.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Platz buchen')).toBeVisible();
    });

    test('reserved slots show booking info on hover', async ({ page }) => {
      const reservedSlot = page.locator('[data-status="reserved"]').first();
      if (await reservedSlot.isVisible()) {
        // Hover shows title attribute info
        const title = await reservedSlot.getAttribute('title');
        expect(title).toBeTruthy();
      }
    });

    test('own reservations are highlighted', async ({ page }) => {
      const ownSlot = page.locator('[data-status="own"]').first();
      if (await ownSlot.isVisible()) {
        // Own slots should have distinct styling
        await expect(ownSlot).toHaveClass(/own/);
      }
    });
  });

  test.describe('My Reservations Section', () => {
    test('shows my reservations section', async ({ page }) => {
      await expect(page.getByText('Meine Buchungen')).toBeVisible();
    });

    test('can cancel own reservation', async ({ page }) => {
      const cancelButton = page.getByTestId('cancel-reservation').first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        // Should show confirmation dialog
        await expect(page.getByText('Buchung stornieren')).toBeVisible();
      }
    });
  });
});
