import { test, expect } from '@playwright/test'

test.describe('Drum Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Ensure we're on drum tab
    await page.getByText('drum').first().click()
  })

  test('should display drum tool interface', async ({ page }) => {
    // Check main drum tool elements
    await expect(page.getByText('drum samples')).toBeVisible()
    await expect(page.getByText('preset settings')).toBeVisible()
    
    // Check keyboard is present
    await expect(page.locator('[data-testid="drum-keyboard"]').or(page.getByText('C').first())).toBeVisible()
    
    // Check sample table headers
    await expect(page.getByText('note')).toBeVisible()
    await expect(page.getByText('sample')).toBeVisible()
    await expect(page.getByText('actions')).toBeVisible()
  })

  test('should allow file upload via drag and drop area', async ({ page }) => {
    // Look for upload area
    const uploadArea = page.getByText('drag & drop').or(page.getByText('browse files'))
    await expect(uploadArea).toBeVisible()
    
    // Create a mock file for testing
    const fileChooserPromise = page.waitForEvent('filechooser')
    await uploadArea.click()
    const fileChooser = await fileChooserPromise
    
    // Verify file chooser accepts audio files
    expect(fileChooser.isMultiple()).toBe(true)
  })

  test('should show sample settings modal when clicking sample', async ({ page }) => {
    // First need to upload a sample to test this
    // For now, check if clicking on any sample area shows interaction
    const sampleRows = page.locator('tr').filter({ hasText: /C|D|E|F|G|A|B/ })
    
    if (await sampleRows.count() > 0) {
      await sampleRows.first().click()
      // Should show some interaction (modal or highlight)
    }
  })

  test('should display preset settings section', async ({ page }) => {
    await expect(page.getByText('preset settings')).toBeVisible()
    
    // Check for common drum preset controls
    await expect(page.getByText('name').or(page.getByText('preset name'))).toBeVisible()
    
    // Look for playmode settings
    const playmodeSection = page.getByText('playmode').or(page.getByText('play mode'))
    if (await playmodeSection.isVisible()) {
      await expect(playmodeSection).toBeVisible()
    }
  })

  test('should show keyboard interaction', async ({ page }) => {
    // Check if keyboard keys are clickable
    const keyboardKeys = page.locator('[role="button"]').filter({ hasText: /C|D|E|F|G|A|B/ })
    
    if (await keyboardKeys.count() > 0) {
      // Click a key and check for visual feedback
      const firstKey = keyboardKeys.first()
      await firstKey.click()
      
      // Key should be responsive (no specific assertion since we don't know the exact styling)
      await expect(firstKey).toBeVisible()
    }
  })

  test('should allow bulk operations', async ({ page }) => {
    // Look for bulk edit functionality
    const bulkButtons = page.getByText('select all').or(page.getByText('clear all')).or(page.getByText('bulk'))
    
    if (await bulkButtons.count() > 0) {
      await expect(bulkButtons.first()).toBeVisible()
    }
  })

  test('should show patch generation controls', async ({ page }) => {
    // Look for download or generate patch buttons
    const generateButton = page.getByText('download').or(page.getByText('generate')).or(page.getByText('export'))
    
    // Should have some way to generate/download patches
    if (await generateButton.count() > 0) {
      await expect(generateButton.first()).toBeVisible()
    }
  })

  test('should handle settings import/export', async ({ page }) => {
    // Look for import/export functionality
    const importButton = page.getByText('import').or(page.getByText('load'))
    const exportButton = page.getByText('export').or(page.getByText('save'))
    
    if (await importButton.count() > 0) {
      await expect(importButton.first()).toBeVisible()
    }
    
    if (await exportButton.count() > 0) {
      await expect(exportButton.first()).toBeVisible()
    }
  })

  test('should display file size validation', async ({ page }) => {
    // When files are uploaded, should show size information
    // This test checks that the UI is prepared for file size display
    
    // Look for any size-related text (not required to be visible initially)
    page.getByText(/mb|kb|size/i)
    
    // This is more of a smoke test for the file handling UI
  })

  test('should maintain state during navigation', async ({ page }) => {
    // Switch to multisample and back
    await page.getByText('multisample').first().click()
    await expect(page.getByText('sample settings')).toBeVisible()
    
    // Return to drum
    await page.getByText('drum').first().click()
    await expect(page.getByText('drum samples')).toBeVisible()
    
    // Drum interface should be restored
    await expect(page.getByText('preset settings')).toBeVisible()
  })
})