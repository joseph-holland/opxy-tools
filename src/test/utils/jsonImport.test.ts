import { describe, it, expect, vi } from 'vitest'
import {
  importDrumPresetJson,
  importMultisamplePresetJson,
  mergeImportedDrumSettings,
  mergeImportedMultisampleSettings,
  validatePresetJson
} from '../../utils/jsonImport'
import type { AppState } from '../../context/AppContext'

// Mock dependencies
vi.mock('../../utils/valueConversions', () => ({
  internalToPercent: vi.fn((internal: number) => Math.round((internal / 32767) * 100)),
  deepMerge: vi.fn((target: any, source: any) => {
    Object.assign(target, source)
  })
}))

describe('validatePresetJson', () => {
  it('should validate drum preset JSON', () => {
    const validDrumJson = `{
      "type": "drum",
      "engine": {
        "playmode": "poly",
        "volume": 26214
      }
    }`
    
    const result = validatePresetJson(validDrumJson)
    expect(result.isValid).toBe(true)
    expect(result.type).toBe('drum')
    expect(result.error).toBeUndefined()
  })

  it('should validate multisample preset JSON', () => {
    const validMultisampleJson = `{
      "type": "multisampler",
      "engine": {
        "volume": 26214
      }
    }`
    
    const result = validatePresetJson(validMultisampleJson)
    expect(result.isValid).toBe(true)
    expect(result.type).toBe('multisampler')
    expect(result.error).toBeUndefined()
  })

  it('should reject invalid JSON format', () => {
    const invalidJson = `{ invalid json }`
    
    const result = validatePresetJson(invalidJson)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Invalid JSON format')
  })

  it('should reject JSON without type field', () => {
    const noTypeJson = `{
      "engine": {
        "volume": 26214
      }
    }`
    
    const result = validatePresetJson(noTypeJson)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Missing preset type')
  })

  it('should reject unsupported preset types', () => {
    const unsupportedJson = `{
      "type": "synthesizer",
      "engine": {
        "volume": 26214
      }
    }`
    
    const result = validatePresetJson(unsupportedJson)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Unsupported preset type')
  })

  it('should reject JSON without engine field', () => {
    const noEngineJson = `{
      "type": "drum"
    }`
    
    const result = validatePresetJson(noEngineJson)
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Missing engine settings')
  })
})

describe('importDrumPresetJson', () => {
  const mockCurrentState: AppState = {
    drumSettings: {
      presetName: 'default',
      presetSettings: {
        playmode: 'poly',
        transpose: 0,
        velocity: 20,
        volume: 69,
        width: 0
      }
    }
  } as AppState

  it('should import valid drum preset JSON', () => {
    const drumJsonContent = `{
      "type": "drum",
      "name": "My Drum Kit",
      "engine": {
        "playmode": "mono",
        "transpose": 12,
        "velocity.sensitivity": 16383,
        "volume": 19660,
        "width": 6553
      }
    }`

    const result = importDrumPresetJson(drumJsonContent, mockCurrentState)
    
    expect(result.drumSettings?.presetName).toBe('My Drum Kit')
    expect(result.drumSettings?.presetSettings.playmode).toBe('mono')
    expect(result.drumSettings?.presetSettings.transpose).toBe(12)
    expect(result.drumSettings?.presetSettings.velocity).toBe(50) // 16383 -> 50%
    expect(result.drumSettings?.presetSettings.volume).toBe(60) // 19660 -> 60%
    expect(result.drumSettings?.presetSettings.width).toBe(20) // 6553 -> 20%
  })

  it('should handle partial engine settings', () => {
    const drumJsonContent = `{
      "type": "drum",
      "engine": {
        "playmode": "legato",
        "volume": 26214
      }
    }`

    const result = importDrumPresetJson(drumJsonContent, mockCurrentState)
    
    expect(result.drumSettings?.presetSettings.playmode).toBe('legato')
    expect(result.drumSettings?.presetSettings.volume).toBe(80) // 26214 -> 80%
    // Other settings should remain from current state
    expect(result.drumSettings?.presetSettings.velocity).toBe(20)
    expect(result.drumSettings?.presetSettings.width).toBe(0)
  })

  it('should throw error for invalid type', () => {
    const invalidJsonContent = `{
      "type": "multisampler",
      "engine": {
        "volume": 26214
      }
    }`

    expect(() => {
      importDrumPresetJson(invalidJsonContent, mockCurrentState)
    }).toThrow('Invalid preset type: expected drum preset')
  })

  it('should throw error for invalid JSON', () => {
    const invalidJsonContent = `{ invalid json }`

    expect(() => {
      importDrumPresetJson(invalidJsonContent, mockCurrentState)
    }).toThrow('Failed to import drum preset')
  })

  it('should store imported JSON for patch generation', () => {
    const drumJsonContent = `{
      "type": "drum",
      "engine": {
        "volume": 26214
      }
    }`

    const result = importDrumPresetJson(drumJsonContent, mockCurrentState)
    
    expect((result as any).importedDrumPresetJson).toBeDefined()
    expect((result as any).importedDrumPresetJson.type).toBe('drum')
  })
})

