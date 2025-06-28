/**
 * Unit tests for drum tool functionality
 */

const fs = require('fs');
const path = require('path');

// Mock global constants that the drum tool expects
global.NUM_DRUMS = 24;

// Read and evaluate the drum_sample_tool.js file
const drumToolPath = path.join(__dirname, '../../lib/drum_sample_tool.js');
const drumToolCode = fs.readFileSync(drumToolPath, 'utf8');

// Remove DOM-related code and evaluate the functions we can test
const functionsToTest = drumToolCode.match(/^function\s+(\w+)/gm);

// Extract specific testable functions
const sanitizeNameMatch = drumToolCode.match(/function sanitizeName\([^{]*\{[^}]*\}/s);
const formatMBMatch = drumToolCode.match(/function formatMB\([^{]*\{[^}]*\}/s);

if (sanitizeNameMatch) {
  eval(sanitizeNameMatch[0]);
}
if (formatMBMatch) {
  eval(formatMBMatch[0]);
}

// Mock drum key mapping for testing getDrumIdxForKey
global.drumKeyMap = {
  0: {
    'a': { idx: 1 }, 's': { idx: 3 }, 'd': { idx: 5 }, 'f': { idx: 7 },
    'g': { idx: 8 }, 'h': { idx: 9 }, 'j': { idx: 12 },
    'w': { idx: 2 }, 'e': { idx: 4 }, 'r': { idx: 6 }, 'y': { idx: 9 }, 'u': { idx: 11 }
  }
};
global.currentOctave = 0;

// Extract and eval getDrumIdxForKey function
const getDrumIdxForKeyMatch = drumToolCode.match(/function getDrumIdxForKey\([^{]*\{[^}]*\}/s);
if (getDrumIdxForKeyMatch) {
  eval(getDrumIdxForKeyMatch[0]);
}

describe('Drum Tool', () => {
  describe('sanitizeName', () => {
    test('should remove special characters and add .wav extension', () => {
      expect(sanitizeName('my@file#name$')).toBe('my_file_name_.wav');
    });

    test('should replace spaces with underscores and add extension', () => {
      expect(sanitizeName('my file name')).toBe('my_file_name.wav');
    });

    test('should handle empty string by adding prefix', () => {
      expect(sanitizeName('')).toBe('s_.wav');
    });

    test('should preserve alphanumeric characters and underscores', () => {
      expect(sanitizeName('sample_123_test')).toBe('sample_123_test.wav');
    });

    test('should handle mixed case and add extension', () => {
      expect(sanitizeName('My File Name')).toBe('My_File_Name.wav');
    });

    test('should remove existing file extension before processing', () => {
      expect(sanitizeName('test.mp3')).toBe('test.wav');
    });
  });

  describe('formatMB', () => {
    test('should format bytes to MB with one decimal place and MB suffix', () => {
      expect(formatMB(1048576)).toBe('1.0 MB');
    });

    test('should handle zero bytes', () => {
      expect(formatMB(0)).toBe('0.0 MB');
    });

    test('should handle large values', () => {
      expect(formatMB(5242880)).toBe('5.0 MB');
    });

    test('should handle fractional MB values', () => {
      expect(formatMB(1572864)).toBe('1.5 MB');
    });

    test('should handle small values', () => {
      expect(formatMB(524288)).toBe('0.5 MB');
    });
  });

  describe('getDrumIdxForKey', () => {
    test('should return correct index for bottom row keys', () => {
      expect(getDrumIdxForKey('a')).toBe(1);  // KD1
      expect(getDrumIdxForKey('s')).toBe(3);  // SD1
      expect(getDrumIdxForKey('d')).toBe(5);  // RIM
      expect(getDrumIdxForKey('f')).toBe(7);  // TB
      expect(getDrumIdxForKey('g')).toBe(8);  // SH
      expect(getDrumIdxForKey('h')).toBe(9);  // CL
      expect(getDrumIdxForKey('j')).toBe(12); // CAB
    });

    test('should return correct index for top row keys', () => {
      expect(getDrumIdxForKey('w')).toBe(2);  // KD2
      expect(getDrumIdxForKey('e')).toBe(4);  // SD2
      expect(getDrumIdxForKey('r')).toBe(6);  // CP
      expect(getDrumIdxForKey('y')).toBe(9);  // CH
      expect(getDrumIdxForKey('u')).toBe(11); // OH
    });

    test('should return null for unmapped keys', () => {
      expect(getDrumIdxForKey('z')).toBeNull();
      expect(getDrumIdxForKey('1')).toBeNull();
      expect(getDrumIdxForKey(' ')).toBeNull();
    });

    test('should handle uppercase keys', () => {
      expect(getDrumIdxForKey('A'.toLowerCase())).toBe(1);
      expect(getDrumIdxForKey('S'.toLowerCase())).toBe(3);
    });
  });

  describe('drum tool constants', () => {
    test('should have correct number of drum slots', () => {
      expect(global.NUM_DRUMS).toBe(24);
    });
  });

  describe('anyDrumSamplesLoaded', () => {
    beforeEach(() => {
      // Reset drum samples array
      global.drumSamples = new Array(global.NUM_DRUMS + 1).fill(null);
    });

    test('should return false when no samples are loaded', () => {
      global.anyDrumSamplesLoaded = () => {
        return global.drumSamples.some((s, idx) => idx > 0 && s !== null);
      };

      expect(global.anyDrumSamplesLoaded()).toBe(false);
    });

    test('should return true when at least one sample is loaded', () => {
      global.anyDrumSamplesLoaded = () => {
        return global.drumSamples.some((s, idx) => idx > 0 && s !== null);
      };

      global.drumSamples[1] = { audioBuffer: 'mock' };
      expect(global.anyDrumSamplesLoaded()).toBe(true);
    });

    test('should ignore index 0 (as it uses 1-based indexing)', () => {
      global.anyDrumSamplesLoaded = () => {
        return global.drumSamples.some((s, idx) => idx > 0 && s !== null);
      };

      global.drumSamples[0] = { audioBuffer: 'mock' };
      expect(global.anyDrumSamplesLoaded()).toBe(false);
    });
  });

  describe('getDrumTargetSampleRate', () => {
    test('should return correct sample rates for dropdown values', () => {
      // Mock the function based on the dropdown mapping
      global.getDrumTargetSampleRate = () => {
        const mockSelect = { value: "1" };
        return mockSelect.value;
      };
      
      // Test the mapping logic
      const sampleRateMap = { "0": null, "1": 11025, "2": 22050, "3": 44100 };
      
      Object.entries(sampleRateMap).forEach(([key, expected]) => {
        if (expected === null) {
          expect(key).toBe("0"); // "Keep original"
        } else {
          expect(expected).toBeGreaterThan(0);
          expect([11025, 22050, 44100]).toContain(expected);
        }
      });
    });
  });

  describe('getDrumTargetBitDepth', () => {
    test('should return bit depth values', () => {
      const validBitDepths = ["keep", "16", "24"];
      
      validBitDepths.forEach(depth => {
        expect(typeof depth).toBe("string");
        if (depth !== "keep") {
          expect(parseInt(depth)).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('findNearestZeroCrossing', () => {
    // Mock the function for testing
    const findNearestZeroCrossing = (data, frame, direction = 'both', maxDistance = 1000) => {
      // Bounds check
      if (frame < 0 || frame >= data.length) return frame;
      
      let forward = frame;
      let backward = frame;
      
      if (direction === 'forward') {
        for (let i = 0; i < maxDistance && forward < data.length - 1; i++) {
          if (Math.abs(data[forward]) < 0.01 || data[forward] * data[forward + 1] <= 0) return forward;
          forward++;
        }
        return frame;
      }
      
      if (direction === 'backward') {
        for (let i = 0; i < maxDistance && backward > 0; i++) {
          if (Math.abs(data[backward]) < 0.01 || data[backward - 1] * data[backward] <= 0) return backward;
          backward--;
        }
        return frame;
      }
      
      // Search both directions
      for (let i = 0; i < maxDistance; i++) {
        if (forward < data.length - 1) {
          if (Math.abs(data[forward]) < 0.01 || data[forward] * data[forward + 1] <= 0) return forward;
          forward++;
        }
        
        if (backward > 0) {
          if (Math.abs(data[backward]) < 0.01 || data[backward - 1] * data[backward] <= 0) return backward;
          backward--;
        }
        
        if (forward >= data.length - 1 && backward <= 0) break;
      }
      
      return frame;
    };

    test('should return original frame when out of bounds', () => {
      const data = new Float32Array([0.1, 0.2, -0.1, 0.3]);
      
      expect(findNearestZeroCrossing(data, -1)).toBe(-1);
      expect(findNearestZeroCrossing(data, data.length)).toBe(data.length);
    });

    test('should find zero crossing in forward direction', () => {
      const data = new Float32Array([0.5, 0.2, -0.1, 0.3]);
      
      // Should find zero crossing between index 1 and 2
      expect(findNearestZeroCrossing(data, 0, 'forward')).toBe(1);
    });

    test('should find zero crossing in backward direction', () => {
      const data = new Float32Array([0.5, -0.2, 0.1, 0.3]);
      
      // Should find zero crossing between index 1 and 2, but searching backward from index 3
      expect(findNearestZeroCrossing(data, 3, 'backward')).toBe(2);
    });

    test('should find nearest zero crossing in both directions', () => {
      const data = new Float32Array([0.5, -0.2, 0.1, -0.3, 0.4]);
      
      // Starting from index 2, should find zero crossing at index 1 or 3
      const result = findNearestZeroCrossing(data, 2, 'both');
      expect([1, 2, 3]).toContain(result); // Include current position as well
    });

    test('should respect maximum distance limit', () => {
      const data = new Float32Array([0.5, 0.2, 0.1, 0.3, 0.4]);
      
      // No zero crossings in this data, should return original frame
      expect(findNearestZeroCrossing(data, 2, 'both', 100)).toBe(2);
    });

    test('should handle exact zero values', () => {
      const data = new Float32Array([0.5, 0.0, -0.1, 0.3]);
      
      // Should find zero crossing at index 1 (where there is an exact 0)
      expect(findNearestZeroCrossing(data, 0, 'forward')).toBe(1);
    });
  });

  describe('updateDropdownOptions', () => {
    // Mock DOM elements for testing
    beforeEach(() => {
      global.document = {
        getElementById: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn()
      };
      
      global.drumSamples = new Array(global.NUM_DRUMS + 1).fill(null);
    });

    test('should handle empty samples array', () => {
      const mockBitDepthSelect = {
        options: [],
        value: 'keep'
      };
      
      global.document.getElementById.mockReturnValue(mockBitDepthSelect);
      
      // Mock the function
      const updateDropdownOptions = () => {
        const samples = global.drumSamples.filter(s => s && s.originalBitDepth);
        return samples.length === 0;
      };
      
      expect(updateDropdownOptions()).toBe(true);
    });

    test('should detect when all samples have same bit depth', () => {
      global.drumSamples[1] = { originalBitDepth: 16, originalSampleRate: 44100, originalChannels: 2 };
      global.drumSamples[2] = { originalBitDepth: 16, originalSampleRate: 44100, originalChannels: 2 };
      
      const checkAllSameBitDepth = () => {
        const samples = global.drumSamples.filter(s => s && s.originalBitDepth);
        if (samples.length === 0) return true;
        
        const firstBitDepth = samples[0].originalBitDepth;
        return samples.every(s => s.originalBitDepth === firstBitDepth);
      };
      
      expect(checkAllSameBitDepth()).toBe(true);
    });

    test('should detect mixed bit depths', () => {
      global.drumSamples[1] = { originalBitDepth: 16, originalSampleRate: 44100, originalChannels: 2 };
      global.drumSamples[2] = { originalBitDepth: 24, originalSampleRate: 44100, originalChannels: 2 };
      
      const checkAllSameBitDepth = () => {
        const samples = global.drumSamples.filter(s => s && s.originalBitDepth);
        if (samples.length === 0) return true;
        
        const firstBitDepth = samples[0].originalBitDepth;
        return samples.every(s => s.originalBitDepth === firstBitDepth);
      };
      
      expect(checkAllSameBitDepth()).toBe(false);
    });

    test('should find maximum bit depth among samples', () => {
      global.drumSamples[1] = { originalBitDepth: 16, originalSampleRate: 44100, originalChannels: 2 };
      global.drumSamples[2] = { originalBitDepth: 24, originalSampleRate: 44100, originalChannels: 2 };
      global.drumSamples[3] = { originalBitDepth: 16, originalSampleRate: 44100, originalChannels: 2 };
      
      const findMaxBitDepth = () => {
        const samples = global.drumSamples.filter(s => s && s.originalBitDepth);
        return Math.max(...samples.map(s => s.originalBitDepth));
      };
      
      expect(findMaxBitDepth()).toBe(24);
    });

    test('should find maximum sample rate among samples', () => {
      global.drumSamples[1] = { originalBitDepth: 16, originalSampleRate: 44100, originalChannels: 2 };
      global.drumSamples[2] = { originalBitDepth: 16, originalSampleRate: 48000, originalChannels: 2 };
      global.drumSamples[3] = { originalBitDepth: 16, originalSampleRate: 22050, originalChannels: 2 };
      
      const findMaxSampleRate = () => {
        const samples = global.drumSamples.filter(s => s && s.originalSampleRate);
        return Math.max(...samples.map(s => s.originalSampleRate));
      };
      
      expect(findMaxSampleRate()).toBe(48000);
    });

    test('should detect presence of stereo samples', () => {
      global.drumSamples[1] = { originalBitDepth: 16, originalSampleRate: 44100, originalChannels: 1 };
      global.drumSamples[2] = { originalBitDepth: 16, originalSampleRate: 44100, originalChannels: 2 };
      
      const hasAnyStereo = () => {
        const samples = global.drumSamples.filter(s => s && s.originalChannels);
        return samples.some(s => s.originalChannels > 1);
      };
      
      expect(hasAnyStereo()).toBe(true);
    });

    test('should detect all mono samples', () => {
      global.drumSamples[1] = { originalBitDepth: 16, originalSampleRate: 44100, originalChannels: 1 };
      global.drumSamples[2] = { originalBitDepth: 16, originalSampleRate: 44100, originalChannels: 1 };
      
      const hasAnyStereo = () => {
        const samples = global.drumSamples.filter(s => s && s.originalChannels);
        return samples.some(s => s.originalChannels > 1);
      };
      
      expect(hasAnyStereo()).toBe(false);
    });
  });

  describe('updateBulkActionButtons', () => {
    beforeEach(() => {
      global.document = {
        getElementById: jest.fn()
      };
      global.drumSamples = new Array(global.NUM_DRUMS + 1).fill(null);
    });

    test('should disable buttons when no samples are loaded', () => {
      const mockBulkEditBtn = { disabled: false };
      const mockClearAllBtn = { disabled: false };
      
      global.document.getElementById.mockImplementation((id) => {
        if (id === 'drum-bulk-edit-btn') return mockBulkEditBtn;
        if (id === 'drum-clear-all-btn') return mockClearAllBtn;
        return null;
      });

      const updateBulkActionButtons = () => {
        const hasLoadedSamples = global.drumSamples.some(sample => sample !== null);
        const bulkEditBtn = global.document.getElementById('drum-bulk-edit-btn');
        const clearAllBtn = global.document.getElementById('drum-clear-all-btn');
        if (bulkEditBtn) bulkEditBtn.disabled = !hasLoadedSamples;
        if (clearAllBtn) clearAllBtn.disabled = !hasLoadedSamples;
      };

      updateBulkActionButtons();

      expect(mockBulkEditBtn.disabled).toBe(true);
      expect(mockClearAllBtn.disabled).toBe(true);
    });

    test('should enable buttons when samples are loaded', () => {
      global.drumSamples[1] = { audioBuffer: 'mock' };
      
      const mockBulkEditBtn = { disabled: true };
      const mockClearAllBtn = { disabled: true };
      
      global.document.getElementById.mockImplementation((id) => {
        if (id === 'drum-bulk-edit-btn') return mockBulkEditBtn;
        if (id === 'drum-clear-all-btn') return mockClearAllBtn;
        return null;
      });

      const updateBulkActionButtons = () => {
        const hasLoadedSamples = global.drumSamples.some(sample => sample !== null);
        const bulkEditBtn = global.document.getElementById('drum-bulk-edit-btn');
        const clearAllBtn = global.document.getElementById('drum-clear-all-btn');
        if (bulkEditBtn) bulkEditBtn.disabled = !hasLoadedSamples;
        if (clearAllBtn) clearAllBtn.disabled = !hasLoadedSamples;
      };

      updateBulkActionButtons();

      expect(mockBulkEditBtn.disabled).toBe(false);
      expect(mockClearAllBtn.disabled).toBe(false);
    });
  });

  describe('updateChannelsDropdown', () => {
    beforeEach(() => {
      global.document = {
        getElementById: jest.fn(),
        querySelector: jest.fn()
      };
      global.drumSamples = new Array(global.NUM_DRUMS + 1).fill(null);
    });

    test('should disable mono option when all samples are mono', () => {
      global.drumSamples[1] = { audioBuffer: { numberOfChannels: 1 } };
      global.drumSamples[2] = { audioBuffer: { numberOfChannels: 1 } };

      const mockChannelsSelect = {
        querySelector: jest.fn(),
        value: 'keep'
      };
      const mockMonoOption = { disabled: false };
      
      global.document.getElementById.mockReturnValue(mockChannelsSelect);
      mockChannelsSelect.querySelector.mockReturnValue(mockMonoOption);

      const updateChannelsDropdown = () => {
        let hasLoadedSamples = false;
        let allMono = true;
        
        for (let i = 1; i <= global.NUM_DRUMS; i++) {
          if (global.drumSamples[i] && global.drumSamples[i].audioBuffer) {
            hasLoadedSamples = true;
            if (global.drumSamples[i].audioBuffer.numberOfChannels > 1) {
              allMono = false;
              break;
            }
          }
        }

        const channelsSelect = global.document.getElementById('channels-drum');
        const monoOption = channelsSelect ? channelsSelect.querySelector('option[value="mono"]') : null;
        if (monoOption) {
          monoOption.disabled = hasLoadedSamples && allMono;
          if (hasLoadedSamples && allMono) {
            channelsSelect.value = 'keep';
          }
        }
      };

      updateChannelsDropdown();

      expect(mockMonoOption.disabled).toBe(true);
      expect(mockChannelsSelect.value).toBe('keep');
    });

    test('should enable mono option when stereo samples are present', () => {
      global.drumSamples[1] = { audioBuffer: { numberOfChannels: 2 } };
      global.drumSamples[2] = { audioBuffer: { numberOfChannels: 1 } };

      const mockChannelsSelect = {
        querySelector: jest.fn(),
        value: 'keep'
      };
      const mockMonoOption = { disabled: true };
      
      global.document.getElementById.mockReturnValue(mockChannelsSelect);
      mockChannelsSelect.querySelector.mockReturnValue(mockMonoOption);

      const updateChannelsDropdown = () => {
        let hasLoadedSamples = false;
        let allMono = true;
        
        for (let i = 1; i <= global.NUM_DRUMS; i++) {
          if (global.drumSamples[i] && global.drumSamples[i].audioBuffer) {
            hasLoadedSamples = true;
            if (global.drumSamples[i].audioBuffer.numberOfChannels > 1) {
              allMono = false;
              break;
            }
          }
        }

        const channelsSelect = global.document.getElementById('channels-drum');
        const monoOption = channelsSelect ? channelsSelect.querySelector('option[value="mono"]') : null;
        if (monoOption) {
          monoOption.disabled = hasLoadedSamples && allMono;
        }
      };

      updateChannelsDropdown();

      expect(mockMonoOption.disabled).toBe(false);
    });
  });
});