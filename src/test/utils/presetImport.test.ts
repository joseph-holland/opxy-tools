import { describe, it, expect, vi } from 'vitest'
import {
  validatePresetJson,
  importPresetFromFile,
  internalToPercent,
  extractDrumSettings,
  type DrumPresetJson,
  type MultisamplePresetJson
} from '../../utils/presetImport'

describe('validatePresetJson', () => {
  describe('drum preset validation', () => {
    it('should validate valid drum preset', () => {
      const validDrumPreset = {
        type: 'drum',
        engine: {
          playmode: 'poly',
          volume: 26214,
          'velocity.sensitivity': 16383
        }
      }

      const result = validatePresetJson(validDrumPreset, 'drum')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validDrumPreset)
      expect(result.error).toBeUndefined()
    })

    it('should reject multisampler preset when expecting drum', () => {
      const multisamplePreset = {
        type: 'multisampler',
        engine: {
          volume: 26214
        }
      }

      const result = validatePresetJson(multisamplePreset, 'drum')
      expect(result.success).toBe(false)
      expect(result.error).toContain('This is a multisample preset')
      expect(result.error).toContain('switch to the multisample tab')
    })

    it('should reject unknown preset type', () => {
      const unknownPreset = {
        type: 'synthesizer',
        engine: {
          volume: 26214
        }
      }

      const result = validatePresetJson(unknownPreset, 'drum')
      expect(result.success).toBe(false)
      expect(result.error).toContain('has type "synthesizer"')
      expect(result.error).toContain('expected a "drum" preset')
    })
  })

  describe('multisample preset validation', () => {
    it('should validate valid multisample preset', () => {
      const validMultisamplePreset = {
        type: 'multisampler',
        engine: {
          volume: 26214
        }
      }

      const result = validatePresetJson(validMultisamplePreset, 'multisampler')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validMultisamplePreset)
      expect(result.error).toBeUndefined()
    })

    it('should reject drum preset when expecting multisampler', () => {
      const drumPreset = {
        type: 'drum',
        engine: {
          playmode: 'poly',
          volume: 26214
        }
      }

      const result = validatePresetJson(drumPreset, 'multisampler')
      expect(result.success).toBe(false)
      expect(result.error).toContain('This is a drum preset')
      expect(result.error).toContain('switch to the drum tab')
    })
  })

  describe('error cases', () => {
    it('should reject non-object input', () => {
      const result = validatePresetJson('not an object', 'drum')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JSON format')
    })

    it('should reject null input', () => {
      const result = validatePresetJson(null, 'drum')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JSON format')
    })

    it('should reject preset without type field', () => {
      const presetWithoutType = {
        engine: {
          volume: 26214
        }
      }

      const result = validatePresetJson(presetWithoutType, 'drum')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Missing "type" field in JSON')
    })

    it('should reject preset without engine field', () => {
      const presetWithoutEngine = {
        type: 'drum'
      }

      const result = validatePresetJson(presetWithoutEngine, 'drum')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Missing or invalid "engine" field')
    })

    it('should reject preset with invalid engine field', () => {
      const presetWithInvalidEngine = {
        type: 'drum',
        engine: 'not an object'
      }

      const result = validatePresetJson(presetWithInvalidEngine, 'drum')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Missing or invalid "engine" field')
    })
  })
})

describe('importPresetFromFile', () => {
  it('should import valid JSON file', async () => {
    const validJsonContent = JSON.stringify({
      type: 'drum',
      engine: {
        playmode: 'poly',
        volume: 26214
      }
    })

    const mockFile = new File([validJsonContent], 'preset.json', {
      type: 'application/json'
    })

    const result = await importPresetFromFile(mockFile, 'drum')
    expect(result.success).toBe(true)
    expect(result.data?.type).toBe('drum')
  })

  it('should reject non-JSON files', async () => {
    const textContent = 'This is not JSON'
    const mockFile = new File([textContent], 'preset.txt', {
      type: 'text/plain'
    })

    const result = await importPresetFromFile(mockFile, 'drum')
    expect(result.success).toBe(false)
    expect(result.error).toBe('File must be a JSON file (.json)')
  })

  it('should handle malformed JSON', async () => {
    const invalidJsonContent = '{ invalid json syntax }'
    const mockFile = new File([invalidJsonContent], 'preset.json', {
      type: 'application/json'
    })

    const result = await importPresetFromFile(mockFile, 'drum')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid JSON format')
  })

  it('should handle file reading errors', async () => {
    // Create a mock file that will cause an error when reading
    const mockFile = {
      name: 'preset.json',
      text: vi.fn().mockRejectedValue(new Error('File read error'))
    } as any

    const result = await importPresetFromFile(mockFile, 'drum')
    expect(result.success).toBe(false)
    expect(result.error).toContain('File reading error')
  })

  it('should handle validation errors', async () => {
    const invalidPresetContent = JSON.stringify({
      type: 'drum'
      // Missing engine field
    })

    const mockFile = new File([invalidPresetContent], 'preset.json', {
      type: 'application/json'
    })

    const result = await importPresetFromFile(mockFile, 'drum')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Missing or invalid "engine" field')
  })
})

