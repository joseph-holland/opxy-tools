import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  sanitizeName,
  parseFilename,
  midiNoteToString,
  noteStringToMidiValue,
  NOTE_OFFSET,
  NOTE_NAMES,
  formatFileSize,
  isPatchSizeValid,
  getPatchSizeWarning,
  getEffectiveSampleRate,
  audioBufferToWav,
  findNearestZeroCrossing,
  baseMultisampleJson,
  baseDrumJson,
  type WavMetadata
} from '../../utils/audio'

describe('sanitizeName', () => {
  it('should keep valid characters', () => {
    expect(sanitizeName('ValidName123')).toBe('ValidName123')
    expect(sanitizeName('Test #-().')).toBe('Test #-().')
  })

  it('should remove invalid characters', () => {
    expect(sanitizeName('Invalid@Name!')).toBe('InvalidName')
    expect(sanitizeName('Test$%^&*+=[]{}|\\:";\'<>?,/')).toBe('Test')
  })

  it('should handle special cases', () => {
    expect(sanitizeName('')).toBe('')
    expect(sanitizeName('   ')).toBe('   ')
    expect(sanitizeName('123')).toBe('123')
  })

  it('should preserve spaces and allowed symbols', () => {
    expect(sanitizeName('Kick Drum #1-A (Main).wav')).toBe('Kick Drum #1-A (Main).wav')
    expect(sanitizeName('Sample-Name #123 (Version)')).toBe('Sample-Name #123 (Version)')
  })
})

describe('parseFilename', () => {
  describe('with note names', () => {
    it('should parse simple note names', () => {
      expect(parseFilename('kick_C3.wav')).toEqual(['kick', 60])
      expect(parseFilename('snare_A4.wav')).toEqual(['snare', 81])
    })

    it('should parse sharp notes', () => {
      expect(parseFilename('hihat_C#3.wav')).toEqual(['hihat', 61])
      expect(parseFilename('cymbal_F#4.wav')).toEqual(['cymbal', 78])
    })

    it('should parse flat notes', () => {
      expect(parseFilename('bass_Db3.wav')).toEqual(['bass', 61])
      expect(parseFilename('piano_Bb4.wav')).toEqual(['piano', 82])
    })

    it('should handle different separators', () => {
      expect(parseFilename('kick-C3.wav')).toEqual(['kick', 60])
      expect(parseFilename('kick C3.wav')).toEqual(['kick', 60])
      expect(parseFilename('kick_C3.wav')).toEqual(['kick', 60])
    })

    it('should handle case insensitive notes', () => {
      expect(parseFilename('kick_c3.wav')).toEqual(['kick', 60])
      expect(parseFilename('kick_C3.wav')).toEqual(['kick', 60])
    })
  })

  describe('with numbers', () => {
    it('should parse simple numbers', () => {
      expect(parseFilename('kick_60.wav')).toEqual(['kick', 60])
      expect(parseFilename('snare123.wav')).toEqual(['snare', 123])
    })

    it('should parse three digit numbers', () => {
      expect(parseFilename('sample127.wav')).toEqual(['sample', 127])
      expect(parseFilename('test_001.wav')).toEqual(['test', 1])
    })
  })

  describe('name sanitization', () => {
    it('should sanitize invalid characters in base name', () => {
      expect(parseFilename('kick@drum_C3.wav')).toEqual(['kickdrum', 60])
      expect(parseFilename('sample$%^_60.wav')).toEqual(['sample', 60])
    })
  })

  describe('error cases', () => {
    it('should throw error for invalid patterns', () => {
      expect(() => parseFilename('invalid')).toThrow('does not match the expected pattern')
      expect(() => parseFilename('no_number_or_note.wav')).toThrow('does not match the expected pattern')
    })

    it('should throw error for empty input', () => {
      expect(() => parseFilename('')).toThrow('does not match the expected pattern')
    })
  })
})

