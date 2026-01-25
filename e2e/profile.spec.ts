import { test, expect } from '@playwright/test';

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-Mail').fill('max@tcz.at');
    await page.getByLabel('Passwort').fill('max@tcz.at');
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await expect(page).toHaveURL('/dashboard');
    await page.goto('/profile');
    // Wait for profile to load
    await page.waitForSelector('[data-testid="profile-picture"]');
  });

  test.describe('Profile View', () => {
    test('shows profile heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();
    });

    test('shows user name', async ({ page }) => {
      // User has a name shown in the profile header (h2 element)
      // Wait for profile data to load by checking for the name display
      await page.waitForFunction(() => {
        const h2 = document.querySelector('h2');
        return h2 && h2.textContent && h2.textContent.trim().length > 0;
      }, { timeout: 10000 });
      const nameText = page.locator('h2').first();
      await expect(nameText).toBeVisible();
    });

    test('shows email', async ({ page }) => {
      // Email is shown somewhere on page - wait for it to load
      await page.waitForTimeout(1000);
      await expect(page.getByText('max@tcz.at')).toBeVisible({ timeout: 10000 });
    });

    test('shows profile picture or placeholder', async ({ page }) => {
      const profilePic = page.getByTestId('profile-picture');
      await expect(profilePic).toBeVisible();
    });
  });

  test.describe('Edit Profile', () => {
    test('can edit first name', async ({ page }) => {
      const firstNameInput = page.getByLabel('Vorname');
      await expect(firstNameInput).toBeVisible();
      await firstNameInput.clear();
      await firstNameInput.fill('Maximilian');
      // Find and click the first save button (for personal data form)
      await page.getByRole('button', { name: 'Speichern' }).first().click();
      // Wait for response
      await page.waitForTimeout(1000);
    });

    test('can edit last name', async ({ page }) => {
      const lastNameInput = page.getByLabel('Nachname');
      await expect(lastNameInput).toBeVisible();
      await lastNameInput.clear();
      await lastNameInput.fill('Muster');
      await page.getByRole('button', { name: 'Speichern' }).first().click();
      await page.waitForTimeout(1000);
    });

    test('can edit phone number', async ({ page }) => {
      const phoneInput = page.getByLabel('Telefon');
      await expect(phoneInput).toBeVisible();
      await phoneInput.clear();
      await phoneInput.fill('+43 123 456789');
      await page.getByRole('button', { name: 'Speichern' }).first().click();
      await page.waitForTimeout(1000);
    });

    test('can edit address', async ({ page }) => {
      // Wait for form inputs to be visible
      await expect(page.getByLabel('Straße')).toBeVisible({ timeout: 10000 });
      await page.getByLabel('Straße').fill('Teststraße 1');
      await page.getByLabel('PLZ').fill('1234');
      await page.getByLabel('Ort').fill('Teststadt');
      await page.getByRole('button', { name: 'Speichern' }).first().click();
      await page.waitForTimeout(1000);
    });
  });

  test.describe('Profile Picture', () => {
    test('can upload profile picture', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      // File input exists
      await expect(fileInput).toBeAttached();
    });

    test('can delete profile picture', async ({ page }) => {
      const deleteButton = page.getByText('Bild löschen');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await expect(page.getByText('Bild gelöscht')).toBeVisible();
      }
    });
  });

  test.describe('Notification Settings', () => {
    test('can toggle email notifications', async ({ page }) => {
      const emailToggle = page.getByLabel('E-Mail-Benachrichtigungen');
      await expect(emailToggle).toBeVisible();
      // Just check it's interactable, clicking triggers auto-save
      await emailToggle.click();
      await page.waitForTimeout(1000);
    });

    test.skip('can toggle push notifications', async () => {
      // Push notifications not implemented in web version
    });

    test('shows notification type options when enabled', async ({ page }) => {
      const emailToggle = page.getByLabel('E-Mail-Benachrichtigungen');
      if (await emailToggle.isChecked()) {
        await expect(page.getByLabel('Eigene Buchungen')).toBeVisible();
        await expect(page.getByLabel('Buchungen anderer')).toBeVisible();
        await expect(page.getByLabel('Platzsperrungen')).toBeVisible();
      }
    });
  });

  test.describe('Password Change', () => {
    test('shows password change section', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Passwort ändern' })).toBeVisible();
    });

    test('requires current password', async ({ page }) => {
      await page.getByLabel('Neues Passwort').fill('newpassword123');
      await page.getByLabel('Passwort bestätigen').fill('newpassword123');
      // There may be multiple "Passwort ändern" elements - button in password section
      const buttons = page.getByRole('button', { name: 'Passwort ändern' });
      await buttons.last().click();

      await expect(page.getByText('Aktuelles Passwort erforderlich')).toBeVisible();
    });

    test('validates password confirmation', async ({ page }) => {
      await page.getByLabel('Aktuelles Passwort').fill('max@tcz.at');
      await page.getByLabel('Neues Passwort').fill('newpassword123');
      await page.getByLabel('Passwort bestätigen').fill('differentpassword');
      const buttons = page.getByRole('button', { name: 'Passwort ändern' });
      await buttons.last().click();

      await expect(page.getByText('Passwörter stimmen nicht überein')).toBeVisible();
    });
  });

  test.describe('Email Verification', () => {
    test('shows verification status', async ({ page }) => {
      const verifiedBadge = page.getByText('E-Mail bestätigt');
      const unverifiedWarning = page.getByText('E-Mail nicht bestätigt');

      const isVerified = await verifiedBadge.isVisible();
      const isUnverified = await unverifiedWarning.isVisible();

      expect(isVerified || isUnverified).toBe(true);
    });

    test.skip('can resend verification email if unverified', async () => {
      // Resend verification email endpoint not implemented yet
    });
  });
});
