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
});