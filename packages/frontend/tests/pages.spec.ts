import { test, expect } from '@playwright/test';

test.describe('Page Screenshots', () => {
  test('Home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check header elements
    await expect(page.locator('h1')).toContainText('AudiFX');

    // Check tool cards are visible
    await expect(page.getByText('Audio Effects')).toBeVisible();
    await expect(page.getByText('MIDI Visualizer')).toBeVisible();
    await expect(page.getByText('Music Analysis')).toBeVisible();
    await expect(page.getByText('Stem Mixer')).toBeVisible();

    await page.screenshot({ path: 'screenshots/home.png', fullPage: true });
  });

  test('Audio Effects page', async ({ page }) => {
    await page.goto('/effects');
    await page.waitForLoadState('networkidle');

    // Check breadcrumb navigation
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /audifx/i })).toBeVisible();
    await expect(page.getByText('Audio Effects')).toBeVisible();

    await page.screenshot({ path: 'screenshots/effects.png', fullPage: true });
  });

  test('MIDI Visualizer page', async ({ page }) => {
    await page.goto('/visualizer');
    await page.waitForLoadState('networkidle');

    // Check breadcrumb navigation
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /audifx/i })).toBeVisible();
    await expect(page.getByText('MIDI Visualizer')).toBeVisible();

    // Check upload area exists
    await expect(page.getByRole('heading', { name: /upload audio/i })).toBeVisible();

    await page.screenshot({ path: 'screenshots/visualizer.png', fullPage: true });
  });

  test('Music Analysis page', async ({ page }) => {
    await page.goto('/analysis');
    await page.waitForLoadState('networkidle');

    // Check breadcrumb navigation
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /audifx/i })).toBeVisible();
    await expect(page.getByText('Music Analysis')).toBeVisible();

    // Check upload area exists
    await expect(page.getByText(/drop an audio file/i)).toBeVisible();

    await page.screenshot({ path: 'screenshots/analysis.png', fullPage: true });
  });

  test('404 page', async ({ page }) => {
    await page.goto('/non-existent-page');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Page Not Found')).toBeVisible();
    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();

    await page.screenshot({ path: 'screenshots/404.png', fullPage: true });
  });

  test('MIDI Visualizer with invalid job ID', async ({ page }) => {
    await page.goto('/visualizer/invalid-job-id-12345');
    await page.waitForLoadState('networkidle');

    // Should show error state
    await page.waitForSelector('text=/not found|error|failed/i', { timeout: 10000 });

    await page.screenshot({ path: 'screenshots/visualizer-invalid-job.png', fullPage: true });
  });

  test('Music Analysis with invalid job ID', async ({ page }) => {
    await page.goto('/analysis/invalid-job-id-12345');
    await page.waitForLoadState('networkidle');

    // Should show error state
    await page.waitForSelector('text=/not found|error|failed/i', { timeout: 10000 });

    await page.screenshot({ path: 'screenshots/analysis-invalid-job.png', fullPage: true });
  });

  test('Stem Mixer page', async ({ page }) => {
    await page.goto('/remix');
    await page.waitForLoadState('networkidle');

    // Check breadcrumb navigation
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /audifx/i })).toBeVisible();
    await expect(page.getByText('Stem Mixer')).toBeVisible();

    // Check upload area exists
    await expect(page.getByText(/drop an audio file/i)).toBeVisible();

    await page.screenshot({ path: 'screenshots/remix.png', fullPage: true });
  });

  test('Stem Mixer with invalid job ID', async ({ page }) => {
    await page.goto('/remix/invalid-job-id-12345');
    await page.waitForLoadState('networkidle');

    // Should show error state
    await page.waitForSelector('text=/not found|error|failed/i', { timeout: 10000 });

    await page.screenshot({ path: 'screenshots/remix-invalid-job.png', fullPage: true });
  });
});

test.describe('Navigation', () => {
  test('Navigate from home to each tool and back', async ({ page }) => {
    await page.goto('/');

    // Go to Effects
    await page.getByText('Audio Effects').first().click();
    await expect(page).toHaveURL('/effects');
    // Navigate back via breadcrumb
    await page.getByRole('link', { name: /audifx/i }).click();
    await expect(page).toHaveURL('/');

    // Go to Visualizer
    await page.getByText('MIDI Visualizer').first().click();
    await expect(page).toHaveURL('/visualizer');
    // Navigate back via breadcrumb
    await page.getByRole('link', { name: /audifx/i }).click();
    await expect(page).toHaveURL('/');

    // Go to Analysis
    await page.getByText('Music Analysis').first().click();
    await expect(page).toHaveURL('/analysis');
    // Navigate back via breadcrumb
    await page.getByRole('link', { name: /audifx/i }).click();
    await expect(page).toHaveURL('/');

    // Go to Stem Mixer
    await page.getByText('Stem Mixer').first().click();
    await expect(page).toHaveURL('/remix');
    // Navigate back via breadcrumb
    await page.getByRole('link', { name: /audifx/i }).click();
    await expect(page).toHaveURL('/');
  });
});