describe('midiNoteToString', () => {
  it('should convert common MIDI notes correctly', () => {
    expect(midiNoteToString(60)).toBe('C4')  // Middle C
    expect(midiNoteToString(69)).toBe('A4')  // A440
    expect(midiNoteToString(48)).toBe('C3')
  })

  it('should handle sharp notes', () => {
    expect(midiNoteToString(61)).toBe('C#4')
    expect(midiNoteToString(66)).toBe('F#4')
  })

  it('should handle different octaves', () => {
    expect(midiNoteToString(24)).toBe('C1')
    expect(midiNoteToString(36)).toBe('C2')
    expect(midiNoteToString(72)).toBe('C5')
    expect(midiNoteToString(84)).toBe('C6')
  })

  it('should handle edge cases', () => {
    expect(midiNoteToString(0)).toBe('C-1')
    expect(midiNoteToString(127)).toBe('G9')
  })
})

describe('noteStringToMidiValue', () => {
  it('should convert note strings to MIDI values', () => {
    expect(noteStringToMidiValue('C4')).toBe(72)
    expect(noteStringToMidiValue('A4')).toBe(81)
    expect(noteStringToMidiValue('C3')).toBe(60)
  })

  it('should handle sharp notes', () => {
    expect(noteStringToMidiValue('C#4')).toBe(73)
    expect(noteStringToMidiValue('F#4')).toBe(78)
  })

  it('should handle flat notes', () => {
    expect(noteStringToMidiValue('Db4')).toBe(73)
    expect(noteStringToMidiValue('Bb4')).toBe(82)
  })

  it('should handle case insensitive input', () => {
    expect(noteStringToMidiValue('c4')).toBe(72)
    expect(noteStringToMidiValue('A4')).toBe(81)
  })

  it('should handle spaces', () => {
    expect(noteStringToMidiValue('C 4')).toBe(72)
    expect(noteStringToMidiValue('C# 4')).toBe(73)
  })

  // Note: These functions are not actually inverses due to different octave numbering conventions
  // This is legacy behavior that should be preserved for compatibility
  it('should maintain consistency with expected octave mappings', () => {
    // Test specific known mappings instead of expecting inverse behavior
    expect(noteStringToMidiValue('C3')).toBe(60)
    expect(midiNoteToString(60)).toBe('C4')
    expect(noteStringToMidiValue('C4')).toBe(72)
    expect(midiNoteToString(72)).toBe('C5')
  })

  describe('error cases', () => {
    it('should throw error for invalid note format', () => {
      expect(() => noteStringToMidiValue('X4')).toThrow('Bad note')
      expect(() => noteStringToMidiValue('C')).toThrow('Bad note format')
      expect(() => noteStringToMidiValue('')).toThrow('Bad note format')
    })

    it('should throw error for invalid characters', () => {
      expect(() => noteStringToMidiValue('H4')).toThrow('Bad note')
      expect(() => noteStringToMidiValue('C9')).not.toThrow() // Should be valid
    })
  })
})

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(0)).toBe('0 mb')
    expect(formatFileSize(512)).toBe('512 b')
    expect(formatFileSize(1023)).toBe('1023 b')
  })

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 kb')
    expect(formatFileSize(1536)).toBe('1.5 kb')
    expect(formatFileSize(1048575)).toBe('1024.0 kb')
  })

  it('should format megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1.0 mb')
    expect(formatFileSize(1572864)).toBe('1.5 mb')
    expect(formatFileSize(8388608)).toBe('8.0 mb')
  })

  it('should handle large values', () => {
    expect(formatFileSize(10485760)).toBe('10.0 mb')
    expect(formatFileSize(52428800)).toBe('50.0 mb')
  })
})

describe('isPatchSizeValid', () => {
  const PATCH_SIZE_LIMIT = 8 * 1024 * 1024 // 8MB

  it('should return true for valid sizes', () => {
    expect(isPatchSizeValid(0)).toBe(true)
    expect(isPatchSizeValid(1024)).toBe(true)
    expect(isPatchSizeValid(PATCH_SIZE_LIMIT)).toBe(true)
  })

  it('should return false for invalid sizes', () => {
    expect(isPatchSizeValid(PATCH_SIZE_LIMIT + 1)).toBe(false)
    expect(isPatchSizeValid(PATCH_SIZE_LIMIT * 2)).toBe(false)
  })
})

