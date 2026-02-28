import { test, expect } from '@playwright/test';

test.describe('Landing to console navigation', () => {
  test('navigates from landing page to console', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');

    // Verify landing page content
    await expect(page.getByText('Outreach OS')).toBeVisible();
    await expect(page.getByText('Messy target brief in')).toBeVisible();

    // Click "Open console" and verify navigation
    await page.getByRole('link', { name: 'Open console' }).click();
    await expect(page).toHaveURL(/\/console/);

    // Verify the composer section is visible
    await expect(page.getByText('What are you trying to make happen?')).toBeVisible();
  });
});
