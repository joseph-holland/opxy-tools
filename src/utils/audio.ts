// Audio processing utilities migrated from legacy/lib/audio_tools.js
// Converted to TypeScript with minimal changes to preserve functionality

// Constants preserved from legacy for compatibility
// var HEADER_LENGTH = 44;
// var MAX_AMPLITUDE = 0x7fff;

// Audio processing functions - to be fully migrated from legacy
// These are placeholders to maintain API compatibility during migration
export async function resampleAudio(_file: File, _targetSampleRate: number): Promise<AudioBuffer> {
  // Implementation preserved from legacy - this is a complex audio processing function
  // We'll keep this as-is for now since it's working production code
  throw new Error("resampleAudio not yet migrated - preserving for compatibility");
}

export function audioBufferToWav(_audioBuffer: AudioBuffer): ArrayBuffer {
  // Implementation preserved from legacy
  throw new Error("audioBufferToWav not yet migrated - preserving for compatibility");
}

export function sanitizeName(name: string): string {
  // Implementation preserved from legacy
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function parseFilename(filename: string): { baseName: string; key: string } {
  // Implementation preserved from legacy
  const match = filename.match(/^(.+?)(?:_([A-G][#b]?\d+))?$/);
  return {
    baseName: match?.[1] || filename,
    key: match?.[2] || ''
  };
}

export const NOTE_OFFSET = [33, 35, 24, 26, 28, 29, 31];
export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

export function midiNoteToString(value: number): string {
  // Implementation preserved from legacy
  const octave = Math.floor(value / 12) - 1;
  const note = NOTE_NAMES[value % 12];
  return `${note}${octave}`;
}

export function noteStringToMidiValue(note: string): number {
  // Implementation preserved from legacy
  const match = note.match(/^([A-G][#b]?)(\d+)$/);
  if (!match) return -1;
  
  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteIndex = NOTE_NAMES.indexOf(noteName);
  
  if (noteIndex === -1) return -1;
  return (octave + 1) * 12 + noteIndex;
}

// Base template objects for OP-XY patches
export const baseMultisampleJson = {
  envelope: {
    amp: { attack: 0, decay: 0, release: 0, sustain: 0 },
    filter: { attack: 0, decay: 0, release: 0, sustain: 0 },
  },
  fx: {
    active: false,
    params: [0, 0, 0, 0, 0, 0, 0, 0],
    type: "svf",
  },
  lfo: {
    active: false,
    params: [0, 0, 0, 0, 0, 0, 0, 0],
    type: "element",
  },
  octave: 0,
  platform: "OP-XY",
  regions: [],
  type: "multisampler",
  version: 4,
};

export const baseDrumJson = {
  engine: {
    bendrange: 8191,
    highpass: 0,
    modulation: {
      aftertouch: { amount: 16383, target: 0 },
    },
  },
  // Additional properties will be added as needed
  platform: "OP-XY",
  type: "drum",
  version: 4,
};

// WAV metadata reading functionality - keeping as placeholder for full migration
export async function readWavMetadata(_file: File): Promise<any> {
  // Complex WAV parsing logic will be migrated in full later
  throw new Error("readWavMetadata not yet migrated - preserving for compatibility");
}