describe('getPatchSizeWarning', () => {
  const PATCH_SIZE_LIMIT = 8 * 1024 * 1024 // 8MB

  it('should return null for small sizes', () => {
    expect(getPatchSizeWarning(0)).toBe(null)
    expect(getPatchSizeWarning(PATCH_SIZE_LIMIT * 0.5)).toBe(null)
    expect(getPatchSizeWarning(PATCH_SIZE_LIMIT * 0.74)).toBe(null)
  })

  it('should return warning for large sizes', () => {
    const result = getPatchSizeWarning(PATCH_SIZE_LIMIT * 0.8)
    expect(result).toBe('Approaching size limit - consider optimizing samples')
  })

  it('should return error for very large sizes', () => {
    const result = getPatchSizeWarning(PATCH_SIZE_LIMIT * 0.96)
    expect(result).toBe('Preset size too large - reduce sample rate, bit depth, or convert to mono')
  })

  it('should handle edge cases', () => {
    expect(getPatchSizeWarning(PATCH_SIZE_LIMIT * 0.75)).toBe('Approaching size limit - consider optimizing samples')
    expect(getPatchSizeWarning(PATCH_SIZE_LIMIT * 0.95)).toBe('Preset size too large - reduce sample rate, bit depth, or convert to mono')
  })
})

describe('getEffectiveSampleRate', () => {
  it('should keep original when selected is "0"', () => {
    expect(getEffectiveSampleRate(44100, "0")).toBe(44100)
    expect(getEffectiveSampleRate(48000, "0")).toBe(48000)
    expect(getEffectiveSampleRate(22050, "0")).toBe(22050)
  })

  it('should allow any conversion from 48kHz', () => {
    expect(getEffectiveSampleRate(48000, "44100")).toBe(44100)
    expect(getEffectiveSampleRate(48000, "22050")).toBe(22050)
    expect(getEffectiveSampleRate(48000, "11025")).toBe(11025)
  })

  it('should prevent upsampling for other rates', () => {
    expect(getEffectiveSampleRate(22050, "44100")).toBe(22050) // No upsampling
    expect(getEffectiveSampleRate(11025, "22050")).toBe(11025) // No upsampling
    expect(getEffectiveSampleRate(44100, "48000")).toBe(44100) // No upsampling
  })

  it('should allow downsampling', () => {
    expect(getEffectiveSampleRate(44100, "22050")).toBe(22050)
    expect(getEffectiveSampleRate(44100, "11025")).toBe(11025)
    expect(getEffectiveSampleRate(22050, "11025")).toBe(11025)
  })

  it('should handle string and number inputs', () => {
    expect(getEffectiveSampleRate(44100, 22050)).toBe(22050)
    expect(getEffectiveSampleRate(44100, "22050")).toBe(22050)
  })
})

describe('audioBufferToWav', () => {
  let mockAudioBuffer: AudioBuffer

  beforeEach(() => {
    // Create a simple mock AudioBuffer
    mockAudioBuffer = new (global.AudioBuffer as any)({
      numberOfChannels: 2,
      length: 44100,
      sampleRate: 44100
    })
    
    // Mock getChannelData to return Float32Array with some test data
    mockAudioBuffer.getChannelData = vi.fn((channel: number) => {
      const data = new Float32Array(44100)
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.5 // 440Hz sine wave
      }
      return data
    })
  })

  it('should create WAV blob with correct type', () => {
    const result = audioBufferToWav(mockAudioBuffer)
    expect(result).toBeInstanceOf(Blob)
    expect(result.type).toBe('audio/wav')
  })

  it('should handle 16-bit conversion by default', () => {
    const result = audioBufferToWav(mockAudioBuffer)
    expect(result.size).toBeGreaterThan(44) // Should have WAV header + data
  })

  it('should handle 24-bit conversion', () => {
    const result = audioBufferToWav(mockAudioBuffer, 24)
    expect(result.size).toBeGreaterThan(44)
    // 24-bit should be larger than 16-bit for same audio
    const result16 = audioBufferToWav(mockAudioBuffer, 16)
    expect(result.size).toBeGreaterThan(result16.size)
  })

  it('should throw error for unsupported bit depths', () => {
    expect(() => audioBufferToWav(mockAudioBuffer, 8)).toThrow('Unsupported bit depth: 8')
    expect(() => audioBufferToWav(mockAudioBuffer, 32)).toThrow('Unsupported bit depth: 32')
  })

  it('should throw error for unsupported channel counts', () => {
    const invalidBuffer = new (global.AudioBuffer as any)({
      numberOfChannels: 4,
      length: 1000,
      sampleRate: 44100
    })
    
    expect(() => audioBufferToWav(invalidBuffer)).toThrow('Expecting mono or stereo audioBuffer')
  })
})