describe('importMultisamplePresetJson', () => {
  const mockCurrentState: AppState = {
    multisampleSettings: {
      presetName: 'default'
    }
  } as AppState

  it('should import valid multisample preset JSON', () => {
    const multisampleJsonContent = `{
      "type": "multisampler",
      "name": "My Multisample",
      "engine": {
        "volume": 26214
      }
    }`

    const result = importMultisamplePresetJson(multisampleJsonContent, mockCurrentState)
    
    expect(result.multisampleSettings?.presetName).toBe('My Multisample')
  })

  it('should throw error for invalid type', () => {
    const invalidJsonContent = `{
      "type": "drum",
      "engine": {
        "volume": 26214
      }
    }`

    expect(() => {
      importMultisamplePresetJson(invalidJsonContent, mockCurrentState)
    }).toThrow('Invalid preset type: expected multisample preset')
  })

  it('should store imported JSON for patch generation', () => {
    const multisampleJsonContent = `{
      "type": "multisampler",
      "engine": {
        "volume": 26214
      }
    }`

    const result = importMultisamplePresetJson(multisampleJsonContent, mockCurrentState)
    
    expect((result as any).importedMultisamplePresetJson).toBeDefined()
    expect((result as any).importedMultisamplePresetJson.type).toBe('multisampler')
  })
})

describe('mergeImportedDrumSettings', () => {
  it('should merge imported settings into base JSON', () => {
         const baseJson: any = {
       type: 'drum',
       engine: {
         volume: 26214
       }
     }

     const importedJson = {
       type: 'drum',
       engine: {
         playmode: 'mono',
         transpose: 12
       },
       envelope: {
         attack: 100
       }
     }

     mergeImportedDrumSettings(baseJson, importedJson)

     // Should merge engine, envelope, etc.
     expect(baseJson.engine.playmode).toBe('mono')
     expect(baseJson.engine.transpose).toBe(12)
     expect(baseJson.engine.volume).toBe(26214) // Original should be preserved
     expect(baseJson.envelope).toBeDefined()
  })

  it('should handle missing imported JSON', () => {
    const baseJson = {
      type: 'drum',
      engine: {
        volume: 26214
      }
    }

    const originalJson = JSON.parse(JSON.stringify(baseJson))

    mergeImportedDrumSettings(baseJson, undefined)

    expect(baseJson).toEqual(originalJson)
  })

  it('should handle missing sections in imported JSON', () => {
    const baseJson = {
      type: 'drum',
      engine: {
        volume: 26214
      }
    }

    const importedJson = {
      type: 'drum'
    }

    mergeImportedDrumSettings(baseJson, importedJson)

    expect(baseJson.engine.volume).toBe(26214)
  })
})

describe('mergeImportedMultisampleSettings', () => {
  it('should merge imported settings into base JSON', () => {
         const baseJson: any = {
       type: 'multisampler',
       engine: {
         volume: 26214
       }
     }

     const importedJson = {
       type: 'multisampler',
       engine: {
         transpose: 12
       },
       envelope: {
         attack: 100
       }
     }

     mergeImportedMultisampleSettings(baseJson, importedJson)

     expect(baseJson.engine.transpose).toBe(12)
     expect(baseJson.engine.volume).toBe(26214)
     expect(baseJson.envelope).toBeDefined()
  })

  it('should handle missing imported JSON', () => {
    const baseJson = {
      type: 'multisampler',
      engine: {
        volume: 26214
      }
    }

    const originalJson = JSON.parse(JSON.stringify(baseJson))

    mergeImportedMultisampleSettings(baseJson, undefined)

    expect(baseJson).toEqual(originalJson)
  })
})