import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display tool cards on home page', async ({ page }) => {
    await page.goto('/');

    // Check header
    await expect(page.locator('text=AudiFX')).toBeVisible();
    await expect(page.locator('text=Professional audio tools powered by AI')).toBeVisible();

    // Check title and subtitle
    await expect(page.locator('text=Choose Your Tool')).toBeVisible();
    await expect(page.locator('text=Select a tool below to get started')).toBeVisible();

    // Check Audio Effects card
    const audioEffectsCard = page.locator('text=Audio Effects').locator('..');
    await expect(audioEffectsCard).toBeVisible();
    await expect(audioEffectsCard.locator('text=Transform audio with genre presets')).toBeVisible();
    await expect(audioEffectsCard.locator('text=Start Mixing →')).toBeVisible();

    // Check MIDI Visualizer card
    const midiCard = page.locator('text=MIDI Visualizer').locator('..');
    await expect(midiCard).toBeVisible();
    await expect(midiCard.locator('text=AI-powered MIDI transcription')).toBeVisible();
    await expect(midiCard.locator('text=Visualize Music →')).toBeVisible();
  });

  test('should navigate to audio effects when clicked', async ({ page }) => {
    await page.goto('/');

    // Click Audio Effects card
    await page.locator('text=Audio Effects').click();

    // Should show upload page
    await expect(page.locator('text=Drop your audio here')).toBeVisible();

    // Should have back button
    await expect(page.locator('text=← Home')).toBeVisible();
  });

  test('should navigate to MIDI visualizer when clicked', async ({ page }) => {
    await page.goto('/');

    // Click MIDI Visualizer card
    await page.locator('text=MIDI Visualizer').click();

    // Should show MIDI Visualizer page
    await expect(page.locator('text=MIDI')).toBeVisible();
    await expect(page.locator('text=Visualizer')).toBeVisible();

    // Should have back button
    await expect(page.locator('text=← Home')).toBeVisible();
  });

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/');

    // Navigate to Audio Effects
    await page.locator('text=Audio Effects').click();
    await expect(page.locator('text=Drop your audio here')).toBeVisible();

    // Click back button
    await page.locator('text=← Home').click();

    // Should be back on home page
    await expect(page.locator('text=Choose Your Tool')).toBeVisible();
  });

  test('should take screenshot of home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000); // Wait for animations
    await expect(page).toHaveScreenshot('home-page.png');
  });

  test('should take screenshot of audio effects page', async ({ page }) => {
    await page.goto('/');
    await page.locator('text=Audio Effects').click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('audio-effects-page.png');
  });

  test('should take screenshot of MIDI visualizer page', async ({ page }) => {
    await page.goto('/');
    await page.locator('text=MIDI Visualizer').click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('midi-visualizer-page.png');
  });
});
