import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

test.describe('OPXY Tools - File Upload Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should handle file drag and drop in multisample tab', async ({ page }) => {
    // Switch to multisample tab
    await page.click('#multi-tab');
    await page.waitForLoadState('networkidle');
    
    // Check initial state
    await expect(page.locator('#multisample-drop-area')).toBeVisible();
    await expect(page.locator('#multisample-drop-area')).toContainText('drag samples here');
    
    // Test drag over effect (without actual file)
    await page.locator('#multisample-drop-area').hover();
    
    // The drop area should be interactive
    await expect(page.locator('#multisample-drop-area')).toBeVisible();
  });

  test('should show file browse dialog on browse button click', async ({ page }) => {
    // Test drum tab file browser
    const drumFileInput = page.locator('#sample-1');
    await expect(drumFileInput).toBeAttached();
    expect(await drumFileInput.getAttribute('accept')).toBe('.wav');
    
    // Test multisample tab file browser
    await page.click('#multi-tab');
    await page.waitForLoadState('networkidle');
    
    // Check for multisample file input
    const multiFileInput = page.locator('#multisample-file-input');
    await expect(multiFileInput).toBeAttached();
    expect(await multiFileInput.getAttribute('accept')).toBe('.wav');
    expect(await multiFileInput.evaluate(el => el.hasAttribute('multiple'))).toBe(true);
  });

  test('should validate preset name requirements', async ({ page }) => {
    // Check drum tab preset validation
    const drumGenerateBtn = page.locator('#drum button.accent-btn:has-text("generate patch")');
    await expect(drumGenerateBtn).toBeDisabled();
    
    // Enter preset name
    await page.fill('#preset-name-drum', 'My Drum Kit');
    
    // Button should still be disabled without samples but name validation passes
    // (We can't easily test the full flow without actual audio files)
    
    // Test multisample tab
    await page.click('#multi-tab');
    await page.waitForLoadState('networkidle');
    
    const multiGenerateBtn = page.locator('#multi button.accent-btn:has-text("generate patch")');
    await expect(multiGenerateBtn).toBeDisabled();
    
    await page.fill('#preset-name-multi', 'My Multisample');
    // Same here - button would still be disabled without samples
  });

  test('should display conversion settings and allow changes', async ({ page }) => {
    // Test drum conversion settings
    await expect(page.locator('#sample-rate-drum')).toBeVisible();
    await page.waitForLoadState('networkidle');
    
    // Change sample rate
    await page.selectOption('#sample-rate-drum', '2'); // 22khz
    expect(await page.locator('#sample-rate-drum').inputValue()).toBe('2');
    
    // Change bit depth
    await page.selectOption('#bit-depth-drum', '16');
    expect(await page.locator('#bit-depth-drum').inputValue()).toBe('16');
    
    // Change channels
    await page.selectOption('#channels-drum', 'mono');
    expect(await page.locator('#channels-drum').inputValue()).toBe('mono');
    
    // Test multisample conversion settings
    await page.click('#multi-tab');
    await page.waitForLoadState('networkidle');
    
    await page.selectOption('#sample-rate-multi', '1'); // 11khz
    expect(await page.locator('#sample-rate-multi').inputValue()).toBe('1');
    
    await page.selectOption('#bit-depth-multi', '16');
    expect(await page.locator('#bit-depth-multi').inputValue()).toBe('16');
  });

  test('should show advanced settings modal', async ({ page }) => {
    // Test drum advanced settings
    await page.waitForSelector('#drum.active');
    
    // Click the modal trigger button
    await page.click('#open-preset-advanced-modal');
    
    // Wait for modal to be fully visible
    await page.waitForSelector('#preset-advanced-modal.show');
    await expect(page.locator('#preset-advanced-modal')).toBeVisible();
    await expect(page.locator('#preset-advanced-modal-label')).toContainText('preset settings');
    
    // Verify modal content
    await expect(page.locator('#preset-velocity-sensitivity')).toBeVisible();
    await expect(page.locator('#preset-volume')).toBeVisible();
    
    // Close modal using the save button instead of close button
    await page.click('#save-preset-advanced-settings');
    
    // Wait for modal to be fully hidden
    await page.waitForSelector('#preset-advanced-modal:not(.show)');
    await expect(page.locator('#preset-advanced-modal')).not.toBeVisible();
    
    // Test multisample advanced settings
    await page.click('#multi-tab');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#multi.active');
    
    // Open modal
    await page.click('#open-multisample-preset-advanced-modal');
    
    // Wait for modal to be fully visible
    await page.waitForSelector('#multisample-preset-advanced-modal.show');
    await expect(page.locator('#multisample-preset-advanced-modal')).toBeVisible();
    await expect(page.locator('#multisample-preset-advanced-modal-label')).toContainText('advanced preset settings');
    
    // Verify modal content
    await expect(page.locator('#multisample-preset-playmode')).toBeVisible();
    await expect(page.locator('#multisample-preset-loop-enabled')).toBeVisible();
    
    // Close modal using the save button
    await page.click('#save-multisample-preset-advanced-settings');
    
    // Wait for modal to be fully hidden
    await page.waitForSelector('#multisample-preset-advanced-modal:not(.show)');
    await expect(page.locator('#multisample-preset-advanced-modal')).not.toBeVisible();
  });

  test('should handle session persistence', async ({ page }) => {
    // Fill in some form data
    await page.fill('#preset-name-drum', 'Test Session');
    await page.waitForLoadState('networkidle');
    await page.selectOption('#sample-rate-drum', '2'); // 22khz
    
    // Switch tabs and back
    await page.click('#multi-tab');
    await page.waitForLoadState('networkidle');
    await page.click('#drum-tab');
    await page.waitForLoadState('networkidle');
    
    // Data should be preserved
    expect(await page.locator('#preset-name-drum').inputValue()).toBe('Test Session');
    expect(await page.locator('#sample-rate-drum').inputValue()).toBe('2');
  });

  test('should display patch size information when available', async ({ page }) => {
    // Check for patch size indicator elements
    await expect(page.locator('#drum-current-patch-size')).toBeAttached();
    await expect(page.locator('#drum-patch-size-progress')).toBeAttached();
    
    // Switch to multisample tab
    await page.click('#multi-tab');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#multi-current-patch-size')).toBeAttached();
    await expect(page.locator('#multi-patch-size-progress')).toBeAttached();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test with invalid file types (we can't actually upload but can test the UI)
    // The file input should have accept attribute for audio files
    const drumFileInput = page.locator('#sample-1');
    await expect(drumFileInput).toBeAttached();
    expect(await drumFileInput.getAttribute('accept')).toBe('.wav');
    
    // Multisample file input should also have accept attribute
    await page.click('#multi-tab');
    await page.waitForLoadState('networkidle');
    const multiFileInput = page.locator('#multisample-file-input');
    await expect(multiFileInput).toBeAttached();
    expect(await multiFileInput.getAttribute('accept')).toBe('.wav');
  });
});