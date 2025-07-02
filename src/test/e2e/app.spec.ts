import { test, expect } from '@playwright/test'

test.describe('OP-XY Drum Tool App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load the main application', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/OP-XY/)
    
    // Check header is present
    await expect(page.getByText('OP-XY')).toBeVisible()
    
    // Check main tabs are present
    await expect(page.getByText('drum')).toBeVisible()
    await expect(page.getByText('multisample')).toBeVisible()
    
    // Check footer elements
    await expect(page.getByText('proudly open source')).toBeVisible()
    await expect(page.getByText('joseph-holland')).toBeVisible()
  })

  test('should navigate between drum and multisample tabs', async ({ page }) => {
    // Default should be drum tab
    const drumTab = page.getByText('drum').first()
    const multisampleTab = page.getByText('multisample').first()
    
    // Drum tab should be active by default (check for active styling)
    await expect(drumTab).toBeVisible()
    
    // Click multisample tab
    await multisampleTab.click()
    
    // Should see multisample content
    await expect(page.getByText('sample settings')).toBeVisible()
    
    // Click back to drum tab
    await drumTab.click()
    
    // Should see drum content
    await expect(page.getByText('drum samples')).toBeVisible()
  })

  test('should display correct footer information', async ({ page }) => {
    // Check disclaimer text
    await expect(page.getByText('this is an unofficial tool')).toBeVisible()
    await expect(page.getByText('teenage engineering')).toBeVisible()
    
    // Check version display
    await expect(page.locator('[style*="color: #999"]').first()).toBeVisible()
    
    // Check external links
    const githubLink = page.getByRole('link', { name: 'github repo' })
    await expect(githubLink).toBeVisible()
    await expect(githubLink).toHaveAttribute('href', 'https://github.com/joseph-holland/opxy-tools')
    
    const coffeeLink = page.getByRole('link', { name: /buy me a coffee/ })
    await expect(coffeeLink).toBeVisible()
    await expect(coffeeLink).toHaveAttribute('href', 'https://buymeacoffee.com/jxavierh')
    
    const inspirationLink = page.getByRole('link', { name: 'opxy-drum-tool' })
    await expect(inspirationLink).toBeVisible()
    await expect(inspirationLink).toHaveAttribute('href', 'https://buba447.github.io/opxy-drum-tool/')
  })

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Page should still be functional
    await expect(page.getByText('OP-XY')).toBeVisible()
    await expect(page.getByText('drum')).toBeVisible()
    await expect(page.getByText('multisample')).toBeVisible()
    
    // Content should adapt to smaller screen
    const content = page.locator('[style*="padding"]').first()
    await expect(content).toBeVisible()
  })
})