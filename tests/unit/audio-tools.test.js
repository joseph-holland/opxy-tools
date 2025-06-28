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

  describe('getEffectiveSampleRate', () => {
    test('should return original rate when selectedRate is "0"', () => {
      expect(getEffectiveSampleRate(44100, "0")).toBe(44100);
      expect(getEffectiveSampleRate(48000, "0")).toBe(48000);
    });

    test('should return target rate for 48kHz samples', () => {
      expect(getEffectiveSampleRate(48000, "1")).toBe(11025);
      expect(getEffectiveSampleRate(48000, "2")).toBe(22050);
      expect(getEffectiveSampleRate(48000, "3")).toBe(44100);
    });

    test('should prevent upsampling for non-48kHz samples', () => {
      expect(getEffectiveSampleRate(22050, "3")).toBe(22050); // Won't upsample 22050 to 44100
      expect(getEffectiveSampleRate(44100, "3")).toBe(44100); // Same rate, no change
      expect(getEffectiveSampleRate(11025, "2")).toBe(11025); // Won't upsample 11025 to 22050
    });

    test('should handle numeric selectedRate values', () => {
      expect(getEffectiveSampleRate(48000, 1)).toBe(11025);
      expect(getEffectiveSampleRate(48000, 2)).toBe(22050);
      expect(getEffectiveSampleRate(48000, 3)).toBe(44100);
    });

    test('should return original rate for invalid selectedRate', () => {
      expect(getEffectiveSampleRate(44100, "invalid")).toBe(44100);
      expect(getEffectiveSampleRate(44100, "")).toBe(44100);
    });
  });

  describe('getEffectiveBitDepth', () => {
    test('should return original bit depth when selectedBitDepth is "keep"', () => {
      expect(getEffectiveBitDepth(16, "keep")).toBe(16);
      expect(getEffectiveBitDepth(24, "keep")).toBe(24);
    });

    test('should prevent up-biting from 16-bit', () => {
      expect(getEffectiveBitDepth(16, "16")).toBe(16);
      expect(getEffectiveBitDepth(16, "24")).toBe(16); // Won't up-bit
    });

    test('should allow down-biting from 24-bit', () => {
      expect(getEffectiveBitDepth(24, "16")).toBe(16);
      expect(getEffectiveBitDepth(24, "24")).toBe(24);
    });

    test('should return original bit depth for invalid selections', () => {
      expect(getEffectiveBitDepth(16, "invalid")).toBe(16);
      expect(getEffectiveBitDepth(24, "")).toBe(24);
    });
  });

  describe('getEffectiveChannels', () => {
    test('should return 1 for mono selection', () => {
      expect(getEffectiveChannels(1, "mono")).toBe(1);
      expect(getEffectiveChannels(2, "mono")).toBe(1);
    });

    test('should return original channels for "keep" selection', () => {
      expect(getEffectiveChannels(1, "keep")).toBe(1);
      expect(getEffectiveChannels(2, "keep")).toBe(2);
    });

    test('should return original channels for invalid selections', () => {
      expect(getEffectiveChannels(2, "invalid")).toBe(2);
      expect(getEffectiveChannels(1, "")).toBe(1);
    });
  });

  describe('formatFileSize', () => {
    test('should format zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    test('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    test('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048575)).toBe('1024.0 KB');
    });

    test('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(2097152)).toBe('2.0 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });
  });

  describe('calculateConvertedSampleCount', () => {
    test('should return original length when sample rates are equal', () => {
      const mockBuffer = { length: 44100 };
      expect(calculateConvertedSampleCount(mockBuffer, 44100, 44100)).toBe(44100);
    });

    test('should calculate correct sample count for downsampling', () => {
      const mockBuffer = { length: 44100 };
      expect(calculateConvertedSampleCount(mockBuffer, 22050, 44100)).toBe(22050);
    });

    test('should calculate correct sample count for upsampling', () => {
      const mockBuffer = { length:22050 };
      expect(calculateConvertedSampleCount(mockBuffer, 44100, 22050)).toBe(44100);
    });

    test('should handle fractional results by rounding', () => {
      const mockBuffer = { length: 44100 };
      const result = calculateConvertedSampleCount(mockBuffer, 48000, 44100);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('willConvert', () => {
    const mockSample = {
      originalBitDepth: 16,
      originalSampleRate: 44100,
      originalChannels: 2
    };

    test('should return false when no conversion is needed', () => {
      expect(willConvert(mockSample, "keep", 44100, "keep")).toBe(false);
    });

    test('should return true when bit depth conversion is needed', () => {
      expect(willConvert(mockSample, "24", 44100, "keep")).toBe(true);
    });

    test('should return true when sample rate conversion is needed', () => {
      expect(willConvert(mockSample, "keep", 22050, "keep")).toBe(true);
    });

    test('should return true when channel conversion is needed', () => {
      expect(willConvert(mockSample, "keep", 44100, "mono")).toBe(true);
    });

    test('should return false when bit depth is same as original', () => {
      expect(willConvert(mockSample, "16", 44100, "keep")).toBe(false);
    });

    test('should return false when converting mono to mono', () => {
      const monoSample = { ...mockSample, originalChannels: 1 };
      expect(willConvert(monoSample, "keep", 44100, "mono")).toBe(false);
    });
  });

  describe('convertChannels', () => {
    test('should return original buffer for mono input', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 1024,
        sampleRate: 44100
      };
      
      const result = convertChannels(mockBuffer);
      expect(result).toBe(mockBuffer);
    });

    test('should downmix stereo to mono', () => {
      const mockBuffer = {
        numberOfChannels: 2,
        length: 1024,
        sampleRate: 44100,
        getChannelData: jest.fn((channel) => {
          const data = new Float32Array(1024);
          // Fill with different values per channel for testing
          data.fill(channel === 0 ? 0.5 : -0.5);
          return data;
        })
      };

      const mockOfflineContext = {
        createBuffer: jest.fn(() => ({
          getChannelData: jest.fn(() => new Float32Array(1024))
        }))
      };
      
      global.OfflineAudioContext = jest.fn(() => mockOfflineContext);

      const result = convertChannels(mockBuffer);
      
      expect(global.OfflineAudioContext).toHaveBeenCalledWith(1, 1024, 44100);
      expect(mockOfflineContext.createBuffer).toHaveBeenCalledWith(1, 1024, 44100);
    });
  });

  describe('writeUint32', () => {
    test('should write 32-bit unsigned integer in big-endian format', () => {
      const arrayBuffer = new ArrayBuffer(8);
      const view = new DataView(arrayBuffer);
      
      writeUint32(view, 0, 0x12345678);
      
      expect(view.getUint32(0, false)).toBe(0x12345678);
    });
  });

  describe('writeUint32LE', () => {
    test('should write 32-bit unsigned integer in little-endian format', () => {
      const arrayBuffer = new ArrayBuffer(8);
      const view = new DataView(arrayBuffer);
      
      writeUint32LE(view, 0, 0x12345678);
      
      expect(view.getUint32(0, true)).toBe(0x12345678);
    });
  });

  describe('writeUint16LE', () => {
    test('should write 16-bit unsigned integer in little-endian format', () => {
      const arrayBuffer = new ArrayBuffer(8);
      const view = new DataView(arrayBuffer);
      
      writeUint16LE(view, 0, 0x1234);
      
      expect(view.getUint16(0, true)).toBe(0x1234);
    });
  });

  describe('writeInt16LE', () => {
    test('should write 16-bit signed integer in little-endian format', () => {
      const arrayBuffer = new ArrayBuffer(8);
      const view = new DataView(arrayBuffer);
      
      writeInt16LE(view, 0, -1234);
      
      expect(view.getInt16(0, true)).toBe(-1234);
    });
  });

  describe('writeInt24LE', () => {
    test('should write 24-bit signed integer in little-endian format', () => {
      const arrayBuffer = new ArrayBuffer(8);
      const view = new DataView(arrayBuffer);
      
      writeInt24LE(view, 0, 0x123456);
      
      // Verify the three bytes were written correctly
      expect(view.getInt8(0)).toBe(0x56);
      expect(view.getInt8(1)).toBe(0x34);
      expect(view.getInt8(2)).toBe(0x12);
    });

    test('should clamp values to 24-bit signed integer range', () => {
      const arrayBuffer = new ArrayBuffer(8);
      const view = new DataView(arrayBuffer);
      
      // Test upper bound clamping
      writeInt24LE(view, 0, 10000000);
      expect(view.getInt8(0)).toBe(-1); // 0xff as signed is -1
      expect(view.getInt8(1)).toBe(-1); // 0xff as signed is -1
      expect(view.getInt8(2)).toBe(127); // 0x7f as signed is 127
      
      // Test lower bound clamping
      writeInt24LE(view, 3, -10000000);
      expect(view.getInt8(3)).toBe(0x00);
      expect(view.getInt8(4)).toBe(0x00);
      expect(view.getInt8(5)).toBe(-128); // 0x80 as signed is -128
    });
  });

  describe('audioBufferToWavWithBitDepth', () => {
    test('should use specified bit depth', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 1024,
        sampleRate: 44100,
        getChannelData: jest.fn(() => new Float32Array(1024))
      };

      const result16 = audioBufferToWavWithBitDepth(mockBuffer, 16);
      const result24 = audioBufferToWavWithBitDepth(mockBuffer, 24);

      expect(result16).toBeInstanceOf(global.Blob);
      expect(result24).toBeInstanceOf(global.Blob);
      expect(result24.size).toBeGreaterThan(result16.size); // 24-bit should be larger
    });

    test('should fallback to 16-bit for "keep" option', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 1024,
        sampleRate: 44100,
        getChannelData: jest.fn(() => new Float32Array(1024))
      };

      const result = audioBufferToWavWithBitDepth(mockBuffer, "keep");
      expect(result).toBeInstanceOf(global.Blob);
    });

    test('should fallback to 16-bit for invalid bit depth', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 1024,
        sampleRate: 44100,
        getChannelData: jest.fn(() => new Float32Array(1024))
      };

      const result = audioBufferToWavWithBitDepth(mockBuffer, "invalid");
      expect(result).toBeInstanceOf(global.Blob);
    });
  });

  describe('encodeAudioBufferAsWavBlob', () => {
    test('should encode mono buffer to WAV', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        sampleRate: 44100,
        length: 1024,
        getChannelData: jest.fn(() => {
          const data = new Float32Array(1024);
          data.fill(0.5);
          return data;
        })
      };

      const result = encodeAudioBufferAsWavBlob(mockBuffer, 16);

      expect(result).toBeInstanceOf(global.Blob);
      expect(result.type).toBe('audio/wav');
      // Check size: 44 byte header + (1024 samples * 1 channel * 2 bytes)
      expect(result.size).toBe(44 + 1024 * 1 * 2);
    });

    test('should encode stereo buffer to WAV', () => {
      const mockBuffer = {
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 1024,
        getChannelData: jest.fn(() => {
          const data = new Float32Array(1024);
          data.fill(0.5);
          return data;
        })
      };

      const result = encodeAudioBufferAsWavBlob(mockBuffer, 16);

      expect(result).toBeInstanceOf(global.Blob);
      expect(result.type).toBe('audio/wav');
      // Check size: 44 byte header + (1024 samples * 2 channels * 2 bytes)
      expect(result.size).toBe(44 + 1024 * 2 * 2);
    });

    test('should encode 24-bit audio correctly', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        sampleRate: 44100,
        length: 1024,
        getChannelData: jest.fn(() => {
          const data = new Float32Array(1024);
          data.fill(0.5);
          return data;
        })
      };

      const result = encodeAudioBufferAsWavBlob(mockBuffer, 24);

      expect(result).toBeInstanceOf(global.Blob);
      expect(result.type).toBe('audio/wav');
      // Check size: 44 byte header + (1024 samples * 1 channel * 3 bytes)
      expect(result.size).toBe(44 + 1024 * 1 * 3);
    });

    test('should clamp sample values to valid range', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        sampleRate: 44100,
        length: 3,
        getChannelData: jest.fn(() => {
          const data = new Float32Array(3);
          data[0] = 2.0;  // Above range, should clamp to 1.0
          data[1] = -2.0; // Below range, should clamp to -1.0
          data[2] = 0.5;  // Normal value
          return data;
        })
      };

      const result = encodeAudioBufferAsWavBlob(mockBuffer, 16);
      expect(result).toBeInstanceOf(global.Blob);
    });
  });
});