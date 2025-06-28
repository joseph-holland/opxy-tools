import { test, expect } from '@playwright/test';

test.describe('Multisample Tool Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Switch to multisample tab
    await page.click('#multi-tab');
  });

  test('should display multisample tool interface correctly', async ({ page }) => {
    // Check that multisample tab is active
    await expect(page.locator('#multi-tab')).toHaveClass(/active/);
    
    // Check for multisample tool specific elements
    await expect(page.locator('#preset-name-multi')).toBeVisible();
    await expect(page.locator('#sample-rate-multi')).toBeVisible();
    await expect(page.locator('#bit-depth-multi')).toBeVisible();
    
    // Check for file management buttons
    await expect(page.locator('#multisample-browse-btn')).toBeVisible();
    await expect(page.locator('#multisample-record-btn')).toBeVisible();
    await expect(page.locator('#multisample-clear-all-btn')).toBeVisible();
    
    // Check for drop area
    await expect(page.locator('#multisample-drop-area')).toBeVisible();
    await expect(page.locator('#multisample-drop-label')).toContainText('drag samples here');
    
    // Check for generate patch button
    await expect(page.locator('#generate-multisample-patch')).toBeVisible();
    await expect(page.locator('#generate-multisample-patch')).toBeDisabled();
  });

  test('should display multisample how-to-use section', async ({ page }) => {
    // Check for how-to-use section
    await expect(page.locator('[data-bs-target="#howToUseCollapse"]')).toContainText('how to use');
    
    // Content should be visible by default
    await expect(page.locator('#howToUseCollapse')).toHaveClass(/show/);
    
    // Should contain relevant information
    const howToUseText = await page.locator('#howToUseCollapse p').textContent();
    expect(howToUseText).toContain('drag and drop samples');
    expect(howToUseText).toContain('auto-assigned to notes');
    expect(howToUseText).toContain('generate patch');
  });

  test('should display sample requirements section', async ({ page }) => {
    // Check for sample requirements section
    await expect(page.locator('[data-bs-target="#sampleReqCollapse"]')).toContainText('sample requirements');
    
    // Should contain requirements list
    const reqSection = page.locator('#sampleReqCollapse');
    await expect(reqSection).toContainText('20 seconds max per sample');
    await expect(reqSection).toContainText('24 samples max per multisample preset');
    await expect(reqSection).toContainText('multiple velocities are not supported');
    await expect(reqSection).toContainText('file names should end with either a midi note number');
  });

  test('should open and close multisample preset settings modal', async ({ page }) => {
    // Click the preset settings button
    await page.click('#open-multisample-preset-advanced-modal');
    
    // Wait for modal to be fully visible
    await page.waitForSelector('#multisample-preset-advanced-modal.show');
    await expect(page.locator('#multisample-preset-advanced-modal')).toBeVisible();
    await expect(page.locator('#multisample-preset-advanced-modal-label')).toContainText('advanced preset settings');
    
    // Check for multisample-specific settings
    await expect(page.locator('#multisample-preset-playmode')).toBeVisible();
    await expect(page.locator('#multisample-preset-loop-enabled')).toBeVisible();
    await expect(page.locator('#multisample-preset-velocity-sensitivity')).toBeVisible();
    await expect(page.locator('#multisample-preset-volume')).toBeVisible();
    
    // Check for advanced settings like envelopes
    await expect(page.locator('#multisample-amp-attack')).toBeVisible();
    await expect(page.locator('#multisample-amp-decay')).toBeVisible();
    await expect(page.locator('#multisample-filter-attack')).toBeVisible();
    await expect(page.locator('#multisample-filter-decay')).toBeVisible();
    
    // Close modal using the save button instead of dismiss button
    await page.click('#save-multisample-preset-advanced-settings');
    
    // Wait for modal to be fully hidden
    await page.waitForSelector('#multisample-preset-advanced-modal:not(.show)');
    await expect(page.locator('#multisample-preset-advanced-modal')).not.toBeVisible();
  });

  test('should update multisample preset settings', async ({ page }) => {
    // Open preset settings modal
    await page.click('#open-multisample-preset-advanced-modal');
    
    // Change playmode
    await page.selectOption('#multisample-preset-playmode', 'mono');
    
    // Enable loop
    await page.check('#multisample-preset-loop-enabled');
    
    // Change velocity sensitivity
    await page.fill('#multisample-preset-velocity-sensitivity-number', '75');
    
    // Change amp envelope settings
    await page.fill('#multisample-amp-attack-number', '25');
    await page.fill('#multisample-amp-release-number', '50');
    
    // Save settings
    await page.click('#save-multisample-preset-advanced-settings');
    
    // Modal should close
    await expect(page.locator('#multisample-preset-advanced-modal')).not.toBeVisible();
    
    // Reopen modal to verify settings were saved
    await page.click('#open-multisample-preset-advanced-modal');
    
    await expect(page.locator('#multisample-preset-playmode')).toHaveValue('mono');
    await expect(page.locator('#multisample-preset-loop-enabled')).toBeChecked();
    await expect(page.locator('#multisample-preset-velocity-sensitivity-number')).toHaveValue('75');
    await expect(page.locator('#multisample-amp-attack-number')).toHaveValue('25');
    await expect(page.locator('#multisample-amp-release-number')).toHaveValue('50');
  });

  test('should display patch size indicator for multisample', async ({ page }) => {
    // Check for patch size elements
    await expect(page.locator('#multi-current-patch-size')).toBeVisible();
    await expect(page.locator('#multi-patch-size-progress')).toBeVisible();
    await expect(page.locator('#multi-patch-size-status')).toBeVisible();
    
    // Initial size should be 0.0 MB
    await expect(page.locator('#multi-current-patch-size')).toContainText('0.0 MB');
    await expect(page.locator('#multi-patch-size-status')).toContainText('plenty of space remaining');
    
    // Should show maximum size limit
    const patchSizeText = await page.locator('#multi-current-patch-size').textContent();
    expect(patchSizeText).toContain('/ 8 MB');
  });

  test('should allow multisample preset name editing', async ({ page }) => {
    const presetNameInput = page.locator('#preset-name-multi');
    
    // Check initial value
    await expect(presetNameInput).toHaveValue('my preset name');
    
    // Change preset name
    await presetNameInput.fill('My Custom Multisample');
    await expect(presetNameInput).toHaveValue('My Custom Multisample');
  });

  test('should allow multisample audio encoding settings changes', async ({ page }) => {
    // Test sample rate dropdown
    await page.selectOption('#sample-rate-multi', '2'); // 22khz
    await expect(page.locator('#sample-rate-multi')).toHaveValue('2');
    
    // Test bit depth dropdown
    await page.selectOption('#bit-depth-multi', '16');
    await expect(page.locator('#bit-depth-multi')).toHaveValue('16');
    
    // Test channels dropdown
    await page.selectOption('#channels-multi', 'mono');
    await expect(page.locator('#channels-multi')).toHaveValue('mono');
  });

  test('should show file management controls', async ({ page }) => {
    // Browse button should be visible and enabled
    await expect(page.locator('#multisample-browse-btn')).toBeVisible();
    await expect(page.locator('#multisample-browse-btn')).not.toBeDisabled();
    await expect(page.locator('#multisample-browse-btn')).toContainText('browse');
    
    // Record button should be visible and enabled
    await expect(page.locator('#multisample-record-btn')).toBeVisible();
    await expect(page.locator('#multisample-record-btn')).not.toBeDisabled();
    await expect(page.locator('#multisample-record-btn')).toContainText('record');
    
    // Clear all button should be visible but disabled initially
    await expect(page.locator('#multisample-clear-all-btn')).toBeVisible();
    await expect(page.locator('#multisample-clear-all-btn')).toBeDisabled();
    await expect(page.locator('#multisample-clear-all-btn')).toContainText('clear all');
    
    // Hidden file input should exist
    await expect(page.locator('#multisample-file-input')).toBeAttached();
    await expect(page.locator('#multisample-file-input')).not.toBeVisible();
  });

  test('should show import settings functionality', async ({ page }) => {
    // Open preset settings modal
    await page.click('#open-multisample-preset-advanced-modal');
    
    // Check for import settings button
    await expect(page.locator('#import-multisample-settings-btn')).toBeVisible();
    await expect(page.locator('#import-multisample-settings-btn')).toContainText('import settings');
    
    // Check that hidden file input exists
    await expect(page.locator('#import-multisample-settings-input')).toBeAttached();
    await expect(page.locator('#import-multisample-settings-input')).not.toBeVisible();
  });

  test('should display tuning and portamento settings', async ({ page }) => {
    // Open preset settings modal
    await page.click('#open-multisample-preset-advanced-modal');
    
    // Check for tuning settings
    await expect(page.locator('#multisample-preset-tuning-root')).toBeVisible();
    await expect(page.locator('#multisample-preset-transpose')).toBeVisible();
    
    // Check for portamento settings
    await expect(page.locator('#multisample-preset-portamento-type')).toBeVisible();
    await expect(page.locator('#multisample-preset-portamento-amount')).toBeVisible();
    
    // Test portamento type options
    const portamentoOptions = await page.locator('#multisample-preset-portamento-type option').allTextContents();
    expect(portamentoOptions).toContain('linear');
    expect(portamentoOptions).toContain('exponential');
  });

  test('should display filter settings', async ({ page }) => {
    // Open preset settings modal
    await page.click('#open-multisample-preset-advanced-modal');
    
    // Check for filter settings
    await expect(page.locator('#multisample-preset-highpass')).toBeVisible();
    await expect(page.locator('#multisample-preset-highpass-number')).toBeVisible();
    
    // Check for stereo width
    await expect(page.locator('#multisample-preset-width')).toBeVisible();
    await expect(page.locator('#multisample-preset-width-number')).toBeVisible();
  });

  test('should show envelope sections with proper labels', async ({ page }) => {
    // Open preset settings modal
    await page.click('#open-multisample-preset-advanced-modal');
    
    // Check for envelope section headers
    await expect(page.locator('h6').filter({ hasText: 'amp envelope' })).toBeVisible();
    await expect(page.locator('h6').filter({ hasText: 'filter envelope' })).toBeVisible();
    
    // Check that both envelopes have ADSR controls
    const adsrControls = ['attack', 'decay', 'sustain', 'release'];
    
    for (const control of adsrControls) {
      await expect(page.locator(`#multisample-amp-${control}`)).toBeVisible();
      await expect(page.locator(`#multisample-filter-${control}`)).toBeVisible();
    }
  });

  test('should handle collapsible sections', async ({ page }) => {
    // Test how to use section
    const howToUseChevron = page.locator('[data-bs-target="#howToUseCollapse"]');
    await howToUseChevron.click();
    
    // Wait for collapse animation to finish
    await page.waitForTimeout(500); // Bootstrap collapse animation takes 350ms
    await expect(page.locator('#howToUseCollapse')).not.toHaveClass(/show/);
    
    // Click again to expand
    await howToUseChevron.click();
    await page.waitForTimeout(500); // Wait for expand animation
    await expect(page.locator('#howToUseCollapse')).toHaveClass(/show/);
    
    // Test sample requirements section
    const reqChevron = page.locator('[data-bs-target="#sampleReqCollapse"]');
    await reqChevron.click();
    await page.waitForTimeout(500);
    await expect(page.locator('#sampleReqCollapse')).not.toHaveClass(/show/);
    
    await reqChevron.click();
    await page.waitForTimeout(500);
    await expect(page.locator('#sampleReqCollapse')).toHaveClass(/show/);
  });
});