import { describe, it, expect } from 'vitest'
import { percentToInternal, internalToPercent, deepMerge } from '../../utils/valueConversions'

describe('percentToInternal', () => {
  it('should convert 0% to 0', () => {
    expect(percentToInternal(0)).toBe(0)
  })

  it('should convert 100% to 32767', () => {
    expect(percentToInternal(100)).toBe(32767)
  })

  it('should convert 50% to approximately 16384', () => {
    expect(percentToInternal(50)).toBe(16384)
  })

  it('should handle decimal percentages', () => {
    expect(percentToInternal(25.5)).toBe(8356)
  })

  it('should handle negative percentages', () => {
    expect(percentToInternal(-10)).toBe(-3277)
  })

  it('should handle percentages over 100', () => {
    expect(percentToInternal(150)).toBe(49151)
  })

  it('should round to nearest integer', () => {
    expect(percentToInternal(0.1)).toBe(33)
    expect(percentToInternal(0.01)).toBe(3)
  })

  it('should handle very small values', () => {
    expect(percentToInternal(0.001)).toBe(0)
  })
})

describe('internalToPercent', () => {
  it('should convert 0 to 0%', () => {
    expect(internalToPercent(0)).toBe(0)
  })

  it('should convert 32767 to 100%', () => {
    expect(internalToPercent(32767)).toBe(100)
  })

  it('should convert 16384 to approximately 50%', () => {
    expect(internalToPercent(16384)).toBe(50)
  })

  it('should handle negative values', () => {
    expect(internalToPercent(-3277)).toBe(-10)
  })

  it('should handle values over 32767', () => {
    expect(internalToPercent(49151)).toBe(150)
  })

  it('should round to nearest integer', () => {
    expect(internalToPercent(328)).toBe(1)
    expect(internalToPercent(100)).toBe(0)
  })

  it('should be inverse of percentToInternal for valid ranges', () => {
    const testValues = [0, 25, 50, 75, 100]
    testValues.forEach(percent => {
      const internal = percentToInternal(percent)
      const backToPercent = internalToPercent(internal)
      expect(backToPercent).toBe(percent)
    })
  })
})

describe('deepMerge', () => {
  it('should merge simple objects', () => {
    const target = { a: 1, b: 2 }
    const source = { b: 3, c: 4 }
    
    deepMerge(target, source)
    
    expect(target).toEqual({ a: 1, b: 3, c: 4 })
  })

  it('should merge nested objects', () => {
    const target = {
      level1: {
        a: 1,
        level2: {
          b: 2,
          c: 3
        }
      }
    }
    
    const source = {
      level1: {
        a: 10,
        level2: {
          c: 30,
          d: 40
        },
        e: 50
      }
    }
    
    deepMerge(target, source)
    
    expect(target).toEqual({
      level1: {
        a: 10,
        level2: {
          b: 2,
          c: 30,
          d: 40
        },
        e: 50
      }
    })
  })

  it('should handle arrays as primitive values (not merge)', () => {
    const target = { arr: [1, 2, 3] }
    const source = { arr: [4, 5] }
    
    deepMerge(target, source)
    
    expect(target).toEqual({ arr: [4, 5] })
  })

  it('should overwrite primitive values', () => {
    const target = { a: 'old', b: 123, c: true }
    const source = { a: 'new', b: 456, c: false }
    
    deepMerge(target, source)
    
    expect(target).toEqual({ a: 'new', b: 456, c: false })
  })

  it('should handle null and undefined values', () => {
    const target = { a: 1, b: 2, c: 3 }
    const source = { a: null, b: undefined, d: 4 }
    
    deepMerge(target, source)
    
    expect(target).toEqual({ a: null, b: undefined, c: 3, d: 4 })
  })

  it('should create nested objects when target property is primitive', () => {
    const target = { nested: 'string' }
    const source = { nested: { a: 1, b: 2 } }
    
    deepMerge(target, source)
    
    expect(target).toEqual({ nested: { a: 1, b: 2 } })
  })

  it('should handle empty objects', () => {
    const target = {}
    const source = { a: 1, b: { c: 2 } }
    
    deepMerge(target, source)
    
    expect(target).toEqual({ a: 1, b: { c: 2 } })
  })

  it('should not affect source object', () => {
    const target = { a: 1 }
    const source = { b: { c: 2 } }
    const originalSource = JSON.parse(JSON.stringify(source))
    
    deepMerge(target, source)
    
    expect(source).toEqual(originalSource)
  })

  it('should handle deep nesting', () => {
    const target = {
      a: {
        b: {
          c: {
            d: {
              e: 1
            }
          }
        }
      }
    }
    
    const source = {
      a: {
        b: {
          c: {
            d: {
              f: 2
            },
            g: 3
          }
        }
      }
    }
    
    deepMerge(target, source)
    
    expect(target).toEqual({
      a: {
        b: {
          c: {
            d: {
              e: 1,
              f: 2
            },
            g: 3
          }
        }
      }
    })
  })

  it('should handle function values', () => {
    const fn1 = () => 'fn1'
    const fn2 = () => 'fn2'
    
    const target = { func: fn1 }
    const source = { func: fn2 }
    
    deepMerge(target, source)
    
    expect(target.func).toBe(fn2)
  })

  it('should handle Date objects by merging properties', () => {
    const date1 = new Date('2023-01-01')
    const date2 = new Date('2023-12-31')
    
    const target = { date: date1 }
    const source = { date: date2 }
    
    deepMerge(target, source)
    
    // deepMerge treats Date objects as objects and tries to merge their properties
    // This results in the original date with merged enumerable properties from the source
    expect(target.date).toBeInstanceOf(Date)
    expect(target.date.getTime()).toBe(date1.getTime()) // Original date is preserved
  })
})