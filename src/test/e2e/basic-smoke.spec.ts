import { test, expect } from '@playwright/test'

test.describe('Basic Smoke Test', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')
    
    // Very basic test - just check page loads
    await expect(page.locator('body')).toBeVisible()
  })
})