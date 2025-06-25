// === Multisample Tool Logic ===

const MULTISAMPLE_MAX_SAMPLES = 24;
const MULTISAMPLE_WAVEFORM_WIDTH = 400;
const MULTISAMPLE_WAVEFORM_HEIGHT = 60;

// Variables for multisample samples
const multisampleFiles = Array(MULTISAMPLE_MAX_SAMPLES).fill(null);
let multisampleGain = 0;

// Get DOM elements
const multisampleDropArea = document.getElementById('multisample-drop-area');
const multisampleRowsContainer = document.getElementById('multisample-rows-container');
const multisampleDropLabel = document.getElementById('multisample-drop-label');
const multisampleGenerateBtn = document.getElementById('generate-multisample-patch');
const multisampleGainSlider = document.getElementById('gain-slider-multi');
const multisampleGainValue = document.getElementById('gain-value-multi');

// Initialize gain slider
if (multisampleGainSlider && multisampleGainValue) {
  // Set initial value
  multisampleGainValue.textContent = `${multisampleGainSlider.value} dB`;
  
  multisampleGainSlider.addEventListener('input', () => {
    multisampleGainValue.textContent = `${multisampleGainSlider.value} dB`;
    multisampleGain = parseInt(multisampleGainSlider.value, 10);
  });
}

