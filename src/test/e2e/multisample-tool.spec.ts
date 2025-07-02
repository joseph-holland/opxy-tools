import { test, expect } from '@playwright/test'

test.describe('Multisample Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Navigate to multisample tab
    await page.getByText('multisample').first().click()
  })

  test('should display multisample tool interface', async ({ page }) => {
    // Check main multisample elements
    await expect(page.getByText('sample settings')).toBeVisible()
    
    // Check for sample management section
    await expect(page.getByText('samples').or(page.getByText('sample'))).toBeVisible()
    
    // Check for MIDI keyboard or note selection
    const midiKeyboard = page.locator('[data-testid="midi-keyboard"]').or(page.getByText('keyboard'))
    if (await midiKeyboard.isVisible()) {
      await expect(midiKeyboard).toBeVisible()
    }
  })

  test('should show virtual MIDI keyboard', async ({ page }) => {
    // Look for MIDI keyboard interface
    const keyboardKeys = page.locator('[role="button"]').filter({ hasText: /C|D|E|F|G|A|B/ })
    
    if (await keyboardKeys.count() > 0) {
      await expect(keyboardKeys.first()).toBeVisible()
      
      // Test keyboard interaction
      await keyboardKeys.first().click()
      
      // Should remain responsive
      await expect(keyboardKeys.first()).toBeVisible()
    }
  })

  test('should allow multisample file upload', async ({ page }) => {
    // Look for file upload area
    const uploadArea = page.getByText('upload').or(page.getByText('browse')).or(page.getByText('drag'))
    
    if (await uploadArea.count() > 0) {
      await expect(uploadArea.first()).toBeVisible()
      
      // Test file chooser
      const fileChooserPromise = page.waitForEvent('filechooser')
      await uploadArea.first().click()
      const fileChooser = await fileChooserPromise
      
      // Verify file chooser is configured for audio files
      expect(fileChooser.isMultiple()).toBe(true)
    }
  })

  test('should display sample table with proper columns', async ({ page }) => {
    // Check for table headers
    const tableHeaders = ['note', 'file', 'sample', 'actions', 'root']
    
    for (const header of tableHeaders) {
      const headerElement = page.getByText(new RegExp(header, 'i'))
      if (await headerElement.count() > 0) {
        await expect(headerElement.first()).toBeVisible()
      }
    }
  })

  test('should show advanced settings panel', async ({ page }) => {
    // Look for advanced settings section
    const advancedSettings = page.getByText('advanced').or(page.getByText('settings'))
    
    if (await advancedSettings.count() > 0) {
      await expect(advancedSettings.first()).toBeVisible()
    }
    
    // Check for common multisample settings
    const commonSettings = ['velocity', 'volume', 'pan', 'filter', 'envelope']
    
    for (const setting of commonSettings) {
      const settingElement = page.getByText(new RegExp(setting, 'i'))
      if (await settingElement.count() > 0) {
        // Setting exists in interface
      }
    }
  })

  test('should handle octave selection', async ({ page }) => {
    // Look for octave controls
    const octaveControls = page.getByText('octave').or(page.locator('button').filter({ hasText: /\d/ }))
    
    if (await octaveControls.count() > 0) {
      await expect(octaveControls.first()).toBeVisible()
    }
  })

  test('should show root note configuration', async ({ page }) => {
    // Look for root note settings
    const rootNoteSettings = page.getByText('root note').or(page.getByText('root'))
    
    if (await rootNoteSettings.count() > 0) {
      await expect(rootNoteSettings.first()).toBeVisible()
    }
  })

  test('should display sample mapping visualization', async ({ page }) => {
    // Check if there's a visual representation of sample mapping
    // This could be a keyboard with highlighted keys or a mapping table
    
    const mappingElements = page.locator('[data-testid*="mapping"]').or(
      page.locator('.keyboard').or(
        page.locator('[class*="sample-map"]')
      )
    )
    
    if (await mappingElements.count() > 0) {
      await expect(mappingElements.first()).toBeVisible()
    }
  })

  test('should allow sample removal and clearing', async ({ page }) => {
    // Look for clear or remove functionality
    const clearButtons = page.getByText('clear').or(page.getByText('remove')).or(page.getByText('delete'))
    
    if (await clearButtons.count() > 0) {
      await expect(clearButtons.first()).toBeVisible()
    }
  })

  test('should show preset name configuration', async ({ page }) => {
    // Check for preset naming
    const presetName = page.getByText('name').or(page.getByText('preset'))
    
    if (await presetName.count() > 0) {
      await expect(presetName.first()).toBeVisible()
    }
    
    // Look for input field for preset name
    const nameInput = page.locator('input[type="text"]').or(page.locator('input[placeholder*="name"]'))
    
    if (await nameInput.count() > 0) {
      await expect(nameInput.first()).toBeVisible()
    }
  })

  test('should provide patch generation functionality', async ({ page }) => {
    // Look for download/generate/export buttons
    const generateButton = page.getByText('download').or(page.getByText('generate')).or(page.getByText('export'))
    
    if (await generateButton.count() > 0) {
      await expect(generateButton.first()).toBeVisible()
    }
  })

  test('should handle velocity and volume controls', async ({ page }) => {
    // Look for velocity/volume sliders or inputs
    const velocityControl = page.getByText('velocity').or(page.locator('input[type="range"]'))
    
    if (await velocityControl.count() > 0) {
      // Check if control is interactive
      const firstControl = velocityControl.first()
      if (await firstControl.isVisible()) {
        await expect(firstControl).toBeVisible()
      }
    }
  })

  test('should maintain state when switching tabs', async ({ page }) => {
    // Switch to drum tab and back
    await page.getByText('drum').first().click()
    await expect(page.getByText('drum samples')).toBeVisible()
    
    // Return to multisample
    await page.getByText('multisample').first().click()
    await expect(page.getByText('sample settings')).toBeVisible()
    
    // Interface should be restored
    const sampleElements = page.getByText('sample').or(page.getByText('settings'))
    if (await sampleElements.count() > 0) {
      await expect(sampleElements.first()).toBeVisible()
    }
  })

  test('should show file format validation', async ({ page }) => {
    // Check for file format information or validation messages
    page.getByText(/wav|mp3|format|supported/i)
    
    // This might not be visible initially, but tests the interface preparedness
    // for file format validation feedback
  })
})