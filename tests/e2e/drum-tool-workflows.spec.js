import { test, expect } from '@playwright/test';

test.describe('Drum Tool Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Ensure we're on the drum tab
    await page.click('#drum-tab');
  });

  test('should display drum tool interface correctly', async ({ page }) => {
    // Check that drum tab is active
    await expect(page.locator('#drum-tab')).toHaveClass(/active/);
    
    // Check for drum tool specific elements
    await expect(page.locator('#preset-name-drum')).toBeVisible();
    await expect(page.locator('#sample-rate-drum')).toBeVisible();
    await expect(page.locator('#bit-depth-drum')).toBeVisible();
    
    // Check for sample slots (24 drum samples)
    for (let i = 1; i <= 24; i++) {
      await expect(page.locator(`#sample-${i}`)).toBeAttached();
      await expect(page.locator(`#search-${i}`)).toBeVisible();
    }
    
    // Check for generate patch button
    await expect(page.locator('.accent-btn')).toContainText('generate patch');
  });

  test('should open and close drum preset settings modal', async ({ page }) => {
    // Click the preset settings button
    await page.click('#open-preset-advanced-modal');
    
    // Modal should be visible
    await expect(page.locator('#preset-advanced-modal')).toBeVisible();
    await expect(page.locator('#preset-advanced-modal-label')).toContainText('preset settings');
    
    // Check for preset setting controls
    await expect(page.locator('#preset-playmode')).toBeVisible();
    await expect(page.locator('#preset-transpose')).toBeVisible();
    await expect(page.locator('#preset-velocity-sensitivity')).toBeVisible();
    await expect(page.locator('#preset-volume')).toBeVisible();
    
    // Close modal with cancel button
    await page.click('button[data-bs-dismiss="modal"]');
    await expect(page.locator('#preset-advanced-modal')).not.toBeVisible();
  });

  test('should update drum preset settings', async ({ page }) => {
    // Open preset settings modal
    await page.click('#open-preset-advanced-modal');
    
    // Change playmode
    await page.selectOption('#preset-playmode', 'mono');
    
    // Change transpose value
    await page.fill('#preset-transpose-number', '12');
    
    // Change velocity sensitivity
    await page.fill('#preset-velocity-sensitivity-number', '50');
    
    // Save settings
    await page.click('#save-preset-advanced-settings');
    
    // Modal should close
    await expect(page.locator('#preset-advanced-modal')).not.toBeVisible();
    
    // Reopen modal to verify settings were saved
    await page.click('#open-preset-advanced-modal');
    
    await expect(page.locator('#preset-playmode')).toHaveValue('mono');
    await expect(page.locator('#preset-transpose-number')).toHaveValue('12');
    await expect(page.locator('#preset-velocity-sensitivity-number')).toHaveValue('50');
  });

  test('should open bulk edit modal when samples are loaded', async ({ page }) => {
    // Initially bulk edit button should be disabled
    await expect(page.locator('#drum-bulk-edit-btn')).toBeDisabled();
    
    // Note: In a real test, we would load a sample file here
    // For now, we'll just test that the modal structure exists
    
    // Check that bulk edit modal exists
    await expect(page.locator('#bulk-edit-modal')).toBeAttached();
    await expect(page.locator('#bulk-edit-modal-label')).toContainText('bulk edit sample settings');
  });

  test('should display drum keyboard for sample preview', async ({ page }) => {
    // Check for keyboard elements
    await expect(page.locator('#drum-keyboard')).toBeVisible();
    
    // Check for specific keys
    await expect(page.locator('.key-a')).toBeVisible();
    await expect(page.locator('.key-s')).toBeVisible();
    await expect(page.locator('.key-d')).toBeVisible();
    await expect(page.locator('.key-w')).toBeVisible();
    await expect(page.locator('.key-e')).toBeVisible();
    
    // Check for octave controls
    await expect(page.locator('.octave-controls')).toBeVisible();
  });

  test('should show sample actions for each drum slot', async ({ page }) => {
    // Check first sample slot actions
    await expect(page.locator('#search-1')).toBeVisible();
    await expect(page.locator('#record-1')).toBeVisible();
    await expect(page.locator('#play-1')).toBeVisible();
    await expect(page.locator('#clear-1')).toBeVisible();
    await expect(page.locator('#adv-1')).toBeVisible();
    
    // Play and clear buttons should be disabled initially
    await expect(page.locator('#play-1')).toBeDisabled();
    await expect(page.locator('#clear-1')).toBeDisabled();
  });

  test('should display patch size indicator', async ({ page }) => {
    // Check for patch size elements
    await expect(page.locator('#drum-current-patch-size')).toBeVisible();
    await expect(page.locator('#drum-patch-size-progress')).toBeVisible();
    await expect(page.locator('#drum-patch-size-status')).toBeVisible();
    
    // Initial size should be 0.0 MB
    await expect(page.locator('#drum-current-patch-size')).toContainText('0.0 MB');
    await expect(page.locator('#drum-patch-size-status')).toContainText('plenty of space remaining');
  });

  test('should allow preset name editing', async ({ page }) => {
    const presetNameInput = page.locator('#preset-name-drum');
    
    // Check initial value
    await expect(presetNameInput).toHaveValue('my preset name');
    
    // Change preset name
    await presetNameInput.fill('My Custom Drum Kit');
    await expect(presetNameInput).toHaveValue('My Custom Drum Kit');
  });

  test('should allow audio encoding settings changes', async ({ page }) => {
    // Test sample rate dropdown
    await page.selectOption('#sample-rate-drum', '2'); // 22khz
    await expect(page.locator('#sample-rate-drum')).toHaveValue('2');
    
    // Test bit depth dropdown
    await page.selectOption('#bit-depth-drum', '16');
    await expect(page.locator('#bit-depth-drum')).toHaveValue('16');
    
    // Test channels dropdown
    await page.selectOption('#channels-drum', 'mono');
    await expect(page.locator('#channels-drum')).toHaveValue('mono');
  });

  test('should show import settings functionality', async ({ page }) => {
    // Open preset settings modal
    await page.click('#open-preset-advanced-modal');
    
    // Check for import settings button
    await expect(page.locator('#import-drum-settings-btn')).toBeVisible();
    await expect(page.locator('#import-drum-settings-btn')).toContainText('import settings');
    
    // Check that hidden file input exists
    await expect(page.locator('#import-drum-settings-input')).toBeAttached();
    await expect(page.locator('#import-drum-settings-input')).not.toBeVisible();
  });

  test('should handle octave controls', async ({ page }) => {
    // Check octave control elements
    const octaveDown = page.locator('.octave-kbd').first();
    const octaveUp = page.locator('.octave-kbd').last();
    
    await expect(octaveDown).toBeVisible();
    await expect(octaveUp).toBeVisible();
    
    // These should be clickable
    await expect(octaveDown).not.toBeDisabled();
    await expect(octaveUp).not.toBeDisabled();
  });

  test('should display clear all button', async ({ page }) => {
    const clearAllBtn = page.locator('#drum-clear-all-btn');
    
    // Should be visible but disabled initially
    await expect(clearAllBtn).toBeVisible();
    await expect(clearAllBtn).toBeDisabled();
    await expect(clearAllBtn).toContainText('clear all');
  });
});