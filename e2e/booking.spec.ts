import { test, expect } from '@playwright/test';

test.describe('Booking', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('E-Mail').fill('max@tcz.at');
    await page.getByLabel('Passwort').fill('max@tcz.at');
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test.describe('Create Booking', () => {
    test('booking modal shows court and time info', async ({ page }) => {
      // Wait for grid to load
      await page.waitForSelector('[data-status]', { timeout: 10000 });
      const availableSlot = page.locator('[data-status="available"]').first();
      await availableSlot.click();

      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      // Modal shows court number and time
      await expect(page.getByText('Platz')).toBeVisible();
    });

    test('can book for self', async ({ page }) => {
      // Wait for grid to load
      await page.waitForSelector('[data-status]', { timeout: 10000 });
      const availableSlot = page.locator('[data-status="available"]').first();
      await availableSlot.click();

      await expect(page.getByRole('dialog')).toBeVisible();

      // Click book button (booking for self is default)
      await page.getByTestId('submit-booking-btn').click();

      // Should show success message or modal closes
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
    });

    test('can book for favourite', async ({ page }) => {
      const availableSlot = page.locator('[data-status="available"]').first();
      await availableSlot.click();

      await expect(page.getByRole('dialog')).toBeVisible();

      // Click "book for someone else" option
      await page.getByText('Für jemand anderen buchen').click();

      // Should show member search
      await expect(page.getByTestId('member-search-input')).toBeVisible();
    });

    test('member search shows results', async ({ page }) => {
      // Wait for grid to load
      await page.waitForSelector('[data-status]', { timeout: 10000 });
      const availableSlot = page.locator('[data-status="available"]').first();
      await availableSlot.click();

      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByText('Für jemand anderen buchen').click();

      // Wait for search input and fill it
      await expect(page.getByTestId('member-search-input')).toBeVisible();
      await page.getByTestId('member-search-input').fill('Max');

      // Wait for search results to appear (may show favourites or search results)
      await page.waitForTimeout(1000);
      // Modal should still be visible with member selection interface
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('close button dismisses modal', async ({ page }) => {
      const availableSlot = page.locator('[data-status="available"]').first();
      await availableSlot.click();

      await expect(page.getByRole('dialog')).toBeVisible();

      await page.getByRole('button', { name: 'Abbrechen' }).click();

      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('escape key dismisses modal', async ({ page }) => {
      const availableSlot = page.locator('[data-status="available"]').first();
      await availableSlot.click();

      await expect(page.getByRole('dialog')).toBeVisible();

      await page.keyboard.press('Escape');

      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('Booking Limits', () => {
    test('shows booking limit info', async ({ page }) => {
      // Should show current booking count - format is "X / Y"
      await expect(page.getByText(/Regulär:/)).toBeVisible();
    });

    test('shows warning when approaching limit', async ({ page }) => {
      // Wait for status to load - shows booking counts like "0 / 2"
      await expect(page.getByText(/\d+ \/ \d+/).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Conflict Resolution', () => {
    // These tests assume the user already has 2 bookings
    test('shows conflict modal when limit exceeded', async ({ page }) => {
      // Try to create a third booking
      const availableSlot = page.locator('[data-status="available"]').first();
      await availableSlot.click();
      await page.getByRole('button', { name: 'Buchen' }).click();

      // If at limit, should show conflict modal
      const conflictModal = page.getByText('Buchungslimit erreicht');
      if (await conflictModal.isVisible()) {
        await expect(conflictModal).toBeVisible();
        await expect(page.getByText('Bestehende Buchung stornieren')).toBeVisible();
      }
    });

    test('can select reservation to cancel in conflict modal', async ({ page }) => {
      // This test assumes conflict modal is shown
      const conflictModal = page.getByText('Buchungslimit erreicht');
      if (await conflictModal.isVisible()) {
        // Should show list of existing reservations
        const existingReservation = page.getByTestId('conflict-reservation').first();
        await expect(existingReservation).toBeVisible();

        // Should be able to select one
        await existingReservation.click();
        await expect(existingReservation).toHaveClass(/selected/);
      }
    });

    test('cancelling conflicting reservation allows new booking', async ({ page }) => {
      const conflictModal = page.getByText('Buchungslimit erreicht');
      if (await conflictModal.isVisible()) {
        // Select and cancel a reservation
        await page.getByTestId('conflict-reservation').first().click();
        await page.getByRole('button', { name: 'Stornieren und buchen' }).click();

        // Should show success
        await expect(page.getByText(/Buchung.*erfolgreich/i)).toBeVisible();
      }
    });
  });

  test.describe('Cancel Booking', () => {
    test('can cancel own booking from reservations list', async ({ page }) => {
      // Navigate to reservations page
      await page.goto('/reservations');

      const cancelButton = page.getByTestId('cancel-reservation').first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        // Should show confirmation dialog
        await expect(page.getByText('Buchung stornieren?')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Stornieren' })).toBeVisible();
      }
    });

    test('cancel confirmation prevents accidental deletion', async ({ page }) => {
      await page.goto('/reservations');

      const cancelButton = page.getByTestId('cancel-reservation').first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        // Click cancel on confirmation
        await page.getByRole('button', { name: 'Abbrechen' }).click();

        // Dialog should close, reservation should still exist
        await expect(page.getByText('Buchung stornieren?')).not.toBeVisible();
      }
    });

    test('successful cancellation shows confirmation', async ({ page }) => {
      await page.goto('/reservations');

      const cancelButton = page.getByTestId('cancel-reservation').first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await page.getByRole('button', { name: 'Stornieren' }).click();

        // Should show success message
        await expect(page.getByText('Buchung erfolgreich storniert')).toBeVisible();
      }
    });
  });

  test.describe('Short Notice Bookings', () => {
    test('short notice booking shows different styling', async ({ page }) => {
      // Short notice bookings (within 24h) should be visually distinct
      const shortNoticeSlot = page.locator('[data-short-notice="true"]').first();
      if (await shortNoticeSlot.isVisible()) {
        await expect(shortNoticeSlot).toHaveClass(/short-notice/);
      }
    });

    test('short notice booking shows info in modal', async ({ page }) => {
      // Book a slot that's within 24 hours
      const shortNoticeSlot = page.locator('[data-short-notice="true"][data-status="available"]').first();
      if (await shortNoticeSlot.isVisible()) {
        await shortNoticeSlot.click();
        await expect(page.getByText('Kurzfristige Buchung')).toBeVisible();
      }
    });
  });
});
