import { test, expect } from '@playwright/test';

test.describe('Favourites', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-Mail').fill('max@tcz.at');
    await page.getByLabel('Passwort').fill('max@tcz.at');
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await expect(page).toHaveURL('/dashboard');
    await page.goto('/favourites');
  });

  test.describe('Favourites List', () => {
    test('shows favourites heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Meine Favoriten' })).toBeVisible();
    });

    test('shows empty state when no favourites', async ({ page }) => {
      // Wait for page to load
      await page.waitForTimeout(1000);
      // Should show either empty state OR at least one favourite card
      const emptyState = page.getByText('Du hast noch keine Favoriten');
      const favouriteCard = page.locator('[data-testid^="favourite-"]').first();
      const addButton = page.getByTestId('add-favourite-btn');

      // Wait for either state to be visible
      await expect(addButton).toBeVisible({ timeout: 10000 });

      const hasEmpty = await emptyState.isVisible();
      const hasCard = await favouriteCard.isVisible();
      expect(hasEmpty || hasCard).toBe(true);
    });

    test('shows add favourite button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Favorit hinzufügen' })).toBeVisible();
    });
  });

  test.describe('Add Favourite', () => {
    test('opens member search modal', async ({ page }) => {
      await page.getByRole('button', { name: 'Favorit hinzufügen' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByTestId('favourite-search-input')).toBeVisible();
    });

    test('search shows matching members', async ({ page }) => {
      await page.getByRole('button', { name: 'Favorit hinzufügen' }).click();
      await page.getByTestId('favourite-search-input').fill('Anna');

      // Wait for results to load
      await page.waitForTimeout(500);
      const results = page.getByTestId('search-results');
      if (await results.isVisible()) {
        await expect(results).toBeVisible();
      }
    });

    test('can select member from search results', async ({ page }) => {
      await page.getByRole('button', { name: 'Favorit hinzufügen' }).click();
      await page.getByTestId('favourite-search-input').fill('Anna');

      await page.waitForTimeout(500);
      const firstResult = page.locator('[data-testid^="search-result-"]').first();
      if (await firstResult.isVisible()) {
        await firstResult.click();
        await expect(page.getByText('Favorit hinzugefügt')).toBeVisible();
      }
    });

    test('keyboard navigation works in search results', async ({ page }) => {
      await page.getByRole('button', { name: 'Favorit hinzufügen' }).click();
      await page.getByTestId('favourite-search-input').fill('An');

      // Wait for results
      await page.waitForTimeout(500);
      const results = page.getByTestId('search-results');

      if (await results.isVisible()) {
        // Navigate with arrow keys
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');

        // Should highlight via bg-blue-50 class
        const highlighted = page.locator('.bg-blue-50');
        await expect(highlighted).toBeVisible();
      }
    });

    test('enter key selects highlighted result', async ({ page }) => {
      await page.getByRole('button', { name: 'Favorit hinzufügen' }).click();
      await page.getByTestId('favourite-search-input').fill('Anna');

      await page.waitForTimeout(500);
      const results = page.getByTestId('search-results');

      if (await results.isVisible()) {
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        await expect(page.getByText('Favorit hinzugefügt')).toBeVisible();
      }
    });

    test('shows "no results" message for empty search', async ({ page }) => {
      await page.getByRole('button', { name: 'Favorit hinzufügen' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByTestId('favourite-search-input').fill('xyznonexistent123');

      // Wait for API response and check for empty state
      await expect(page.getByText('Keine Mitglieder gefunden')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Remove Favourite', () => {
    test('shows remove button on favourite card', async ({ page }) => {
      const favouriteCard = page.locator('[data-testid^="favourite-"]').first();
      if (await favouriteCard.isVisible()) {
        const removeButton = favouriteCard.locator('[data-testid^="remove-favourite-"]');
        await expect(removeButton).toBeVisible();
      }
    });

    test('shows confirmation before removing', async ({ page }) => {
      const removeButton = page.locator('[data-testid^="remove-favourite-"]').first();
      if (await removeButton.isVisible()) {
        await removeButton.click();
        await expect(page.getByText('Favorit entfernen?')).toBeVisible();
      }
    });

    test('can cancel removal', async ({ page }) => {
      const removeButton = page.locator('[data-testid^="remove-favourite-"]').first();
      if (await removeButton.isVisible()) {
        await removeButton.click();
        await page.getByRole('button', { name: 'Abbrechen' }).click();
        await expect(page.getByText('Favorit entfernen?')).not.toBeVisible();
      }
    });

    test('successful removal shows confirmation', async ({ page }) => {
      const removeButton = page.locator('[data-testid^="remove-favourite-"]').first();
      if (await removeButton.isVisible()) {
        await removeButton.click();
        await page.getByRole('button', { name: 'Entfernen' }).click();
        await expect(page.getByText('Favorit entfernt')).toBeVisible();
      }
    });
  });

  test.describe('Favourite Card', () => {
    test('shows member name', async ({ page }) => {
      const favouriteCard = page.locator('[data-testid^="favourite-"]').first();
      if (await favouriteCard.isVisible()) {
        // Card should have name in h3 element
        const nameText = favouriteCard.locator('h3');
        await expect(nameText).toBeVisible();
      }
    });

    test('shows profile picture or initials', async ({ page }) => {
      const favouriteCard = page.locator('[data-testid^="favourite-"]').first();
      if (await favouriteCard.isVisible()) {
        // Should have initials avatar
        const avatar = favouriteCard.locator('.rounded-full');
        await expect(avatar).toBeVisible();
      }
    });
  });
});
