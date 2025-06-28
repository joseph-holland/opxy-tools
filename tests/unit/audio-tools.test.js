/**
 * Unit tests for audio processing utilities
 */

// Load the audio_tools.js file for testing
// Since we're testing browser code, we need to simulate loading the script
const fs = require('fs');
const path = require('path');

// Read and evaluate the audio_tools.js file
const audioToolsPath = path.join(__dirname, '../../lib/audio_tools.js');
const audioToolsCode = fs.readFileSync(audioToolsPath, 'utf8');

// Remove any references to browser-specific APIs that we'll mock
const modifiedCode = audioToolsCode
  .replace(/new AudioContext\(\)/g, 'new global.AudioContext()')
  .replace(/new OfflineAudioContext\(/g, 'new global.OfflineAudioContext(')
  .replace(/new File\(/g, 'new global.File(')
  .replace(/new Blob\(/g, 'new global.Blob(');

// Evaluate the code in the current context
eval(modifiedCode);

describe('Audio Tools', () => {
  describe('audioBufferToWav', () => {
    test('should convert mono AudioBuffer to WAV blob', () => {
      const mockBuffer = new global.AudioContext().createBuffer(1, 1024, 44100);
      mockBuffer.numberOfChannels = 1;
      mockBuffer.length = 1024;
      mockBuffer.sampleRate = 44100;
      mockBuffer.getChannelData = jest.fn(() => new Float32Array(1024));

      const result = audioBufferToWav(mockBuffer);

      expect(result).toBeInstanceOf(global.Blob);
      expect(result.type).toBe('audio/x-wav');
    });

    test('should convert stereo AudioBuffer to WAV blob', () => {
      const mockBuffer = new global.AudioContext().createBuffer(2, 1024, 44100);
      mockBuffer.numberOfChannels = 2;
      mockBuffer.length = 1024;
      mockBuffer.sampleRate = 44100;
      mockBuffer.getChannelData = jest.fn((channel) => new Float32Array(1024));

      const result = audioBufferToWav(mockBuffer);

      expect(result).toBeInstanceOf(global.Blob);
      expect(result.type).toBe('audio/x-wav');
      expect(mockBuffer.getChannelData).toHaveBeenCalledTimes(2);
    });

    test('should throw error for unsupported channel count', () => {
      const mockBuffer = {
        numberOfChannels: 3,
        length: 1024,
        sampleRate: 44100
      };

      expect(() => audioBufferToWav(mockBuffer)).toThrow('Expecting mono or stereo audioBuffer');
    });
  });

  describe('sanitizeName', () => {
    test('should remove invalid characters from filename', () => {
      const input = 'test@file#name$.wav';
      const result = sanitizeName(input);
      expect(result).toBe('testfile#name.wav');
    });

    test('should preserve valid characters', () => {
      const input = 'Valid Name-123 (#2).wav';
      const result = sanitizeName(input);
      expect(result).toBe('Valid Name-123 (#2).wav');
    });

    test('should handle empty string', () => {
      const result = sanitizeName('');
      expect(result).toBe('');
    });
  });

  describe('parseFilename', () => {
    test('should parse filename with MIDI note', () => {
      const filename = 'kick_C4.wav';
      const [baseName, midiNote] = parseFilename(filename);
      expect(baseName).toBe('kick');
      expect(midiNote).toBe(72); // C4 in this system
    });

    test('should parse filename with number', () => {
      const filename = 'sample-123.wav';
      const [baseName, number] = parseFilename(filename);
      expect(baseName).toBe('sample');
      expect(number).toBe(123);
    });

    test('should handle sharp notes', () => {
      const filename = 'lead_F#3.wav';
      const [baseName, midiNote] = parseFilename(filename);
      expect(baseName).toBe('lead');
      expect(midiNote).toBe(66); // F#3 in this system
    });

    test('should handle flat notes', () => {
      const filename = 'bass_Bb2.wav';
      const [baseName, midiNote] = parseFilename(filename);
      expect(baseName).toBe('bass');
      expect(midiNote).toBe(58); // Bb2 in this system
    });

    test('should throw error for invalid filename format', () => {
      const filename = 'invalid_filename.wav';
      expect(() => parseFilename(filename)).toThrow('does not match the expected pattern');
    });
  });

  describe('midiNoteToString', () => {
    test('should convert MIDI note 72 to C4', () => {
      const result = midiNoteToString(72);
      expect(result).toBe('C4');
    });

    test('should convert MIDI note 81 to A4', () => {
      const result = midiNoteToString(81);
      expect(result).toBe('A4');
    });

    test('should handle low notes', () => {
      const result = midiNoteToString(24);
      expect(result).toBe('C0');
    });

    test('should handle high notes', () => {
      const result = midiNoteToString(108);
      expect(result).toBe('C7');
    });
  });

  describe('noteStringToMidiValue', () => {
    test('should convert C4 to MIDI note 72', () => {
      const result = noteStringToMidiValue('C4');
      expect(result).toBe(72);
    });

    test('should convert A4 to MIDI note 81', () => {
      const result = noteStringToMidiValue('A4');
      expect(result).toBe(81);
    });

    test('should handle sharp notes', () => {
      const result = noteStringToMidiValue('F#3');
      expect(result).toBe(66);
    });

    test('should handle flat notes', () => {
      const result = noteStringToMidiValue('Bb2');
      expect(result).toBe(58);
    });

    test('should handle lowercase notes', () => {
      const result = noteStringToMidiValue('c4');
      expect(result).toBe(72);
    });

    test('should throw error for invalid note format', () => {
      expect(() => noteStringToMidiValue('X')).toThrow('Bad note format');
    });

    test('should throw error for invalid note name', () => {
      expect(() => noteStringToMidiValue('H4')).toThrow('Bad note');
    });
  });

  describe('resampleAudio', () => {
    test('should resample audio file to target sample rate', async () => {
      const mockFile = new global.File(['test data'], 'test.wav', { type: 'audio/wav' });
      const targetSampleRate = 22050;

      const result = await resampleAudio(mockFile, targetSampleRate);

      expect(result).toBeInstanceOf(global.Blob);
      expect(result.type).toBe('audio/x-wav');
    });

    test('should handle resampling errors gracefully', async () => {
      const mockFile = new global.File(['invalid data'], 'test.wav', { type: 'audio/wav' });
      
      // Mock AudioContext to throw an error
      const originalAudioContext = global.AudioContext;
      global.AudioContext = jest.fn(() => ({
        decodeAudioData: jest.fn().mockRejectedValue(new Error('Invalid audio data'))
      }));

      await expect(resampleAudio(mockFile, 22050)).rejects.toThrow('Invalid audio data');

      // Restore original AudioContext
      global.AudioContext = originalAudioContext;
    });
  });
});