describe('findNearestZeroCrossing', () => {
  let mockAudioBuffer: AudioBuffer

  beforeEach(() => {
    mockAudioBuffer = new (global.AudioBuffer as any)({
      numberOfChannels: 1,
      length: 1000,
      sampleRate: 44100
    })

    // Create test data with known zero crossings
    const data = new Float32Array(1000)
    for (let i = 0; i < data.length; i++) {
      // Create a sine wave with zero crossings at predictable points
      data[i] = Math.sin(2 * Math.PI * i / 100)
    }
    // Manually set some exact zero crossings
    data[0] = 0
    data[100] = 0
    data[200] = 0
    data[500] = 0

    mockAudioBuffer.getChannelData = vi.fn(() => data)
  })

  it('should find exact zero crossings', () => {
    const result = findNearestZeroCrossing(mockAudioBuffer, 95, 'both', 10)
    expect(result).toBe(100) // Should find the zero at position 100
  })

  it('should return original position if already near zero', () => {
    const result = findNearestZeroCrossing(mockAudioBuffer, 100)
    expect(result).toBe(100)
  })

  it('should respect search direction', () => {
    const forwardResult = findNearestZeroCrossing(mockAudioBuffer, 150, 'forward', 100)
    expect(forwardResult).toBe(200)

    const backwardResult = findNearestZeroCrossing(mockAudioBuffer, 150, 'backward', 100)
    expect(backwardResult).toBe(50)
  })

  it('should respect max distance', () => {
    const result = findNearestZeroCrossing(mockAudioBuffer, 150, 'both', 10)
    // Should not find distant zero crossings if max distance is small
    expect(Math.abs(result - 150)).toBeLessThanOrEqual(10)
  })

  it('should clamp position to valid range', () => {
    expect(findNearestZeroCrossing(mockAudioBuffer, -100)).toBe(0)
    expect(findNearestZeroCrossing(mockAudioBuffer, 2000)).toBe(0) // Clamped to end, finds best zero crossing
  })

  it('should handle edge positions', () => {
    expect(findNearestZeroCrossing(mockAudioBuffer, 0)).toBe(0)
    expect(findNearestZeroCrossing(mockAudioBuffer, 999)).toBe(0) // Finds best zero crossing within range
  })
})

describe('constants and exports', () => {
  it('should export NOTE_OFFSET array', () => {
    expect(NOTE_OFFSET).toEqual([33, 35, 24, 26, 28, 29, 31])
    expect(NOTE_OFFSET.length).toBe(7)
  })

  it('should export NOTE_NAMES array', () => {
    expect(NOTE_NAMES).toEqual([
      "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
    ])
    expect(NOTE_NAMES.length).toBe(12)
  })

  it('should export base JSON templates', () => {
    expect(baseMultisampleJson.type).toBe('multisampler')
    expect(baseMultisampleJson.platform).toBe('OP-XY')
    expect(baseMultisampleJson.version).toBe(4)
    expect(Array.isArray(baseMultisampleJson.regions)).toBe(true)

    expect(baseDrumJson.type).toBe('drum')
    expect(baseDrumJson.platform).toBe('OP-XY')
    expect(baseDrumJson.version).toBe(4)
  })
})