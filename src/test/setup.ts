import '@testing-library/jest-dom'
import { expect, afterEach, vi, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import React from 'react'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock AudioBuffer class
Object.defineProperty(global, 'AudioBuffer', {
  writable: true,
  value: class MockAudioBuffer implements Partial<AudioBuffer> {
    numberOfChannels: number
    length: number
    sampleRate: number
    duration: number

    constructor(options: AudioBufferOptions) {
      this.numberOfChannels = options.numberOfChannels || 2
      this.length = options.length || 44100
      this.sampleRate = options.sampleRate || 44100
      this.duration = this.length / this.sampleRate
    }

    getChannelData(channel: number): Float32Array {
      return new Float32Array(this.length)
    }

    copyFromChannel = vi.fn()
    copyToChannel = vi.fn()
  }
})

// Mock AudioContext for audio-related tests
global.AudioContext = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  createAnalyser: vi.fn(),
  createBiquadFilter: vi.fn(),
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(),
  createChannelMerger: vi.fn(),
  createChannelSplitter: vi.fn(),
  createConstantSource: vi.fn(),
  createConvolver: vi.fn(),
  createDelay: vi.fn(),
  createDynamicsCompressor: vi.fn(),
  createGain: vi.fn(),
  createIIRFilter: vi.fn(),
  createOscillator: vi.fn(),
  createPanner: vi.fn(),
  createPeriodicWave: vi.fn(),
  createScriptProcessor: vi.fn(),
  createStereoPanner: vi.fn(),
  createWaveShaper: vi.fn(),
  decodeAudioData: vi.fn(),
  resume: vi.fn(),
  suspend: vi.fn(),
  currentTime: 0,
  destination: {},
  listener: {},
  sampleRate: 44100,
  state: 'suspended',
  onstatechange: null,
}))

// Mock OfflineAudioContext
global.OfflineAudioContext = vi.fn().mockImplementation(() => ({
  ...new (global.AudioContext as any)(),
  startRendering: vi.fn(),
  oncomplete: null,
}))

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock File and Blob APIs with minimal implementation
Object.defineProperty(global, 'File', {
  writable: true,
  value: class MockFile implements Partial<File> {
    name: string
    size: number
    type: string
    lastModified: number
    webkitRelativePath = ''

    constructor(parts: any[], name: string, options?: any) {
      this.name = name
      this.size = parts.reduce((acc: number, part: any) => acc + (part.length || 0), 0)
      this.type = options?.type || ''
      this.lastModified = Date.now()
    }

    arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(0))
    slice = vi.fn().mockReturnThis()
    stream = vi.fn()
    text = vi.fn().mockResolvedValue('')
    bytes = vi.fn().mockResolvedValue(new Uint8Array())
  }
})

Object.defineProperty(global, 'Blob', {
  writable: true,
  value: class MockBlob implements Partial<Blob> {
    size: number
    type: string

    constructor(parts: any[], options?: any) {
      this.size = parts.reduce((acc: number, part: any) => acc + (part.length || 0), 0)
      this.type = options?.type || ''
    }

    arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(0))
    slice = vi.fn().mockReturnThis()
    stream = vi.fn()
    text = vi.fn().mockResolvedValue('')
    bytes = vi.fn().mockResolvedValue(new Uint8Array())
  }
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Export renderHook for convenience
export { renderHook } from '@testing-library/react'

// Import AppContextProvider at the top level
import { AppContextProvider } from '../context/AppContext'

// Create test wrapper for React hooks that need AppContext
export const createTestWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(AppContextProvider, { children })
}
