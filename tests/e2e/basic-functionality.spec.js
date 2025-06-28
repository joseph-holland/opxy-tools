import { test, expect } from '@playwright/test';

test.describe('OPXY Tools - Basic Functionality', () => {
  test('should load the homepage', async ({ page }) => {
    // Navigate to the page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that both main tabs are present
    await expect(page.locator('#drum-tab')).toBeVisible();
    await expect(page.locator('#multi-tab')).toBeVisible();
  });

  test('should switch between drum and multisample tabs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Drum tab should be active by default
    await expect(page.locator('#drum-tab')).toHaveClass(/active/);
    await expect(page.locator('#drum')).toBeVisible();
    
    // Click multisample tab
    await page.click('#multi-tab');
    
    // Multisample tab should now be active
    await expect(page.locator('#multi-tab')).toHaveClass(/active/);
    await expect(page.locator('#multi')).toBeVisible();
    
    // Drum content should be hidden
    await expect(page.locator('#drum')).not.toBeVisible();
    
    // Click drum tab again
    await page.click('#drum-tab');
    
    // Drum tab should be active again
    await expect(page.locator('#drum-tab')).toHaveClass(/active/);
    await expect(page.locator('#drum')).toBeVisible();
  });

  test('should display drum sample slots', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for drum keyboard grid
    await expect(page.locator('#drum-keyboard')).toBeVisible();
    
    // Check for generate patch button (using more specific selector)
    await expect(page.locator('#drum button.accent-btn:has-text("generate patch")')).toBeVisible();
    
    // Check for preset name input
    await expect(page.locator('#preset-name-drum')).toBeVisible();
  });

  test('should display multisample interface', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Switch to multisample tab
    await page.click('#multi-tab');
    
    // Check for multisample specific elements
    await expect(page.locator('#preset-name-multi')).toBeVisible();
    
    // Check for generate patch button (using more specific selector)
    await expect(page.locator('#generate-multisample-patch')).toBeVisible();
  });

  test('should handle preset name validation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Generate patch button should be disabled when no preset name
    const generateBtn = page.locator('#drum button.accent-btn:has-text("generate patch")');
    await expect(generateBtn).toBeDisabled();
    
    // Enter a preset name
    await page.fill('#preset-name-drum', 'Test Preset');
    
    // Button should still be disabled (needs samples)
    await expect(generateBtn).toBeDisabled();
  });

  test('should display conversion settings', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for conversion settings in drum tab
    await expect(page.locator('#sample-rate-drum')).toBeVisible();
    await expect(page.locator('#bit-depth-drum')).toBeVisible();
    await expect(page.locator('#channels-drum')).toBeVisible();
    
    // Switch to multisample tab and check settings
    await page.click('#multi-tab');
    await expect(page.locator('#sample-rate-multi')).toBeVisible();
    await expect(page.locator('#bit-depth-multi')).toBeVisible();
  });
});