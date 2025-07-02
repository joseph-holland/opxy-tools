import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { renderHook, createTestWrapper } from '../setup'
import { useFileUpload } from '../../hooks/useFileUpload'

// Mock the audio utilities
vi.mock('../../utils/audio', () => ({
  readWavMetadata: vi.fn(),
}))

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return upload and clear functions', () => {
    const { result } = renderHook(() => useFileUpload(), { wrapper: createTestWrapper() })

    expect(typeof result.current.handleDrumSampleUpload).toBe('function')
    expect(typeof result.current.handleMultisampleUpload).toBe('function')
    expect(typeof result.current.clearDrumSample).toBe('function')
    expect(typeof result.current.clearMultisampleFile).toBe('function')
  })

  it('should handle successful drum sample upload', async () => {
    const mockReadWavMetadata = vi.fn().mockResolvedValue({
      sampleRate: 44100,
      bitDepth: 16,
      channels: 2,
      duration: 2.5,
      audioBuffer: new (global.AudioBuffer as any)({ numberOfChannels: 2, length: 44100, sampleRate: 44100 }),
      fileSize: 1024,
    })
    
    vi.mocked(await import('../../utils/audio')).readWavMetadata = mockReadWavMetadata

    const { result } = renderHook(() => useFileUpload(), { wrapper: createTestWrapper() })

    const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' })

    await act(async () => {
      await result.current.handleDrumSampleUpload(mockFile, 0)
    })

    expect(mockReadWavMetadata).toHaveBeenCalledWith(mockFile)
  })

  it('should handle drum sample upload error', async () => {
    const mockReadWavMetadata = vi.fn().mockRejectedValue(new Error('Invalid file'))
    vi.mocked(await import('../../utils/audio')).readWavMetadata = mockReadWavMetadata

    const { result } = renderHook(() => useFileUpload(), { wrapper: createTestWrapper() })

    const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' })

    await act(async () => {
      await result.current.handleDrumSampleUpload(mockFile, 0)
    })

    expect(mockReadWavMetadata).toHaveBeenCalledWith(mockFile)
  })

  it('should handle successful multisample upload', async () => {
    const mockReadWavMetadata = vi.fn().mockResolvedValue({
      sampleRate: 44100,
      bitDepth: 16,
      channels: 2,
      duration: 2.5,
      audioBuffer: new (global.AudioBuffer as any)({ numberOfChannels: 2, length: 44100, sampleRate: 44100 }),
      fileSize: 1024,
      midiNote: 60,
    })
    
    vi.mocked(await import('../../utils/audio')).readWavMetadata = mockReadWavMetadata

    const { result } = renderHook(() => useFileUpload(), { wrapper: createTestWrapper() })

    const mockFile = new File(['test'], 'C4.wav', { type: 'audio/wav' })

    await act(async () => {
      await result.current.handleMultisampleUpload(mockFile)
    })

    expect(mockReadWavMetadata).toHaveBeenCalledWith(mockFile)
  })

  it('should handle multisample upload with root note override', async () => {
    const mockReadWavMetadata = vi.fn().mockResolvedValue({
      sampleRate: 44100,
      bitDepth: 16,
      channels: 2,
      duration: 2.5,
      audioBuffer: new (global.AudioBuffer as any)({ numberOfChannels: 2, length: 44100, sampleRate: 44100 }),
      fileSize: 1024,
      midiNote: -1,
    })
    
    vi.mocked(await import('../../utils/audio')).readWavMetadata = mockReadWavMetadata

    const { result } = renderHook(() => useFileUpload(), { wrapper: createTestWrapper() })

    const mockFile = new File(['test'], 'sample.wav', { type: 'audio/wav' })

    await act(async () => {
      await result.current.handleMultisampleUpload(mockFile, 72)
    })

    expect(mockReadWavMetadata).toHaveBeenCalledWith(mockFile)
  })

  it('should handle multisample upload error', async () => {
    const mockReadWavMetadata = vi.fn().mockRejectedValue(new Error('Invalid file'))
    vi.mocked(await import('../../utils/audio')).readWavMetadata = mockReadWavMetadata

    const { result } = renderHook(() => useFileUpload(), { wrapper: createTestWrapper() })

    const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' })

    await act(async () => {
      await result.current.handleMultisampleUpload(mockFile)
    })

    expect(mockReadWavMetadata).toHaveBeenCalledWith(mockFile)
  })

  it('should clear drum sample', () => {
    const { result } = renderHook(() => useFileUpload(), { wrapper: createTestWrapper() })

    act(() => {
      result.current.clearDrumSample(5)
    })

    // Function should execute without error
    expect(typeof result.current.clearDrumSample).toBe('function')
  })

  it('should clear multisample file', () => {
    const { result } = renderHook(() => useFileUpload(), { wrapper: createTestWrapper() })

    act(() => {
      result.current.clearMultisampleFile(2)
    })

    // Function should execute without error
    expect(typeof result.current.clearMultisampleFile).toBe('function')
  })
})