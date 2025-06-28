// Audio processing utilities migrated from legacy/lib/audio_tools.js
// Converted to TypeScript with minimal changes to preserve functionality

// Constants preserved from legacy for compatibility
const HEADER_LENGTH = 44;
const MAX_AMPLITUDE = 0x7fff;

// Resample audio to target sample rate using Web Audio API
export async function resampleAudio(file: File, targetSampleRate: number): Promise<Blob> {
  const audioContext = new AudioContext();

  try {
    // Read the file as an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Decode the audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Create an OfflineAudioContext with the target sample rate
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    );

    // Create a buffer source and connect it to the offline context
    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(offlineContext.destination);

    // Start playback in the offline context
    const duration =
      Math.ceil(audioBuffer.duration * targetSampleRate) / targetSampleRate;
    bufferSource.start(0, 0, duration);

    // Render the audio
    const renderedBuffer = await offlineContext.startRendering();

    // Convert the rendered buffer to a WAV file and return it
    return audioBufferToWav(renderedBuffer);
  } catch (error) {
    console.error("Error during audio resampling:", error);
    throw error; // Propagate the error for handling outside the function
  } finally {
    await audioContext.close();
  }
}

// Convert AudioBuffer to WAV format
export function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const nChannels = audioBuffer.numberOfChannels;
  if (nChannels !== 1 && nChannels !== 2) {
    throw new Error("Expecting mono or stereo audioBuffer");
  }

  const bufferLength = audioBuffer.length;
  const arrayBuffer = new ArrayBuffer(
    HEADER_LENGTH + 2 * bufferLength * nChannels
  );
  const int16 = new Int16Array(arrayBuffer);
  const uint8 = new Uint8Array(arrayBuffer);

  const sr = audioBuffer.sampleRate;
  const l2 = bufferLength * nChannels * 2; // subchunk2 = numSamples * numChannels * BitsPerSample / 8
  const l1 = l2 + 36; // chunkSize = subchunk + 36
  const br = sr * nChannels * 2; // bitrate = SampleRate * NumChannels * BitsPerSample / 8

  uint8.set([
    0x52, 0x49, 0x46, 0x46, // R I F F
    l1 & 255, (l1 >> 8) & 255, (l1 >> 16) & 255, (l1 >> 24) & 255, // chunk size
    0x57, 0x41, 0x56, 0x45, // W A V E
    0x66, 0x6d, 0x74, 0x20, // F T M █
    0x10, 0x00, 0x00, 0x00, // sub chunk size = 16
    0x01, 0x00, // audio format = 1 (PCM, linear quantization)
    nChannels, 0x00, // number of channels
    sr & 255, (sr >> 8) & 255, (sr >> 16) & 255, (sr >> 24) & 255, // sample rate
    br & 255, (br >> 8) & 255, (br >> 16) & 255, (br >> 24) & 255, // byte rate
    0x04, 0x00, // block align = 4
    0x10, 0x00, // bit per sample = 16
    0x64, 0x61, 0x74, 0x61, // d a t a
    l2 & 255, (l2 >> 8) & 255, (l2 >> 16) & 255, (l2 >> 24) & 255, // sub chunk 2 size
  ]);

  const buffers = [];
  for (let channel = 0; channel < nChannels; channel++) {
    buffers.push(audioBuffer.getChannelData(channel));
  }

  for (let i = 0, index = HEADER_LENGTH / 2; i < bufferLength; i++) {
    for (let channel = 0; channel < nChannels; channel++) {
      let sample = buffers[channel][i];
      sample = Math.min(1, Math.max(-1, sample));
      sample = Math.round(sample * MAX_AMPLITUDE);

      int16[index++] = sample;
    }
  }

  return new Blob([uint8], { type: "audio/x-wav" });
}

export function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9 #\-().]+/g, "");
}

export function parseFilename(filename: string): [string, number] {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  // Match: everything up to last space/dash, then note or number at end
  const match = nameWithoutExt.match(/(.+?)[\s\-]*([A-G](?:b|#)?\d|\d{1,3})$/i);
  if (!match) {
    throw new Error(
      `Filename '${filename}' does not match the expected pattern.`
    );
  }
  const baseName = sanitizeName(match[1]);
  const noteOrNumber = match[2];
  // Try to parse as note first
  if (/^[A-G](?:b|#)?\d$/i.test(noteOrNumber)) {
    return [baseName, noteStringToMidiValue(noteOrNumber)];
  }
  // Otherwise, treat as number
  return [baseName, parseInt(noteOrNumber, 10)];
}

export const NOTE_OFFSET = [33, 35, 24, 26, 28, 29, 31];
export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

export function midiNoteToString(value: number): string {
  const octave = Math.floor(value / 12);
  const noteNumber = value % 12;
  return `${NOTE_NAMES[noteNumber]}${octave - 2}`;
}

export function noteStringToMidiValue(note: string): number {
  const string = note.replace(" ", "");
  if (string.length < 2) {
    throw new Error("Bad note format");
  }

  const noteIdx = string[0].toUpperCase().charCodeAt(0) - 65;
  if (noteIdx < 0 || noteIdx > 6) {
    throw new Error("Bad note");
  }

  let sharpen = 0;
  if (string[1] === "#") {
    sharpen = 1;
  } else if (string[1].toLowerCase() === "b") {
    sharpen = -1;
  }
  return (
    parseInt(string.slice(1 + Math.abs(sharpen)), 10) * 12 +
    NOTE_OFFSET[noteIdx] +
    sharpen
  );
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
  platform: "OP-XY",
  type: "drum",
  version: 4,
};

// WAV metadata reading functionality - placeholder for now
export async function readWavMetadata(_file: File): Promise<any> {
  // TODO: Implement WAV SMPL chunk parsing
  return { midiNote: -1, loopStart: 0, loopEnd: 0 };
}