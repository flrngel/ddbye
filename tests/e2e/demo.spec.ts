import { test, expect } from '@playwright/test';

test.describe('Demo flow', () => {
  test('full PG demo: load example → run diligence → verify research + outreach → copy draft', async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/console');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Verify console loads
    await expect(page.getByText('What are you trying to make happen?')).toBeVisible();

    // Click "Load PG example" and verify textarea is populated
    await page.getByRole('button', { name: 'Load PG example' }).click();
    const textarea = page.locator('textarea').first();
    await expect(textarea).not.toBeEmpty();
    const briefText = await textarea.inputValue();
    expect(briefText.toLowerCase()).toMatch(/hacker news|pg/);

    // Click "Run due diligence"
    await page.getByRole('button', { name: 'Run due diligence' }).click();

    // Verify at least one stage badge shows "running" within 2s
    await expect(page.getByText('running').first()).toBeVisible({ timeout: 2000 });

    // Wait for status badge to show "ready" (simulation completes in ~5s)
    await expect(page.getByRole('button').filter({ hasText: 'ready' }).first()).toBeVisible({ timeout: 15000 });

    // Verify research board: person and organization
    await expect(page.getByText('Hacker News / YC orbit')).toBeVisible({ timeout: 5000 });
    // Person "Paul Graham" appears in the research card
    await expect(page.getByText('Paul Graham').first()).toBeVisible({ timeout: 5000 });

    // Verify recommended wedge headline is present
    const wedgeSection = page.getByText('Recommended wedge').locator('..');
    await expect(wedgeSection).toBeVisible();

    // Verify outreach studio shows subject lines (email tab is default)
    await expect(page.getByText('Subject lines')).toBeVisible();

    // Verify final draft section has content
    await expect(page.getByRole('heading', { name: 'Final draft' })).toBeVisible();
    const draftBody = page.locator('pre');
    await expect(draftBody.first()).toContainText('Hi');

    // Click "Copy draft" and verify button changes to "Copied"
    const copyButton = page.getByRole('button', { name: 'Copy draft' });
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible({ timeout: 2000 });
  });
});
