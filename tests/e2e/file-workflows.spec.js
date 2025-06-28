import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

test.describe('OPXY Tools - File Upload Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle file drag and drop in multisample tab', async ({ page }) => {
    // Switch to multisample tab
    await page.click('#multisample-tab');
    
    // Check initial state
    await expect(page.locator('#multisample-drop-area')).toBeVisible();
    await expect(page.locator('#multisample-drop-area')).toContainText('drag and drop');
    
    // Test drag over effect (without actual file)
    await page.locator('#multisample-drop-area').hover();
    
    // The drop area should be interactive
    await expect(page.locator('#multisample-drop-area')).toBeVisible();
  });

  test('should show file browse dialog on browse button click', async ({ page }) => {
    // Test drum tab file browser
    const fileInputPromise = page.waitForEvent('filechooser');
    await page.click('#search-1'); // Click the search button for first drum slot
    const fileChooser = await fileInputPromise;
    expect(fileChooser.isMultiple()).toBe(false);
    
    // Test multisample tab file browser
    await page.click('#multisample-tab');
    const multiFileInputPromise = page.waitForEvent('filechooser');
    await page.click('#multisample-browse-btn');
    const multiFileChooser = await multiFileInputPromise;
    expect(multiFileChooser.isMultiple()).toBe(true);
  });

  test('should validate preset name requirements', async ({ page }) => {
    // Check drum tab preset validation
    const drumGenerateBtn = page.locator('#drum .accent-btn:has-text("generate patch")');
    await expect(drumGenerateBtn).toBeDisabled();
    
    // Enter preset name
    await page.fill('#preset-name-drum', 'My Drum Kit');
    
    // Button should still be disabled without samples but name validation passes
    // (We can't easily test the full flow without actual audio files)
    
    // Test multisample tab
    await page.click('#multisample-tab');
    
    const multiGenerateBtn = page.locator('#multisample .accent-btn:has-text("generate patch")');
    await expect(multiGenerateBtn).toBeDisabled();
    
    await page.fill('#preset-name-multi', 'My Multisample');
    // Same here - button would still be disabled without samples
  });

  test('should display conversion settings and allow changes', async ({ page }) => {
    // Test drum conversion settings
    await expect(page.locator('#sample-rate-drum')).toBeVisible();
    
    // Change sample rate
    await page.selectOption('#sample-rate-drum', '22050');
    expect(await page.locator('#sample-rate-drum').inputValue()).toBe('22050');
    
    // Change bit depth
    await page.selectOption('#bit-depth-drum', '16');
    expect(await page.locator('#bit-depth-drum').inputValue()).toBe('16');
    
    // Change channels
    await page.selectOption('#channels-drum', 'mono');
    expect(await page.locator('#channels-drum').inputValue()).toBe('mono');
    
    // Test multisample conversion settings
    await page.click('#multisample-tab');
    
    await page.selectOption('#sample-rate-multi', '11025');
    expect(await page.locator('#sample-rate-multi').inputValue()).toBe('11025');
    
    await page.selectOption('#bit-depth-multi', '8');
    expect(await page.locator('#bit-depth-multi').inputValue()).toBe('8');
  });

  test('should show advanced settings modal', async ({ page }) => {
    // Test drum advanced settings
    await expect(page.locator('#drum-advanced-btn')).toBeVisible();
    await page.click('#drum-advanced-btn');
    
    // Should open modal
    await expect(page.locator('#drum-advanced-modal')).toBeVisible();
    
    // Check for advanced settings controls
    await expect(page.locator('#drum-preset-velocity-sensitivity')).toBeVisible();
    await expect(page.locator('#drum-preset-volume')).toBeVisible();
    
    // Close modal
    await page.click('#drum-advanced-modal .btn-close');
    await expect(page.locator('#drum-advanced-modal')).not.toBeVisible();
    
    // Test multisample advanced settings
    await page.click('#multisample-tab');
    await expect(page.locator('#multisample-advanced-btn')).toBeVisible();
    await page.click('#multisample-advanced-btn');
    
    await expect(page.locator('#multisample-advanced-modal')).toBeVisible();
    await expect(page.locator('#multisample-preset-velocity-sensitivity')).toBeVisible();
    
    // Close modal
    await page.click('#multisample-advanced-modal .btn-close');
    await expect(page.locator('#multisample-advanced-modal')).not.toBeVisible();
  });

  test('should handle session persistence', async ({ page }) => {
    // Fill in some form data
    await page.fill('#preset-name-drum', 'Test Session');
    await page.selectOption('#sample-rate-drum', '22050');
    
    // Switch tabs and back
    await page.click('#multisample-tab');
    await page.click('#drum-tab');
    
    // Data should be preserved
    expect(await page.locator('#preset-name-drum').inputValue()).toBe('Test Session');
    expect(await page.locator('#sample-rate-drum').inputValue()).toBe('22050');
  });

  test('should display patch size information when available', async ({ page }) => {
    // Check for patch size indicator elements
    await expect(page.locator('#drum-patch-size')).toBeAttached();
    
    // Switch to multisample tab
    await page.click('#multisample-tab');
    await expect(page.locator('#multi-patch-size')).toBeAttached();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test with invalid file types (we can't actually upload but can test the UI)
    // The file input should have accept attribute for audio files
    const drumFileInput = page.locator('#sample-1');
    const acceptAttr = await drumFileInput.getAttribute('accept');
    expect(acceptAttr).toBeTruthy();
    
    // Multisample file input should also have accept attribute
    await page.click('#multisample-tab');
    const multiFileInput = page.locator('#multisample-file-input');
    const multiAcceptAttr = await multiFileInput.getAttribute('accept');
    expect(multiAcceptAttr).toBeTruthy();
  });
});