// Parse filename to extract MIDI note
function parseMultisampleFilename(filename) {
  try {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    // Look for dash followed by note/number
    const match = nameWithoutExt.match(/-([A-Ga-g][#b]?\d+|\d+)(?:-\d+)?$/);
    if (match) {
      const noteStr = match[1];
      // Check if it's a number (MIDI note)
      const asInteger = parseInt(noteStr);
      if (Number.isInteger(asInteger) && asInteger >= 0 && asInteger <= 127) {
        return asInteger;
      }
      // Try to parse as note name
      return noteStringToMidiValue(noteStr);
    }
  } catch (e) {
    console.warn('Error parsing filename:', e);
  }
  return -1; // Invalid note
}

// Convert MIDI note to string representation
function midiNoteToString(midiNote) {
  if (midiNote < 0 || midiNote > 127) return 'invalid';
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
}

// Convert note string to MIDI value (simplified)
function noteStringToMidiValue(noteString) {
  const noteMap = {
    'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4, 'F': 5,
    'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11
  };
  
  const match = noteString.toUpperCase().match(/^([A-G][#B]?)(\d+)$/);
  if (!match) throw new Error('Invalid note format');
  
  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteValue = noteMap[note];
  
  if (noteValue === undefined) throw new Error('Invalid note name');
  
  return (octave + 1) * 12 + noteValue;
}

// Parse note input (MIDI number or note name)
function parseNoteInput(input) {
  if (!input || input.trim() === '') return null;
  
  const trimmed = input.trim();
  
  // Try as MIDI number first
  const asInteger = parseInt(trimmed);
  if (Number.isInteger(asInteger) && asInteger >= 0 && asInteger <= 127) {
    return asInteger;
  }
  
  // Try as note name
  try {
    return noteStringToMidiValue(trimmed);
  } catch (e) {
    return null;
  }
}

// Create waveform image from audio buffer
function createMultisampleWaveform(audioBuffer) {
  const canvas = document.createElement('canvas');
  canvas.width = MULTISAMPLE_WAVEFORM_WIDTH;
  canvas.height = MULTISAMPLE_WAVEFORM_HEIGHT;
  
  const ctx = canvas.getContext('2d');
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / MULTISAMPLE_WAVEFORM_WIDTH);
  const amp = MULTISAMPLE_WAVEFORM_HEIGHT / 2;
  
  // Background
  ctx.fillStyle = '#ececec';
  ctx.fillRect(0, 0, MULTISAMPLE_WAVEFORM_WIDTH, MULTISAMPLE_WAVEFORM_HEIGHT);
  
  // Border
  ctx.fillStyle = '#868686';
  ctx.fillRect(0, 0, 1, MULTISAMPLE_WAVEFORM_HEIGHT);
  ctx.fillRect(MULTISAMPLE_WAVEFORM_WIDTH - 1, 0, 1, MULTISAMPLE_WAVEFORM_HEIGHT);
  
  // Waveform
  ctx.strokeStyle = '#c0c0c0';
  ctx.beginPath();
  
  for (let i = 0; i < MULTISAMPLE_WAVEFORM_WIDTH; i++) {
    const start = i * step;
    const end = Math.min(start + step, data.length);
    
    let min = 1;
    let max = -1;
    
    for (let j = start; j < end; j++) {
      const value = data[j];
      if (value < min) min = value;
      if (value > max) max = value;
    }
    
    ctx.moveTo(i, (1 + min) * amp);
    ctx.lineTo(i, (1 + max) * amp);
  }
  
  ctx.stroke();
  return canvas.toDataURL();
}

// Create sample row HTML
function createMultisampleRow(sampleIndex) {
  const sampleData = multisampleFiles[sampleIndex];
  if (!sampleData) return null;
  
  const row = document.createElement('div');
  row.className = 'multisample-row';
  row.dataset.sampleIndex = sampleIndex;
  row.dataset.sort = sampleData.midiNote;
  
  // Label box
  const labelBox = document.createElement('div');
  labelBox.className = 'multisample-label-box';
  
  const midiLabel = document.createElement('div');
  midiLabel.className = 'multisample-midi-label';
  if (sampleData.midiNote < 0) {
    midiLabel.textContent = 'click to set note';
    midiLabel.classList.add('invalid');
  } else {
    midiLabel.textContent = `${midiNoteToString(sampleData.midiNote)} (${sampleData.midiNote})`;
  }
  
  // Make MIDI label editable
  midiLabel.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = midiLabel.textContent;
    input.className = 'form-control form-control-sm';
    input.style.width = '180px';
    
    midiLabel.replaceWith(input);
    input.focus();
    
    const saveValue = () => {
      const noteValue = parseNoteInput(input.value);
      if (noteValue !== null) {
        sampleData.midiNote = noteValue;
        midiLabel.textContent = `${midiNoteToString(noteValue)} (${noteValue})`;
        midiLabel.classList.remove('invalid');
        row.dataset.sort = noteValue;
        reloadMultisampleRows();
      } else {
        midiLabel.textContent = 'click to set note';
        midiLabel.classList.add('invalid');
      }
      input.replaceWith(midiLabel);
      updateMultisampleGenerateButton();
    };
    
    input.addEventListener('blur', saveValue);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveValue();
      }
    });
  });
  
  const fileName = document.createElement('div');
  fileName.className = 'multisample-file-name';
  fileName.textContent = sampleData.fileName;
  
  labelBox.appendChild(midiLabel);
  labelBox.appendChild(fileName);
  
  // Waveform container
  const waveformContainer = document.createElement('div');
  waveformContainer.className = 'multisample-waveform-container';
  
  const waveformImg = document.createElement('img');
  waveformImg.src = sampleData.waveformImage;
  waveformContainer.appendChild(waveformImg);
  
  // Add markers for loop points
  const inMarker = document.createElement('div');
  inMarker.className = 'multisample-marker start-marker';
  inMarker.style.left = `${(sampleData.inPoint / sampleData.duration) * 100}%`;
  inMarker.dataset.field = 'inPoint';
  waveformContainer.appendChild(inMarker);
  
  const loopStartMarker = document.createElement('div');
  loopStartMarker.className = 'multisample-marker';
  loopStartMarker.style.left = `${(sampleData.loopStart / sampleData.duration) * 100}%`;
  loopStartMarker.dataset.field = 'loopStart';
  waveformContainer.appendChild(loopStartMarker);
  
  const loopEndMarker = document.createElement('div');
  loopEndMarker.className = 'multisample-marker';
  loopEndMarker.style.left = `${(sampleData.loopEnd / sampleData.duration) * 100}%`;
  loopEndMarker.dataset.field = 'loopEnd';
  waveformContainer.appendChild(loopEndMarker);
  
  const outMarker = document.createElement('div');
  outMarker.className = 'multisample-marker end-marker';
  outMarker.style.left = `${(sampleData.outPoint / sampleData.duration) * 100}%`;
  outMarker.dataset.field = 'outPoint';
  waveformContainer.appendChild(outMarker);
  
  // Add marker interactions
  addMultisampleMarkerInteractions(inMarker, loopStartMarker, loopEndMarker, outMarker, sampleIndex);
  
  // Actions
  const actions = document.createElement('div');
  actions.className = 'multisample-actions';
  
  const playBtn = document.createElement('button');
  playBtn.className = 'btn btn-sm multisample-play-btn';
  playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
  playBtn.title = 'Play sample';
  playBtn.addEventListener('click', () => playMultisample(sampleIndex));
  
  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn btn-sm multisample-clear-btn';
  clearBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
  clearBtn.title = 'Remove sample';
  clearBtn.addEventListener('click', () => {
    multisampleFiles[sampleIndex] = null;
    reloadMultisampleRows();
    updateMultisampleGenerateButton();
  });
  
  actions.appendChild(playBtn);
  actions.appendChild(clearBtn);
  
  // Assemble row
  row.appendChild(labelBox);
  row.appendChild(waveformContainer);
  row.appendChild(actions);
  
  return row;
}

