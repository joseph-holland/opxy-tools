import { test, expect } from '@playwright/test'

test.describe('Performance', () => {
  test('should load the application quickly', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    
    // Wait for main content to be visible
    await expect(page.getByText('OP-XY')).toBeVisible()
    await expect(page.getByText('drum')).toBeVisible()
    
    const loadTime = Date.now() - startTime
    
    // Application should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('should respond quickly to tab navigation', async ({ page }) => {
    await page.goto('/')
    
    // Measure tab switching performance
    const startTime = Date.now()
    
    await page.getByText('multisample').first().click()
    await expect(page.getByText('sample settings')).toBeVisible()
    
    const switchTime = Date.now() - startTime
    
    // Tab switching should be nearly instantaneous
    expect(switchTime).toBeLessThan(1000)
  })

  test('should handle multiple rapid interactions', async ({ page }) => {
    await page.goto('/')
    
    // Rapidly switch between tabs multiple times
    for (let i = 0; i < 5; i++) {
      await page.getByText('multisample').first().click()
      await page.getByText('drum').first().click()
    }
    
    // Should remain responsive
    await expect(page.getByText('drum samples')).toBeVisible()
  })

  test('should not have memory leaks during navigation', async ({ page }) => {
    await page.goto('/')
    
    // Get initial metrics
    const initialMetrics = await page.evaluate(() => {
      return {
        usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
        totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0
      }
    })
    
    // Perform many navigation cycles
    for (let i = 0; i < 10; i++) {
      await page.getByText('multisample').first().click()
      await page.getByText('drum').first().click()
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc()
      }
    })
    
    const finalMetrics = await page.evaluate(() => {
      return {
        usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
        totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0
      }
    })
    
    // Memory should not grow excessively (allow for some variance)
    if (initialMetrics.usedJSHeapSize > 0 && finalMetrics.usedJSHeapSize > 0) {
      const memoryGrowth = finalMetrics.usedJSHeapSize / initialMetrics.usedJSHeapSize
      expect(memoryGrowth).toBeLessThan(3) // Memory shouldn't triple
    }
  })

  test('should handle keyboard input efficiently', async ({ page }) => {
    await page.goto('/')
    
    const startTime = Date.now()
    
    // Rapid keyboard navigation
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
    }
    
    const keyboardTime = Date.now() - startTime
    
    // Keyboard navigation should be responsive
    expect(keyboardTime).toBeLessThan(2000)
  })

  test('should render efficiently on slower devices', async ({ page }) => {
    // Simulate slower device
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    const startTime = Date.now()
    
    await page.goto('/')
    await expect(page.getByText('OP-XY')).toBeVisible()
    
    // Switch tabs
    await page.getByText('multisample').first().click()
    await expect(page.getByText('sample settings')).toBeVisible()
    
    const totalTime = Date.now() - startTime
    
    // Should still be reasonably fast even on slower devices
    expect(totalTime).toBeLessThan(8000)
  })

  test('should not block UI during file operations', async ({ page }) => {
    await page.goto('/')
    
    // Navigate to drum tab
    await page.getByText('drum').first().click()
    
    // Look for file upload area
    const uploadArea = page.getByText('drag & drop').or(page.getByText('browse files')).first()
    
    if (await uploadArea.isVisible()) {
      // UI should remain responsive even when upload area is clicked
      await uploadArea.click()
      
      // Should be able to navigate immediately after
      await page.getByText('multisample').first().click()
      await expect(page.getByText('sample settings')).toBeVisible()
    }
  })

  test('should have efficient DOM size', async ({ page }) => {
    await page.goto('/')
    
    // Count DOM elements
    const domSize = await page.evaluate(() => {
      return document.querySelectorAll('*').length
    })
    
    // DOM shouldn't be excessively large (reasonable limit for a complex app)
    expect(domSize).toBeLessThan(2000)
  })

  test('should handle resize operations efficiently', async ({ page }) => {
    await page.goto('/')
    
    const startTime = Date.now()
    
    // Simulate rapid window resizing
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.setViewportSize({ width: 800, height: 600 })
    await page.setViewportSize({ width: 375, height: 667 }) // Mobile
    await page.setViewportSize({ width: 1920, height: 1080 }) // Desktop
    
    // Should remain responsive
    await expect(page.getByText('OP-XY')).toBeVisible()
    
    const resizeTime = Date.now() - startTime
    
    // Resize operations should be efficient
    expect(resizeTime).toBeLessThan(3000)
  })

  test('should not have excessive network requests', async ({ page }) => {
    const requests: string[] = []
    
    page.on('request', request => {
      requests.push(request.url())
    })
    
    await page.goto('/')
    
    // Wait for initial load
    await expect(page.getByText('OP-XY')).toBeVisible()
    
    // Switch tabs
    await page.getByText('multisample').first().click()
    await page.getByText('drum').first().click()
    
    // Filter out browser-generated requests (favicons, etc.)
    const appRequests = requests.filter(url => 
      !url.includes('favicon') && 
      !url.includes('manifest') &&
      !url.includes('robots.txt')
    )
    
    // Should not make excessive network requests for basic navigation
    expect(appRequests.length).toBeLessThan(20)
  })

  test('should maintain 60fps during animations', async ({ page }) => {
    await page.goto('/')
    
    // Start performance monitoring
    await page.evaluate(() => {
      (window as any).performanceData = {
        frames: 0,
        startTime: performance.now()
      }
      
      function countFrame() {
        (window as any).performanceData.frames++
        requestAnimationFrame(countFrame)
      }
      
      countFrame()
    })
    
    // Perform navigation that might trigger animations
    await page.getByText('multisample').first().click()
    await page.getByText('drum').first().click()
    
    // Wait a bit for animations
    await page.waitForTimeout(1000)
    
    const performanceData = await page.evaluate(() => {
      const data = (window as any).performanceData
      const elapsed = performance.now() - data.startTime
      return {
        fps: (data.frames / elapsed) * 1000,
        frames: data.frames,
        elapsed
      }
    })
    
    // Should maintain reasonable frame rate (at least 30fps, preferably 60fps)
    expect(performanceData.fps).toBeGreaterThan(30)
  })
})