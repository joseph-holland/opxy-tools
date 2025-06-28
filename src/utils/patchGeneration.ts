// Patch generation utilities for OP-XY drum and multisample presets
import JSZip from 'jszip';
import { resampleAudio, sanitizeName, baseDrumJson, baseMultisampleJson, parseFilename } from './audio';
import type { AppState } from '../context/AppContext';

// Types for OP-XY patch structure
interface MultisampleRegion {
  end: number;
  file: string;
  gain: number;
  loopend: number;
  loopstart: number;
  note: number;
  pan: number;
  playmode: number;
  reverse: boolean;
  start: number;
  tune: number;
  velocity: {
    end: number;
    start: number;
  };
}

interface MultisampleJson {
  envelope: any;
  fx: any;
  lfo: any;
  octave: number;
  platform: string;
  regions: MultisampleRegion[];
  type: string;
  version: number;
}

// Generate drum patch ZIP file
export async function generateDrumPatch(state: AppState, patchName: string = 'drum_patch'): Promise<Blob> {
  const zip = new JSZip();
  const sanitizedName = sanitizeName(patchName);
  
  // Create preset directory structure
  const presetFolder = zip.folder(sanitizedName);
  if (!presetFolder) {
    throw new Error('Failed to create preset folder');
  }

  // Copy base drum JSON structure
  const drumJson = { ...baseDrumJson };
  
  // Add samples to the preset
  const loadedSamples = state.drumSamples.filter(sample => sample.isLoaded);
  
  for (let i = 0; i < loadedSamples.length; i++) {
    const sample = loadedSamples[i];
    if (!sample.file || !sample.audioBuffer) continue;

    const sampleIndex = state.drumSamples.indexOf(sample);
    const sampleName = `${sampleIndex + 1}.wav`;
    
    try {
      // Resample to 44.1kHz for OP-XY compatibility
      const resampledBlob = await resampleAudio(sample.file, 44100);
      const arrayBuffer = await resampledBlob.arrayBuffer();
      
      // Add sample file to ZIP
      presetFolder.file(sampleName, arrayBuffer);
      
      console.log(`Added sample ${sampleIndex + 1}: ${sample.name}`);
    } catch (error) {
      console.error(`Failed to process sample ${sample.name}:`, error);
      // Continue with other samples
    }
  }

  // Add preset.json
  presetFolder.file('preset.json', JSON.stringify(drumJson, null, 2));

  // Generate ZIP
  return await zip.generateAsync({ type: 'blob' });
}

// Generate multisample patch ZIP file
export async function generateMultisamplePatch(state: AppState, patchName: string = 'multisample_patch'): Promise<Blob> {
  const zip = new JSZip();
  const sanitizedName = sanitizeName(patchName);
  
  // Create preset directory structure
  const presetFolder = zip.folder(sanitizedName);
  if (!presetFolder) {
    throw new Error('Failed to create preset folder');
  }

  // Copy base multisample JSON structure
  const multisampleJson: MultisampleJson = { ...baseMultisampleJson } as MultisampleJson;
  
  // Process samples and create regions
  const regions: MultisampleRegion[] = [];
  
  for (let i = 0; i < state.multisampleFiles.length; i++) {
    const sample = state.multisampleFiles[i];
    if (!sample.file || !sample.audioBuffer) continue;

    const sampleName = `${i + 1}.wav`;
    
    try {
      // Try to parse note from filename, fallback to C4 + index
      let midiNote = 60 + i; // Default to C4 + index
      try {
        const [, parsedNote] = parseFilename(sample.file.name);
        if (typeof parsedNote === 'number' && parsedNote >= 0 && parsedNote <= 127) {
          midiNote = parsedNote;
        }
      } catch {
        // Use default note
      }

      // Resample to 44.1kHz for OP-XY compatibility
      const resampledBlob = await resampleAudio(sample.file, 44100);
      const arrayBuffer = await resampledBlob.arrayBuffer();
      
      // Add sample file to ZIP
      presetFolder.file(sampleName, arrayBuffer);
      
      // Create region for this sample
      regions.push({
        end: sample.audioBuffer.length - 1,
        file: sampleName,
        gain: 0,
        loopend: sample.audioBuffer.length - 1,
        loopstart: 0,
        note: midiNote,
        pan: 0,
        playmode: 0,
        reverse: false,
        start: 0,
        tune: 0,
        velocity: {
          end: 127,
          start: 0
        }
      });
      
      console.log(`Added multisample ${i + 1}: ${sample.name} at note ${midiNote}`);
    } catch (error) {
      console.error(`Failed to process sample ${sample.name}:`, error);
      // Continue with other samples
    }
  }

  // Add regions to JSON
  multisampleJson.regions = regions;

  // Add preset.json
  presetFolder.file('preset.json', JSON.stringify(multisampleJson, null, 2));

  // Generate ZIP
  return await zip.generateAsync({ type: 'blob' });
}

// Download a blob as a file
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}