// Add marker drag interactions
function addMultisampleMarkerInteractions(inMarker, loopStartMarker, loopEndMarker, outMarker, sampleIndex) {
  const markers = [inMarker, loopStartMarker, loopEndMarker, outMarker];
  
  markers.forEach(marker => {
    marker.addEventListener('mousedown', (e) => {
      e.preventDefault();
      
      const container = marker.parentElement;
      const containerRect = container.getBoundingClientRect();
      
      const onMove = (moveEvent) => {
        const x = moveEvent.clientX - containerRect.left;
        const percentage = Math.max(0, Math.min(100, (x / containerRect.width) * 100));
        marker.style.left = `${percentage}%`;
        
        // Update sample data
        const sampleData = multisampleFiles[sampleIndex];
        if (sampleData) {
          const timePosition = (percentage / 100) * sampleData.duration;
          sampleData[marker.dataset.field] = timePosition;
        }
      };
      
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    
    // Double-click to apply to all samples
    marker.addEventListener('dblclick', () => {
      const sampleData = multisampleFiles[sampleIndex];
      if (!sampleData) return;
      
      const markerPosition = sampleData[marker.dataset.field] / sampleData.duration;
      
      multisampleFiles.forEach((sample, index) => {
        if (sample && index !== sampleIndex) {
          sample[marker.dataset.field] = markerPosition * sample.duration;
        }
      });
      
      reloadMultisampleRows();
    });
  });
}

// Play multisample
function playMultisample(sampleIndex) {
  const sampleData = multisampleFiles[sampleIndex];
  if (!sampleData || !sampleData.audioBuffer) return;
  
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = sampleData.audioBuffer;
  source.connect(ctx.destination);
  source.start();
}

// Reload and sort sample rows
function reloadMultisampleRows() {
  multisampleRowsContainer.innerHTML = '';
  
  const validSamples = [];
  multisampleFiles.forEach((sample, index) => {
    if (sample) {
      const row = createMultisampleRow(index);
      if (row) validSamples.push(row);
    }
  });
  
  // Sort by MIDI note
  validSamples.sort((a, b) => {
    const aNote = parseInt(a.dataset.sort);
    const bNote = parseInt(b.dataset.sort);
    return aNote - bNote;
  });
  
  // Add sorted rows
  validSamples.forEach(row => multisampleRowsContainer.appendChild(row));
  
  // Update drop label visibility
  if (multisampleDropLabel) {
    if (validSamples.length > 0) {
      multisampleDropLabel.style.opacity = '0';
      multisampleDropLabel.style.pointerEvents = 'none';
    } else {
      multisampleDropLabel.style.opacity = '1';
      multisampleDropLabel.style.pointerEvents = 'none';
    }
  }
}

// Update generate button state
function updateMultisampleGenerateButton() {
  const hasValidSamples = multisampleFiles.some(sample => 
    sample && sample.midiNote >= 0
  );
  
  if (multisampleGenerateBtn) {
    multisampleGenerateBtn.disabled = !hasValidSamples;
    multisampleGenerateBtn.title = hasValidSamples ? 
      '' : 'load at least one sample with a valid note to enable';
  }
}

// Process dropped files
async function processMultisampleFiles(files) {
  const fileProcessingPromises = [];
  
  for (const file of files) {
    if (file && file.name.toLowerCase().endsWith('.wav')) {
      const nextIndex = multisampleFiles.findIndex(item => item === null);
      if (nextIndex === -1) {
        alert(`Maximum ${MULTISAMPLE_MAX_SAMPLES} samples allowed`);
        break;
      }
      
      const promise = new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            const duration = audioBuffer.duration;
            const sampleRate = audioBuffer.sampleRate;
            const frameCount = audioBuffer.length;
            
            // Parse MIDI note from filename
            let midiNote = parseMultisampleFilename(file.name);
            
            // Set default loop points
            let loopStart = duration * 0.1;
            let loopEnd = duration * 0.9;
            
            // Create waveform image
            const waveformImage = createMultisampleWaveform(audioBuffer);
            
            // Store sample data
            multisampleFiles[nextIndex] = {
              file: file,
              fileName: sanitizeName(file.name),
              audioBuffer: audioBuffer,
              duration: duration,
              sampleRate: sampleRate,
              frameCount: frameCount,
              midiNote: midiNote,
              inPoint: 0,
              outPoint: duration,
              loopStart: loopStart,
              loopEnd: loopEnd,
              waveformImage: waveformImage
            };
            
            resolve();
          } catch (error) {
            console.error('Error processing file:', error);
            reject(error);
          }
        };
        reader.readAsArrayBuffer(file);
      });
      
      fileProcessingPromises.push(promise);
    }
  }
  
  try {
    await Promise.all(fileProcessingPromises);
    reloadMultisampleRows();
    updateMultisampleGenerateButton();
  } catch (error) {
    console.error('Error during file processing:', error);
    alert('Error processing some files. Please try again.');
  }
}

