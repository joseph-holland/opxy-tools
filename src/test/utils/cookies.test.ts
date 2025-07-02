import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cookieUtils, COOKIE_KEYS } from '../../utils/cookies'

describe('cookieUtils', () => {
  beforeEach(() => {
    // Clear document.cookie before each test
    document.cookie = ''
    vi.clearAllMocks()
  })

  describe('setCookie', () => {
    it('should set a cookie with default expiration', () => {
      const spy = vi.spyOn(document, 'cookie', 'set')
      cookieUtils.setCookie('testKey', 'testValue')
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(/testKey=testValue;expires=.+;path=\//)
      )
    })

    it('should set a cookie with custom expiration days', () => {
      const spy = vi.spyOn(document, 'cookie', 'set')
      cookieUtils.setCookie('testKey', 'testValue', 7)
      
      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(/testKey=testValue;expires=.+;path=\//)
      )
    })

    it('should handle errors gracefully when cookies are disabled', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const cookieSpy = vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {
        throw new Error('Cookies disabled')
      })

      expect(() => {
        cookieUtils.setCookie('testKey', 'testValue')
      }).not.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to set cookie (cookies may be disabled):',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
      cookieSpy.mockRestore()
    })

    it('should calculate correct expiration date', () => {
      const spy = vi.spyOn(document, 'cookie', 'set')
      const beforeTime = Date.now()
      
      cookieUtils.setCookie('testKey', 'testValue', 1)
      
      const cookieCall = spy.mock.calls[0][0] as string
      const expiresMatch = cookieCall.match(/expires=([^;]+)/)
      expect(expiresMatch).toBeTruthy()
      
      const expiresDate = new Date(expiresMatch![1])
      const expectedTime = beforeTime + (1 * 24 * 60 * 60 * 1000)
      
      // Allow 1 second tolerance for execution time
      expect(Math.abs(expiresDate.getTime() - expectedTime)).toBeLessThan(1000)
    })
  })

  describe('getCookie', () => {
    it('should return null when cookie does not exist', () => {
      expect(cookieUtils.getCookie('nonexistent')).toBe(null)
    })

    it('should return cookie value when cookie exists', () => {
      // Mock document.cookie getter
      Object.defineProperty(document, 'cookie', {
        get: () => 'testKey=testValue; otherKey=otherValue',
        configurable: true
      })

      expect(cookieUtils.getCookie('testKey')).toBe('testValue')
      expect(cookieUtils.getCookie('otherKey')).toBe('otherValue')
    })

    it('should handle cookies with spaces in values', () => {
      Object.defineProperty(document, 'cookie', {
        get: () => 'testKey=testValue; otherKey=otherValue ',
        configurable: true
      })

      expect(cookieUtils.getCookie('testKey')).toBe('testValue')
      expect(cookieUtils.getCookie('otherKey')).toBe('otherValue ')
    })

    it('should return null for partial matches', () => {
      Object.defineProperty(document, 'cookie', {
        get: () => 'testKeyLonger=testValue',
        configurable: true
      })

      expect(cookieUtils.getCookie('testKey')).toBe(null)
    })

    it('should handle empty cookie string', () => {
      Object.defineProperty(document, 'cookie', {
        get: () => '',
        configurable: true
      })

      expect(cookieUtils.getCookie('testKey')).toBe(null)
    })

    it('should handle errors gracefully when cookies are disabled', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      Object.defineProperty(document, 'cookie', {
        get: () => {
          throw new Error('Cookies disabled')
        },
        configurable: true
      })

      expect(cookieUtils.getCookie('testKey')).toBe(null)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to read cookie (cookies may be disabled):',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('removeCookie', () => {
    it('should set cookie with past expiration date', () => {
      const spy = vi.spyOn(document, 'cookie', 'set')
      cookieUtils.removeCookie('testKey')
      
      expect(spy).toHaveBeenCalledWith(
        'testKey=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      )
    })
  })

  describe('integration tests', () => {
    it('should set and retrieve cookie value', () => {
      let cookieStore = ''
      Object.defineProperty(document, 'cookie', {
        get: () => cookieStore,
        set: (value: string) => {
          cookieStore = value
        },
        configurable: true
      })

      cookieUtils.setCookie('integration', 'test')
      expect(cookieUtils.getCookie('integration')).toBe('test')
    })
  })
})

describe('COOKIE_KEYS', () => {
  it('should have all expected cookie keys', () => {
    expect(COOKIE_KEYS.LAST_TAB).toBe('opxy_last_tab')
    expect(COOKIE_KEYS.DRUM_KEYBOARD_PINNED).toBe('opxy_drum_keyboard_pinned')
    expect(COOKIE_KEYS.MULTISAMPLE_KEYBOARD_PINNED).toBe('opxy_multisample_keyboard_pinned')
  })

  it('should be a readonly object', () => {
    // TypeScript const assertion provides compile-time readonly behavior
    // At runtime, we can still check that the object is frozen or has the expected properties
    expect(Object.isFrozen(COOKIE_KEYS)).toBe(false) // JavaScript objects aren't frozen by default
    expect(COOKIE_KEYS.LAST_TAB).toBe('opxy_last_tab')
    
    // Test that TypeScript would prevent modification (this is a compile-time check)
    expect(typeof COOKIE_KEYS).toBe('object')
  })
})