describe('internalToPercent', () => {
  it('should convert internal values to percentages', () => {
    expect(internalToPercent(0)).toBe(0)
    expect(internalToPercent(32767)).toBe(100)
    expect(internalToPercent(16384)).toBe(50)
  })

  it('should handle edge cases', () => {
    expect(internalToPercent(-32767)).toBe(-100)
    expect(internalToPercent(65534)).toBe(200)
  })

  it('should round to nearest integer', () => {
    expect(internalToPercent(328)).toBe(1)
    expect(internalToPercent(164)).toBe(1)
    expect(internalToPercent(163)).toBe(0)
  })
})

describe('extractDrumSettings', () => {
  it('should extract drum settings with all properties', () => {
    const drumPreset: DrumPresetJson = {
      type: 'drum',
      engine: {
        playmode: 'mono',
        transpose: 12,
        'velocity.sensitivity': 16383,
        volume: 19660,
        width: 6553
      }
    }

    const result = extractDrumSettings(drumPreset)
    
    expect(result.presetSettings.playmode).toBe('mono')
    expect(result.presetSettings.transpose).toBe(12)
    expect(result.presetSettings.velocity).toBe(50) // 16383 -> 50%
    expect(result.presetSettings.volume).toBe(60) // 19660 -> 60%
    expect(result.presetSettings.width).toBe(20) // 6553 -> 20%
  })

  it('should use defaults for missing properties', () => {
    const drumPreset: DrumPresetJson = {
      type: 'drum',
      engine: {
        // Only some properties provided
        playmode: 'legato',
        volume: 26214
      }
    }

    const result = extractDrumSettings(drumPreset)
    
    expect(result.presetSettings.playmode).toBe('legato')
    expect(result.presetSettings.transpose).toBe(0) // default
    expect(result.presetSettings.velocity).toBe(20) // default
    expect(result.presetSettings.volume).toBe(80) // 26214 -> 80%
    expect(result.presetSettings.width).toBe(0) // default
  })

  it('should handle empty engine object', () => {
    const drumPreset: DrumPresetJson = {
      type: 'drum',
      engine: {}
    }

    const result = extractDrumSettings(drumPreset)
    
    expect(result.presetSettings.playmode).toBe('poly')
    expect(result.presetSettings.transpose).toBe(0)
    expect(result.presetSettings.velocity).toBe(20)
    expect(result.presetSettings.volume).toBe(69)
    expect(result.presetSettings.width).toBe(0)
  })

  it('should handle various playmode values', () => {
    const testCases = ['poly', 'mono', 'legato'] as const
    
    testCases.forEach(mode => {
      const drumPreset: DrumPresetJson = {
        type: 'drum',
        engine: {
          playmode: mode
        }
      }

      const result = extractDrumSettings(drumPreset)
      expect(result.presetSettings.playmode).toBe(mode)
    })
  })

  it('should handle extreme internal values', () => {
    const drumPreset: DrumPresetJson = {
      type: 'drum',
      engine: {
        'velocity.sensitivity': 32767, // max value
        volume: 0, // min value
        width: 16383 // middle value
      }
    }

    const result = extractDrumSettings(drumPreset)
    
    expect(result.presetSettings.velocity).toBe(100)
    expect(result.presetSettings.volume).toBe(0)
    expect(result.presetSettings.width).toBe(50)
  })
})