// Drag and drop setup
if (multisampleDropArea) {
  multisampleDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    multisampleDropArea.classList.add('dragover');
  });
  
  multisampleDropArea.addEventListener('dragleave', (e) => {
    if (!multisampleDropArea.contains(e.relatedTarget)) {
      multisampleDropArea.classList.remove('dragover');
    }
  });
  
  multisampleDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    multisampleDropArea.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    processMultisampleFiles(files);
  });
}

// Generate multisample patch
if (multisampleGenerateBtn) {
  multisampleGenerateBtn.addEventListener('click', async () => {
    if (typeof JSZip === 'undefined') {
      alert('JSZip library not loaded. Please wait and try again.');
      return;
    }
    if (typeof baseMultisampleJson === 'undefined') {
      alert('baseMultisampleJson is missing. Patch generation cannot continue.');
      return;
    }
    
    multisampleGenerateBtn.disabled = true;
    multisampleGenerateBtn.textContent = 'generating...';
    
    try {
      const presetName = sanitizeName(document.getElementById('preset-name-multi').value || 'MultisamplePatch');
      const sampleRateIdx = document.getElementById('sample-rate-multi').selectedIndex;
      const targetSampleRate = [null, 11025, 22050, 44100][sampleRateIdx];
      const loopEnabled = document.getElementById('loop-enabled-multi').checked;
      
      const zip = new JSZip();
      
      // Deep copy baseMultisampleJson
      const patchJson = JSON.parse(JSON.stringify(baseMultisampleJson));
      patchJson.name = presetName;
      patchJson.regions = [];
      
      // Filter valid samples and sort by MIDI note
      const validSamples = multisampleFiles
        .map((sample, index) => ({ sample, index }))
        .filter(({ sample }) => sample && sample.midiNote >= 0)
        .sort((a, b) => a.sample.midiNote - b.sample.midiNote);
      
      if (validSamples.length === 0) {
        alert('No valid samples with MIDI notes found. Please assign MIDI notes to your samples.');
        return;
      }
      
      // Set key ranges for each sample
      for (let i = 0; i < validSamples.length; i++) {
        const { sample } = validSamples[i];
        
        // Set low key (start from previous sample's high key + 1, or 0 for first)
        sample.lowKey = i === 0 ? 0 : validSamples[i - 1].sample.highKey + 1;
        
        // Set high key (current sample's MIDI note, or 127 for last)
        sample.highKey = sample.midiNote;
      }
      
      // Set last sample's high key to 127
      if (validSamples.length > 0) {
        validSamples[validSamples.length - 1].sample.highKey = 127;
      }
      
      // Process each sample
      const fileReadPromises = validSamples.map(({ sample, index }) => {
        return new Promise(async (resolve, reject) => {
          try {
            const file = sample.file;
            const outputName = sample.fileName;
            let sampleRate = sample.sampleRate;
            const duration = sample.duration;
            
            // Calculate frame positions
            let frameCount = sample.frameCount;
            if (targetSampleRate && sampleRate !== targetSampleRate) {
              frameCount = Math.floor(duration * targetSampleRate);
              sampleRate = targetSampleRate;
            }
            
            const inPointFrame = Math.floor((sample.inPoint / duration) * frameCount);
            const outPointFrame = Math.floor((sample.outPoint / duration) * frameCount);
            const loopStartFrame = Math.floor((sample.loopStart / duration) * frameCount);
            const loopEndFrame = Math.floor((sample.loopEnd / duration) * frameCount);
            
            // Create region object
            const region = {
              framecount: frameCount,
              gain: multisampleGain,
              hikey: sample.highKey,
              lokey: sample.lowKey,
              "loop.crossfade": 0,
              "loop.end": loopEndFrame,
              "loop.onrelease": loopEnabled,
              "loop.enabled": loopEnabled,
              "loop.start": loopStartFrame,
              "pitch.keycenter": sample.midiNote,
              reverse: false,
              sample: outputName,
              "sample.end": outPointFrame,
              "sample.start": inPointFrame,
              tune: 0
            };
            
            // Add audio file to zip
            if (targetSampleRate && sampleRate !== targetSampleRate) {
              console.log('Re-encoding', file.name);
              const wavBlob = await resampleAudio(file, targetSampleRate);
              zip.file(outputName, wavBlob);
            } else {
              const arrayBuffer = await file.arrayBuffer();
              zip.file(outputName, arrayBuffer);
            }
            
            patchJson.regions.push(region);
            resolve();
          } catch (error) {
            console.error('Error processing sample:', error);
            reject(error);
          }
        });
      });
      
      // Wait for all files to be processed
      await Promise.all(fileReadPromises);
      
      // Add patch.json to zip
      zip.file('patch.json', JSON.stringify(patchJson, null, 2));
      
      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${presetName}.preset.zip`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 100);
      
    } catch (err) {
      console.error('Patch generation failed:', err);
      alert('Patch generation failed: ' + (err && err.message ? err.message : err));
    } finally {
      multisampleGenerateBtn.disabled = false;
      multisampleGenerateBtn.textContent = 'generate patch';
    }
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateMultisampleGenerateButton();
});

// Export for use in other files
window.multisampleTool = {
  files: multisampleFiles,
  reloadRows: reloadMultisampleRows,
  updateGenerateButton: updateMultisampleGenerateButton
};
