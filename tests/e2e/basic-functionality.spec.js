import { test, expect } from '@playwright/test';

test.describe('OPXY Tools - Basic Functionality', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads and contains the expected title
    await expect(page).toHaveTitle(/unofficial OP-XY tools/);
    
    // Check for the main app header
    await expect(page.locator('.app-header')).toContainText('unofficial OP-XY tools');
    
    // Check that both main tabs are present
    await expect(page.locator('#drum-tab')).toBeVisible();
    await expect(page.locator('#multisample-tab')).toBeVisible();
  });

  test('should switch between drum and multisample tabs', async ({ page }) => {
    await page.goto('/');
    
    // Drum tab should be active by default
    await expect(page.locator('#drum-tab')).toHaveClass(/active/);
    await expect(page.locator('#drum')).toBeVisible();
    
    // Click multisample tab
    await page.click('#multisample-tab');
    
    // Multisample tab should now be active
    await expect(page.locator('#multisample-tab')).toHaveClass(/active/);
    await expect(page.locator('#multisample')).toBeVisible();
    
    // Drum content should be hidden
    await expect(page.locator('#drum')).not.toBeVisible();
    
    // Click back to drum tab
    await page.click('#drum-tab');
    
    // Drum tab should be active again
    await expect(page.locator('#drum-tab')).toHaveClass(/active/);
    await expect(page.locator('#drum')).toBeVisible();
  });

  test('should display drum sample slots', async ({ page }) => {
    await page.goto('/');
    
    // Check that drum sample slots are visible
    for (let i = 1; i <= 24; i++) {
      await expect(page.locator(`#sample-${i}`)).toBeAttached();
    }
    
    // Check for generate patch button
    await expect(page.locator('text=generate patch')).toBeVisible();
    
    // Check for preset name input
    await expect(page.locator('#preset-name-drum')).toBeVisible();
  });

  test('should display multisample interface', async ({ page }) => {
    await page.goto('/');
    
    // Switch to multisample tab
    await page.click('#multisample-tab');
    
    // Check for file drop area
    await expect(page.locator('#multisample-drop-area')).toBeVisible();
    
    // Check for browse button
    await expect(page.locator('#multisample-browse-btn')).toBeVisible();
    
    // Check for generate patch button
    await expect(page.locator('text=generate patch')).toBeVisible();
  });

  test('should handle preset name validation', async ({ page }) => {
    await page.goto('/');
    
    // Generate patch button should be disabled when no preset name
    const generateBtn = page.locator('text=generate patch').first();
    await expect(generateBtn).toBeDisabled();
    
    // Enter a preset name
    await page.fill('#preset-name-drum', 'Test Preset');
    
    // Button should still be disabled without samples, but this tests the name validation
    // We can't easily test with samples in this basic test
  });

  test('should display conversion settings', async ({ page }) => {
    await page.goto('/');
    
    // Check for sample rate dropdown
    await expect(page.locator('#sample-rate-drum')).toBeVisible();
    
    // Check for bit depth dropdown  
    await expect(page.locator('#bit-depth-drum')).toBeVisible();
    
    // Check for channels dropdown
    await expect(page.locator('#channels-drum')).toBeVisible();
    
    // Switch to multisample and check those dropdowns too
    await page.click('#multisample-tab');
    
    await expect(page.locator('#sample-rate-multi')).toBeVisible();
    await expect(page.locator('#bit-depth-multi')).toBeVisible();
    await expect(page.locator('#channels-multi')).toBeVisible();
  });
});