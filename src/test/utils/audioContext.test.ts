import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest'

// We need to mock before importing the audioContext module
const mockAudioContext = {
  state: 'suspended' as AudioContextState,
  sampleRate: 44100,
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
}

const createMockOfflineAudioContext = () => ({
  startRendering: vi.fn().mockResolvedValue({}),
})

// Mock global constructors with proper typing
Object.defineProperty(global, 'AudioContext', {
  writable: true,
  value: vi.fn(() => mockAudioContext)
})

Object.defineProperty(global, 'OfflineAudioContext', {
  writable: true,
  value: vi.fn(() => createMockOfflineAudioContext())
})

// Now import the module after mocking
const { audioContextManager } = await import('../../utils/audioContext')

describe('AudioContextManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the mock state
    mockAudioContext.state = 'suspended'
    mockAudioContext.sampleRate = 44100
    mockAudioContext.resume.mockClear()
    mockAudioContext.close.mockClear()
  })

  afterEach(async () => {
    // Clean up after each test
    await audioContextManager.cleanup()
    vi.clearAllMocks()
  })

  describe('getAudioContext', () => {
    it('should create new AudioContext on first call', async () => {
      const audioContext = await audioContextManager.getAudioContext()
      expect(audioContext).toBeDefined()
      expect(global.AudioContext).toHaveBeenCalledTimes(1)
    })

    it('should resume suspended AudioContext', async () => {
      mockAudioContext.state = 'suspended'
      await audioContextManager.getAudioContext()
      expect(mockAudioContext.resume).toHaveBeenCalledTimes(1)
    })

    it('should not resume running AudioContext', async () => {
      mockAudioContext.state = 'running'
      await audioContextManager.getAudioContext()
      expect(mockAudioContext.resume).not.toHaveBeenCalled()
    })

    it('should reuse existing AudioContext when running', async () => {
      mockAudioContext.state = 'running'
      
      // First call
      const context1 = await audioContextManager.getAudioContext()
      
      // Second call
      const context2 = await audioContextManager.getAudioContext()
      
      expect(context1).toBe(context2)
      expect(global.AudioContext).toHaveBeenCalledTimes(1)
    })
  })

  describe('closeAudioContext', () => {
    it('should close existing AudioContext', async () => {
      mockAudioContext.state = 'running'
      
      await audioContextManager.getAudioContext()
      await audioContextManager.closeAudioContext()
      
      expect(mockAudioContext.close).toHaveBeenCalledTimes(1)
    })

    it('should not close already closed AudioContext', async () => {
      await audioContextManager.getAudioContext()

      mockAudioContext.state = 'closed'
      
      await audioContextManager.closeAudioContext()
      
      expect(mockAudioContext.close).not.toHaveBeenCalled()
    })

    it('should handle case when no AudioContext exists', async () => {
      await expect(audioContextManager.closeAudioContext()).resolves.toBeUndefined()
    })
  })

  describe('getState', () => {
    it('should return null when no AudioContext exists', () => {
      expect(audioContextManager.getState()).toBe(null)
    })

    it('should return AudioContext state when it exists', async () => {
      mockAudioContext.state = 'running'
      await audioContextManager.getAudioContext()
      expect(audioContextManager.getState()).toBe('running')
    })
  })

  describe('getSampleRate', () => {
    it('should return default sample rate when no AudioContext exists', () => {
      expect(audioContextManager.getSampleRate()).toBe(44100)
    })

    it('should return AudioContext sample rate when it exists', async () => {
      mockAudioContext.sampleRate = 48000
      await audioContextManager.getAudioContext()
      expect(audioContextManager.getSampleRate()).toBe(48000)
    })
  })

  describe('isReady', () => {
    it('should return false when not initialized', () => {
      expect(audioContextManager.isReady()).toBe(false)
    })

    it('should return true when initialized and running', async () => {
      mockAudioContext.state = 'running'
      await audioContextManager.getAudioContext()
      expect(audioContextManager.isReady()).toBe(true)
    })

    it('should return false when initialized but suspended', async () => {
      mockAudioContext.state = 'suspended'
      await audioContextManager.getAudioContext()
      expect(audioContextManager.isReady()).toBe(false)
    })

    it('should return false when initialized but closed', async () => {
      await audioContextManager.getAudioContext()
      mockAudioContext.state = 'closed'
      expect(audioContextManager.isReady()).toBe(false)
    })
  })

  describe('createOfflineContext', () => {
    it('should create OfflineAudioContext with correct parameters', () => {
      const offlineContext = audioContextManager.createOfflineContext(2, 44100, 44100)
      
      expect(global.OfflineAudioContext).toHaveBeenCalledWith(2, 44100, 44100)
      expect(offlineContext).toBeDefined()
    })

    it('should create different instances on multiple calls', () => {
      const context1 = audioContextManager.createOfflineContext(1, 22050, 22050)
      const context2 = audioContextManager.createOfflineContext(2, 44100, 44100)
      
      expect(context1).not.toBe(context2)
      expect(global.OfflineAudioContext).toHaveBeenCalledTimes(2)
    })
  })

  describe('cleanup', () => {
    it('should call closeAudioContext', async () => {
      const closeSpy = vi.spyOn(audioContextManager, 'closeAudioContext')
      
      await audioContextManager.cleanup()
      
      expect(closeSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('integration scenarios', () => {
    it('should handle full lifecycle', async () => {
      // Create and use AudioContext
      mockAudioContext.state = 'suspended'
      const context = await audioContextManager.getAudioContext()
      expect(context).toBeDefined()
      expect(mockAudioContext.resume).toHaveBeenCalledTimes(1)
      
      // Check state
      mockAudioContext.state = 'running'
      expect(audioContextManager.isReady()).toBe(true)
      
      // Create offline context
      const offlineContext = audioContextManager.createOfflineContext(2, 44100, 44100)
      expect(offlineContext).toBeDefined()
      
      // Cleanup
      await audioContextManager.cleanup()
      expect(mockAudioContext.close).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple suspend/resume cycles', async () => {
      // Initial creation and resume
      mockAudioContext.state = 'suspended'
      await audioContextManager.getAudioContext()
      expect(mockAudioContext.resume).toHaveBeenCalledTimes(1)
      
      // Simulate another suspend
      mockAudioContext.state = 'suspended'
      await audioContextManager.getAudioContext()
      expect(mockAudioContext.resume).toHaveBeenCalledTimes(2)
      
      // Already running - should not resume again
      mockAudioContext.state = 'running'
      await audioContextManager.getAudioContext()
      expect(mockAudioContext.resume).toHaveBeenCalledTimes(2)
    })
  })
})

