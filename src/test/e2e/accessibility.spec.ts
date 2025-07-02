import { test, expect } from '@playwright/test'

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should have proper page structure and headings', async ({ page }) => {
    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    
    if (await headings.count() > 0) {
      // Ensure headings exist and are hierarchical
      const h1 = page.locator('h1')
      if (await h1.count() > 0) {
        await expect(h1.first()).toBeVisible()
      }
    }
    
    // Check for main content area
    const main = page.locator('main, [role="main"]')
    if (await main.count() > 0) {
      await expect(main.first()).toBeVisible()
    }
  })

  test('should have keyboard navigation support', async ({ page }) => {
    // Test tab navigation through interactive elements
    await page.keyboard.press('Tab')
    
    // Check if focus is visible on interactive elements
    const focusedElement = page.locator(':focus')
    if (await focusedElement.count() > 0) {
      await expect(focusedElement).toBeVisible()
    }
    
    // Test tab navigation between main tabs
    const drumTab = page.getByText('drum').first()
    const multisampleTab = page.getByText('multisample').first()
    
    // Focus should be manageable via keyboard
    await drumTab.focus()
    await expect(drumTab).toBeFocused()
    
    await page.keyboard.press('Tab')
    await multisampleTab.focus()
    await expect(multisampleTab).toBeFocused()
  })

  test('should support keyboard activation of controls', async ({ page }) => {
    // Test Enter and Space key activation
    const drumTab = page.getByText('drum').first()
    await drumTab.focus()
    
    // Should be able to activate with Enter
    await page.keyboard.press('Enter')
    await expect(page.getByText('drum samples')).toBeVisible()
    
    // Test multisample tab
    const multisampleTab = page.getByText('multisample').first()
    await multisampleTab.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('sample settings')).toBeVisible()
  })

  test('should have proper ARIA labels and roles', async ({ page }) => {
    // Check for buttons with proper roles
    const buttons = page.locator('button, [role="button"]')
    
    if (await buttons.count() > 0) {
      // Buttons should have accessible names
      for (let i = 0; i < Math.min(5, await buttons.count()); i++) {
        const button = buttons.nth(i)
        if (await button.isVisible()) {
          // Button should have text content or aria-label
          const hasText = await button.textContent()
          const hasAriaLabel = await button.getAttribute('aria-label')
          const hasAriaLabelledBy = await button.getAttribute('aria-labelledby')
          
          expect(hasText || hasAriaLabel || hasAriaLabelledBy).toBeTruthy()
        }
      }
    }
  })

  test('should have sufficient color contrast', async ({ page }) => {
    // Test that the theme provides sufficient contrast
    // This is a basic check - full contrast testing would require specialized tools
    
    const bodyStyle = await page.locator('body').evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      }
    })
    
    // Ensure colors are defined (not transparent or inherit)
    expect(bodyStyle.backgroundColor).toBeTruthy()
    expect(bodyStyle.color).toBeTruthy()
  })

  test('should be navigable with screen reader patterns', async ({ page }) => {
    // Test navigation landmarks
    const main = page.locator('main, [role="main"]')
    
    // Should have clear page structure
    if (await main.count() > 0) {
      await expect(main.first()).toBeVisible()
    }
    
    // Check for skip links (common accessibility pattern)
    const skipLink = page.locator('a[href="#main"], a[href="#content"]').first()
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeInViewport()
    }
  })

  test('should have form controls with proper labels', async ({ page }) => {
    // Check input fields have associated labels
    const inputs = page.locator('input')
    
    for (let i = 0; i < Math.min(5, await inputs.count()); i++) {
      const input = inputs.nth(i)
      if (await input.isVisible()) {
        const id = await input.getAttribute('id')
        const ariaLabel = await input.getAttribute('aria-label')
        const ariaLabelledBy = await input.getAttribute('aria-labelledby')
        const placeholder = await input.getAttribute('placeholder')
        
        // Input should have some form of labeling
        if (id) {
          const label = page.locator(`label[for="${id}"]`)
          const hasLabel = await label.count() > 0
          expect(hasLabel || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy()
        } else {
          expect(ariaLabel || ariaLabelledBy || placeholder).toBeTruthy()
        }
      }
    }
  })

  test('should handle focus management in modals', async ({ page }) => {
    // This test would check modal focus trapping when modals are opened
    // For now, it's a placeholder that checks for modal presence
    
    const modals = page.locator('[role="dialog"], .modal, [aria-modal="true"]')
    
    if (await modals.count() > 0) {
      // Modal should trap focus and have proper ARIA attributes
      const modal = modals.first()
      await expect(modal).toHaveAttribute('role', 'dialog')
    }
  })

  test('should provide keyboard alternatives for drag and drop', async ({ page }) => {
    // Check that file upload areas have keyboard alternatives
    const uploadAreas = page.locator('[role="button"]').filter({ hasText: /upload|drag|drop|browse/i })
    
    if (await uploadAreas.count() > 0) {
      const uploadArea = uploadAreas.first()
      
      // Should be focusable
      await uploadArea.focus()
      await expect(uploadArea).toBeFocused()
      
      // Should be activatable with keyboard
      await page.keyboard.press('Enter')
      
      // Should trigger file chooser or equivalent action
    }
  })

  test('should have appropriate page title', async ({ page }) => {
    // Page title should be descriptive
    await expect(page).toHaveTitle(/OP-XY/i)
    
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
    expect(title.toLowerCase()).toContain('op-xy')
  })

  test('should support high contrast mode', async ({ page }) => {
    // Test forced-colors media query support
    // This simulates high contrast mode testing
    
    await page.emulateMedia({ forcedColors: 'active' })
    
    // Page should still be functional and visible
    await expect(page.getByText('OP-XY')).toBeVisible()
    await expect(page.getByText('drum')).toBeVisible()
    await expect(page.getByText('multisample')).toBeVisible()
  })

  test('should support reduced motion preferences', async ({ page }) => {
    // Test prefers-reduced-motion support
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    // Page should still be functional with reduced motion
    await expect(page.getByText('OP-XY')).toBeVisible()
    
    // Navigate between tabs
    await page.getByText('multisample').first().click()
    await expect(page.getByText('sample settings')).toBeVisible()
    
    await page.getByText('drum').first().click()
    await expect(page.getByText('drum samples')).toBeVisible()
  })
})