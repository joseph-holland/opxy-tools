// === Multisample Tool Logic ===

const MULTISAMPLE_MAX_SAMPLES = 24;
const MULTISAMPLE_WAVEFORM_WIDTH = 400;
const MULTISAMPLE_WAVEFORM_HEIGHT = 60;

// Variables for multisample samples
const multisampleFiles = Array(MULTISAMPLE_MAX_SAMPLES).fill(null);
let multisampleGain = 0;

// === Patch Size Tracking ===
let multiTotalPatchSize = 0;

function calculateSampleSize(audioBuffer) {
  if (!audioBuffer) return 0;
  
  // Calculate size based on 16-bit stereo WAV format
  const channels = 2; // Always output stereo for patches
  const bytesPerSample = 2; // 16-bit
  const samples = audioBuffer.length;
  
  // WAV header is 44 bytes
  const headerSize = 44;
  const dataSize = samples * channels * bytesPerSample;
  
  return headerSize + dataSize;
}

function updateMultiPatchSizeIndicator() {
  const currentSizeElement = document.getElementById('multi-current-patch-size');
  const progressBar = document.getElementById('multi-patch-size-progress');
  const statusElement = document.getElementById('multi-patch-size-status');
  
  if (!currentSizeElement || !progressBar || !statusElement) return;
  
  const sizeInMB = multiTotalPatchSize / (1024 * 1024);
  const percentage = (sizeInMB / 8) * 100; // 8MB limit
  
  // Update display
  currentSizeElement.textContent = `${sizeInMB.toFixed(1)} MB`;
  progressBar.style.width = `${Math.min(percentage, 100)}%`;
  
  // Update status and styling - MONOCHROME ONLY
  if (percentage >= 90) {
    statusElement.textContent = 'patch size too large - consider reducing sample rate';
    progressBar.className = 'progress-bar danger';
    statusElement.className = 'small text-muted mt-1 danger';
  } else if (percentage >= 70) {
    statusElement.textContent = 'approaching size limit';
    progressBar.className = 'progress-bar warning';
    statusElement.className = 'small text-muted mt-1 warning';
  } else {
    statusElement.textContent = 'plenty of space remaining';
    progressBar.className = 'progress-bar';
    statusElement.className = 'small text-muted mt-1';
  }
}

function updateMultiPatchSize() {
  multiTotalPatchSize = 0;
  
  // Get the selected sample rate for size calculation
  const targetSampleRate = getMultiTargetSampleRate();
  
  // Calculate total size of all loaded samples
  multisampleFiles.forEach((sample, index) => {
    if (sample && sample.audioBuffer) {
      let sampleSize;
      
      if (targetSampleRate === 0) {
        // Keep original - use original buffer size
        sampleSize = calculateSampleSize(sample.audioBuffer);
      } else {
        // Re-encode - calculate size based on target sample rate
        const originalSampleRate = sample.audioBuffer.sampleRate;
        const ratio = targetSampleRate / originalSampleRate;
        const newLength = Math.round(sample.audioBuffer.length * ratio);
        
        // Create a mock buffer with new length for size calculation
        const mockBuffer = {
          length: newLength,
          numberOfChannels: sample.audioBuffer.numberOfChannels
        };
        sampleSize = calculateSampleSize(mockBuffer);
      }
      
      multiTotalPatchSize += sampleSize;
    }
  });
  
  updateMultiPatchSizeIndicator();
}

// Convert percentage to internal value (0-100% -> 0-32767)
function percentToInternal(percent) {
  return Math.round((percent / 100) * 32767);
}

// Convert internal value to percentage (0-32767 -> 0-100%)
function internalToPercent(internal) {
  return Math.round((internal / 32767) * 100);
}

// Function to get target sample rate from dropdown for multisample tool
function getMultiTargetSampleRate() {
  const sampleRateSelect = document.getElementById('sample-rate-multi');
  const value = parseInt(sampleRateSelect.value);
  
  switch(value) {
    case 1: return 11025;
    case 2: return 22050;
    case 3: return 44100;
    default: return 0; // Keep original
  }
}

let multisampleAdvancedSettings = {
  playmode: 'poly',
  loopEnabled: true, // Controls loop.enabled and loop.onrelease for all regions
  transpose: 0,
  velocitySensitivity: percentToInternal(15), // 15% -> ~4915 internal (matches drum tool default)
  volume: percentToInternal(80), // 80% -> ~26214 internal (matches drum tool default)
  width: percentToInternal(0), // 0% -> 0 internal (matches drum tool default)
  highpass: percentToInternal(0), // 0% -> 0 internal
  portamentoType: 32767, // linear
  portamentoAmount: percentToInternal(0), // 0% -> 0 internal
  tuningRoot: 0, // C
  ampEnvelope: {
    attack: percentToInternal(0), // 0% -> 0 internal
    decay: percentToInternal(0), // 0% -> 0 internal
    sustain: percentToInternal(100), // 100% -> 32767 internal (changed from 0 to match default UI)
    release: percentToInternal(0) // 0% -> 0 internal (changed from 100 to match default UI)
  },
  filterEnvelope: {
    attack: percentToInternal(0), // 0% -> 0 internal (changed from 100 to match default UI)
    decay: percentToInternal(0), // 0% -> 0 internal (changed from 100 to match default UI) 
    sustain: percentToInternal(100), // 100% -> 32767 internal
    release: percentToInternal(0) // 0% -> 0 internal
  }
};

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
} else {
  // If gain controls don't exist, use default value
  multisampleGain = 0;
}

// Process multisample files (main entry point for file loading)
async function processMultisampleFiles(files) {
  if (!files || files.length === 0) return;

  const audioFiles = files.filter(file => file.type.startsWith('audio/'));
  const loadPromises = [];

  // Assign slots and create promises
  for (const file of audioFiles) {
    const slotIndex = multisampleFiles.findIndex(slot => slot === null);

    if (slotIndex === -1) {
      alert('Maximum number of samples reached. Some files were not loaded.');
      break;
    }

    // Reserve the slot to prevent race conditions with a proper placeholder
    multisampleFiles[slotIndex] = { 
      fileName: 'Loading...', 
      midiNote: -1, 
      audioBuffer: null,
      duration: 0,
      inPoint: 0,
      outPoint: 0,
      loopStart: 0,
      loopEnd: 0,
      hasLoopData: false,
      isLoading: true
    };

    loadPromises.push(loadMultisampleFileInternal(file, slotIndex));
  }
  
  // Show placeholders immediately
  reloadMultisampleRows();
  updateMultisampleDropLabel();

  // Wait for all files to settle
  await Promise.allSettled(loadPromises);

  // Final UI update
  reloadMultisampleRows();
  updateMultisampleGenerateButton();
  updateMultisampleDropLabel();
  updateMultiPatchSize();
}

// Load a single multisample file (internal function that doesn't update UI)
async function loadMultisampleFileInternal(file, slotIndex) {
  try {
    if (slotIndex < 0 || slotIndex >= MULTISAMPLE_MAX_SAMPLES) {
      throw new Error(`Invalid slot index: ${slotIndex}`);
    }

    const metadata = await readWavMetadata(file);
    const duration = metadata.duration;

    const sampleData = {
      fileName: file.name,
      audioBuffer: metadata.audioBuffer,
      midiNote: metadata.midiNote,
      duration: duration,
      inPoint: 0,
      outPoint: duration,
      loopStart: metadata.loopStart,
      loopEnd: metadata.loopEnd,
      hasLoopData: metadata.hasLoopData
    };

    multisampleFiles[slotIndex] = sampleData;
    console.log(`File ${file.name} loaded into slot ${slotIndex}`);

  } catch (error) {
    console.error(`Error loading multisample file "${file.name}":`, error);
    // Clear the slot if loading failed, so it can be reused
    if (slotIndex >= 0 && slotIndex < MULTISAMPLE_MAX_SAMPLES) {
      multisampleFiles[slotIndex] = null;
    }
    throw error; // Re-throw to be handled by Promise.allSettled
  }
}

// Load a single multisample file (public function with UI updates)
async function loadMultisampleFile(file) {
  const slotIndex = multisampleFiles.findIndex(slot => slot === null);

  if (slotIndex === -1) {
    alert('Maximum number of samples reached');
    return;
  }

  // Reserve the slot to prevent race conditions with a proper placeholder
  multisampleFiles[slotIndex] = { 
    fileName: 'Loading...', 
    midiNote: -1, 
    audioBuffer: null,
    duration: 0,
    inPoint: 0,
    outPoint: 0,
    loopStart: 0,
    loopEnd: 0,
    hasLoopData: false,
    isLoading: true
  };
  reloadMultisampleRows(); // Show placeholder

  try {
    await loadMultisampleFileInternal(file, slotIndex);
  } catch (error) {
    alert(`Failed to load "${file.name}". Please check the console for details.`);
  }

  // Final UI update
  reloadMultisampleRows();
  updateMultisampleGenerateButton();
  updateMultisampleDropLabel();
  updateMultiPatchSize();
}

// Update drop label visibility
function updateMultisampleDropLabel() {
  if (!multisampleDropLabel) return;
  
  const hasSamples = multisampleFiles.some(sample => sample !== null);
  multisampleDropLabel.style.display = hasSamples ? 'none' : 'block';
}

// Set up drag and drop functionality
if (multisampleDropArea) {
  multisampleDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    multisampleDropArea.classList.add('dragover');
  });
  
  multisampleDropArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    multisampleDropArea.classList.remove('dragover');
  });
  
  multisampleDropArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    multisampleDropArea.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    await processMultisampleFiles(files);
  });
}

// Make processMultisampleFiles available globally for the browse button
window.processMultisampleFiles = processMultisampleFiles;

// Handle file input change for the browse button
const multisampleFileInput = document.getElementById('multisample-file-input');
if (multisampleFileInput) {
  multisampleFileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      await processMultisampleFiles(files);
    }
    // Reset the input value to allow re-selecting the same file
    e.target.value = null;
  });
}

// Use parseFilename from audio_tools.js for robust MIDI note extraction
function extractMidiNoteFromFilename(filename) {
  try {
    // parseFilename returns [baseName, midiNote]
    const result = typeof parseFilename === 'function' ? parseFilename(filename) : null;
    if (result && Array.isArray(result) && typeof result[1] === 'number') {
      return result[1];
    }
  } catch (e) {
    // ignore, fallback below
  }
  // fallback to old logic if parseFilename not available or fails
  try {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const match = nameWithoutExt.match(/-([A-Ga-g][#bB]?\d+|\d+)(?:-\d+)?$/);
    if (match) {
      const noteStr = match[1].trim();
      const asInteger = parseInt(noteStr, 10);
      if (!isNaN(asInteger) && asInteger >= 0 && asInteger <= 127) {
        return asInteger;
      }
      try {
        return noteStringToMidiValue(noteStr.toUpperCase());
      } catch (e) {
        return -1;
      }
    }
  } catch (e) {}
  return -1;
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

// Draw waveform on canvas
function drawMultisampleWaveform(canvas, audioBuffer) {
  const ctx = canvas.getContext('2d');
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / MULTISAMPLE_WAVEFORM_WIDTH);
  const amp = MULTISAMPLE_WAVEFORM_HEIGHT / 2;
  
  // Clear canvas
  ctx.clearRect(0, 0, MULTISAMPLE_WAVEFORM_WIDTH, MULTISAMPLE_WAVEFORM_HEIGHT);
  
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
}

// Draw markers on waveform canvas
function drawMultisampleMarkers(canvas, sampleData) {
  const ctx = canvas.getContext('2d');
  const duration = sampleData.duration;
  
  // Calculate marker positions
  const inPos = (sampleData.inPoint / duration) * MULTISAMPLE_WAVEFORM_WIDTH;
  const loopStartPos = (sampleData.loopStart / duration) * MULTISAMPLE_WAVEFORM_WIDTH;
  const loopEndPos = (sampleData.loopEnd / duration) * MULTISAMPLE_WAVEFORM_WIDTH;
  const outPos = (sampleData.outPoint / duration) * MULTISAMPLE_WAVEFORM_WIDTH;
  
  // In/Out markers (red)
  ctx.strokeStyle = '#dc3545';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(inPos, 0);
  ctx.lineTo(inPos, MULTISAMPLE_WAVEFORM_HEIGHT);
  ctx.moveTo(outPos, 0);
  ctx.lineTo(outPos, MULTISAMPLE_WAVEFORM_HEIGHT);
  ctx.stroke();
  
  // Loop markers as triangles at the top and vertical lines (grey)
  const triangleSize = 8;
  ctx.fillStyle = '#666';
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  
  // Loop start triangle (pointing down with wide top)
  ctx.beginPath();
  ctx.moveTo(loopStartPos - triangleSize/2, 0);
  ctx.lineTo(loopStartPos + triangleSize/2, 0);
  ctx.lineTo(loopStartPos, triangleSize);
  ctx.closePath();
  ctx.fill();
  
  // Loop start vertical line
  ctx.beginPath();
  ctx.moveTo(loopStartPos, triangleSize);
  ctx.lineTo(loopStartPos, MULTISAMPLE_WAVEFORM_HEIGHT);
  ctx.stroke();
  
  // Loop end triangle (pointing down with wide top)
  ctx.beginPath();
  ctx.moveTo(loopEndPos - triangleSize/2, 0);
  ctx.lineTo(loopEndPos + triangleSize/2, 0);
  ctx.lineTo(loopEndPos, triangleSize);
  ctx.closePath();
  ctx.fill();
  
  // Loop end vertical line
  ctx.beginPath();
  ctx.moveTo(loopEndPos, triangleSize);
  ctx.lineTo(loopEndPos, MULTISAMPLE_WAVEFORM_HEIGHT);
  ctx.stroke();
  
  // In/Out marker handles (circles at bottom)
  const handleRadius = 6;
  ctx.fillStyle = '#dc3545';
  ctx.beginPath();
  ctx.arc(inPos, MULTISAMPLE_WAVEFORM_HEIGHT - 8, handleRadius, 0, 2 * Math.PI);
  ctx.arc(outPos, MULTISAMPLE_WAVEFORM_HEIGHT - 8, handleRadius, 0, 2 * Math.PI);
  ctx.fill();
}

// Create sample row HTML
function createMultisampleRow(sampleIndex) {
  const sampleData = multisampleFiles[sampleIndex];
  if (!sampleData) return null;
  
  const row = document.createElement('div');
  row.className = 'multisample-row';
  row.dataset.sampleIndex = sampleIndex;
  row.dataset.sort = sampleData.midiNote || -1;
  
  // Label box
  const labelBox = document.createElement('div');
  labelBox.className = 'multisample-label-box';
  
  const midiLabel = document.createElement('div');
  midiLabel.className = 'multisample-midi-label';
  
  // Handle loading state
  if (sampleData.isLoading) {
    midiLabel.textContent = 'loading...';
    midiLabel.classList.add('loading');
  } else if (!sampleData.midiNote || sampleData.midiNote < 0) {
    midiLabel.textContent = 'click to set note';
    midiLabel.classList.add('invalid');
  } else {
    midiLabel.textContent = `${midiNoteToString(sampleData.midiNote)} (${sampleData.midiNote})`;
  }
  
  // Make MIDI label editable (only if not loading)
  if (!sampleData.isLoading) {
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
  }
  
  const fileName = document.createElement('div');
  fileName.className = 'multisample-file-name';
  fileName.textContent = sampleData.fileName;
  
  labelBox.appendChild(midiLabel);
  labelBox.appendChild(fileName);
  
  // Waveform container
  const waveformContainer = document.createElement('div');
  waveformContainer.className = 'multisample-waveform-container';
  
  if (sampleData.audioBuffer && !sampleData.isLoading) {
    const canvas = document.createElement('canvas');
    canvas.width = MULTISAMPLE_WAVEFORM_WIDTH;
    canvas.height = MULTISAMPLE_WAVEFORM_HEIGHT;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    // Draw waveform and markers
    drawMultisampleWaveform(canvas, sampleData.audioBuffer);
    drawMultisampleMarkers(canvas, sampleData);
    
    waveformContainer.appendChild(canvas);
    
    // Add canvas interaction for marker dragging
    addMultisampleCanvasInteractions(canvas, sampleIndex);
  } else {
    // Show loading placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'waveform-placeholder';
    placeholder.textContent = sampleData.isLoading ? 'Loading...' : 'No waveform data';
    placeholder.style.cssText = `
      width: 100%;
      height: ${MULTISAMPLE_WAVEFORM_HEIGHT}px;
      background: #ececec;
      border: 1px solid #868686;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      font-size: 12px;
    `;
    waveformContainer.appendChild(placeholder);
  }
  
  // Actions
  const actions = document.createElement('div');
  actions.className = 'multisample-actions';
  
  const playBtn = document.createElement('button');
  playBtn.className = 'btn btn-sm multisample-play-btn';
  playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
  playBtn.title = 'Play sample';
  playBtn.disabled = sampleData.isLoading || !sampleData.audioBuffer;
  if (!sampleData.isLoading && sampleData.audioBuffer) {
    playBtn.addEventListener('click', () => playMultisample(sampleIndex));
  }
  
  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn btn-sm multisample-clear-btn';
  clearBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
  clearBtn.title = 'Remove sample';
  clearBtn.addEventListener('click', () => {
    multisampleFiles[sampleIndex] = null;
    reloadMultisampleRows();
    updateMultisampleGenerateButton();
    // Update patch size indicator
    updateMultiPatchSize();
  });
  
  actions.appendChild(playBtn);
  actions.appendChild(clearBtn);
  
  // Assemble row
  row.appendChild(labelBox);
  row.appendChild(waveformContainer);
  row.appendChild(actions);
  
  return row;
}

// Add canvas interaction for marker dragging
function addMultisampleCanvasInteractions(canvas, sampleIndex) {
  let draggingMarker = null;
  
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const xPercent = (x / rect.width) * 100;
    const xNormalized = x / MULTISAMPLE_WAVEFORM_WIDTH;
    
    const sampleData = multisampleFiles[sampleIndex];
    if (!sampleData) return;
    
    // Calculate marker positions
    const inPos = (sampleData.inPoint / sampleData.duration);
    const loopStartPos = (sampleData.loopStart / sampleData.duration);
    const loopEndPos = (sampleData.loopEnd / sampleData.duration);
    const outPos = (sampleData.outPoint / sampleData.duration);
    
    const tolerance = 0.03; // 3% tolerance for clicking markers
    
    // Determine which marker was clicked
    if (Math.abs(xNormalized - inPos) < tolerance) {
      draggingMarker = 'inPoint';
    } else if (Math.abs(xNormalized - loopStartPos) < tolerance) {
      draggingMarker = 'loopStart';
    } else if (Math.abs(xNormalized - loopEndPos) < tolerance) {
      draggingMarker = 'loopEnd';
    } else if (Math.abs(xNormalized - outPos) < tolerance) {
      draggingMarker = 'outPoint';
    } else {
      // Click on waveform - move nearest marker
      const distances = {
        inPoint: Math.abs(xNormalized - inPos),
        loopStart: Math.abs(xNormalized - loopStartPos),
        loopEnd: Math.abs(xNormalized - loopEndPos),
        outPoint: Math.abs(xNormalized - outPos)
      };
      
      draggingMarker = Object.keys(distances).reduce((a, b) => 
        distances[a] < distances[b] ? a : b
      );
    }
    
    canvas.style.cursor = 'grabbing';
  });
  
  canvas.addEventListener('mousemove', (e) => {
    if (!draggingMarker) {
      // Change cursor when hovering over markers
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const xNormalized = x / MULTISAMPLE_WAVEFORM_WIDTH;
      
      const sampleData = multisampleFiles[sampleIndex];
      if (!sampleData) return;
      
      const inPos = (sampleData.inPoint / sampleData.duration);
      const loopStartPos = (sampleData.loopStart / sampleData.duration);
      const loopEndPos = (sampleData.loopEnd / sampleData.duration);
      const outPos = (sampleData.outPoint / sampleData.duration);
      
      const tolerance = 0.03;
      const isNearMarker = 
        Math.abs(xNormalized - inPos) < tolerance ||
        Math.abs(xNormalized - loopStartPos) < tolerance ||
        Math.abs(xNormalized - loopEndPos) < tolerance ||
        Math.abs(xNormalized - outPos) < tolerance;
      
      canvas.style.cursor = isNearMarker ? 'grab' : 'pointer';
      return;
    }
    
    // Dragging a marker
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const xNormalized = x / rect.width;
    
    const sampleData = multisampleFiles[sampleIndex];
    if (sampleData) {
      const newTime = xNormalized * sampleData.duration;
      
      // Apply constraints and move loop markers if needed
      if (draggingMarker === 'inPoint') {
        const newInPoint = Math.max(0, Math.min(newTime, sampleData.outPoint - 0.01));
        // If inPoint moves past loopStart, move loopStart with it
        if (newInPoint > sampleData.loopStart) {
          sampleData.loopStart = newInPoint;
        }
        sampleData.inPoint = newInPoint;
      } else if (draggingMarker === 'loopStart') {
        sampleData.loopStart = Math.max(sampleData.inPoint, Math.min(newTime, sampleData.loopEnd - 0.01));
      } else if (draggingMarker === 'loopEnd') {
        sampleData.loopEnd = Math.max(sampleData.loopStart + 0.01, Math.min(newTime, sampleData.outPoint));
      } else if (draggingMarker === 'outPoint') {
        const newOutPoint = Math.max(sampleData.inPoint + 0.01, Math.min(newTime, sampleData.duration));
        // If outPoint moves past loopEnd, move loopEnd with it
        if (newOutPoint < sampleData.loopEnd) {
          sampleData.loopEnd = newOutPoint;
        }
        sampleData.outPoint = newOutPoint;
      }
      
      // Redraw waveform and markers
      drawMultisampleWaveform(canvas, sampleData.audioBuffer);
      drawMultisampleMarkers(canvas, sampleData);
    }
  });
  
  canvas.addEventListener('mouseup', () => {
    draggingMarker = null;
    canvas.style.cursor = 'pointer';
  });
  
  canvas.addEventListener('mouseleave', () => {
    draggingMarker = null;
    canvas.style.cursor = 'pointer';
  });
  
  // Double-click to apply marker positions to all samples
  canvas.addEventListener('dblclick', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const xNormalized = x / MULTISAMPLE_WAVEFORM_WIDTH;
    
    const sampleData = multisampleFiles[sampleIndex];
    if (!sampleData) return;
    
    // Determine which marker was double-clicked
    const inPos = (sampleData.inPoint / sampleData.duration);
    const loopStartPos = (sampleData.loopStart / sampleData.duration);
    const loopEndPos = (sampleData.loopEnd / sampleData.duration);
    const outPos = (sampleData.outPoint / duration);
    
    const tolerance = 0.03;
    let targetMarker = null;
    
    if (Math.abs(xNormalized - inPos) < tolerance) {
      targetMarker = 'inPoint';
    } else if (Math.abs(xNormalized - loopStartPos) < tolerance) {
      targetMarker = 'loopStart';
    } else if (Math.abs(xNormalized - loopEndPos) < tolerance) {
      targetMarker = 'loopEnd';
    } else if (Math.abs(xNormalized - outPos) < tolerance) {
      targetMarker = 'outPoint';
    }
    
    if (targetMarker) {
      const markerRelativePosition = sampleData[targetMarker] / sampleData.duration;
      
      // Apply to all samples
      multisampleFiles.forEach((sample, index) => {
        if (sample && index !== sampleIndex) {
          sample[targetMarker] = markerRelativePosition * sample.duration;
        }
      });
      
      // Refresh all rows
      reloadMultisampleRows();
    }
  });
}

// Play multisample

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
  
  // Collect all valid samples with their original indices
  const validSamplesWithIndex = [];
  multisampleFiles.forEach((sample, index) => {
    if (sample) {
      validSamplesWithIndex.push({ sample, originalIndex: index });
    }
  });
  
  // Sort by MIDI note (lowest to highest)
  validSamplesWithIndex.sort((a, b) => {
    // Put samples without valid MIDI notes at the end
    if (a.sample.midiNote < 0 && b.sample.midiNote >= 0) return 1;
    if (a.sample.midiNote >= 0 && b.sample.midiNote < 0) return -1;
    if (a.sample.midiNote < 0 && b.sample.midiNote < 0) return 0;
    
    // Sort valid MIDI notes from low to high
    return a.sample.midiNote - b.sample.midiNote;
  });
  
  // Create and append rows in the sorted order
  validSamplesWithIndex.forEach(({ sample, originalIndex }) => {
    const row = createMultisampleRow(originalIndex);
    if (row) {
      row.dataset.sort = sample.midiNote;
      multisampleRowsContainer.appendChild(row);
    }
  });
  
  updateMultisampleDropLabel();
}

// Helper: Convert AudioBuffer to WAV Blob
function bufferToWavBlob(buffer) {
  // Only supports mono or stereo
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const numFrames = buffer.length;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataLength = numFrames * blockAlign;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = buffer.getChannelData(ch)[i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Generate multisample patch
async function generateMultisamplePatch() {
  // Check if JSZip is available
  if (typeof JSZip === 'undefined') {
    alert('JSZip library not loaded. Please wait and try again.');
    return;
  }
  
  // Check if base template is available
  if (typeof baseMultisampleJson === 'undefined') {
    alert('baseMultisampleJson is missing. Patch generation cannot continue.');
    return;
  }
  
  // Collect valid samples with MIDI notes assigned
  const validSamples = multisampleFiles.filter(sample => 
    sample !== null && sample.midiNote >= 0
  );
  
  if (validSamples.length === 0) {
    alert('No valid samples with MIDI notes assigned. Please assign MIDI notes to your samples.');
    return;
  }
  
  multisampleGenerateBtn.disabled = true;
  multisampleGenerateBtn.textContent = 'Generating...';
  
  try {
    const presetName = document.getElementById('preset-name-multi')?.value || 'Multisample';
    const sampleRateIdx = document.getElementById('sample-rate-multi')?.selectedIndex || 0;
    const targetSampleRate = [null, 11025, 22050, 44100][sampleRateIdx];
    
    const zip = new JSZip();
    
    // Deep copy base multisample JSON
    const patchJson = JSON.parse(JSON.stringify(baseMultisampleJson));
    patchJson.name = presetName;
    patchJson.regions = [];
    
    // Apply advanced settings if they exist
    if (multisampleAdvancedSettings) {
      const adv = multisampleAdvancedSettings;
      if (patchJson.engine) {
        if (adv.playmode) patchJson.engine.playmode = adv.playmode;
        if (!isNaN(adv.transpose)) patchJson.engine.transpose = adv.transpose;
        if (!isNaN(adv.velocitySensitivity)) patchJson.engine['velocity.sensitivity'] = adv.velocitySensitivity;
        if (!isNaN(adv.volume)) patchJson.engine.volume = adv.volume;
        if (!isNaN(adv.width)) patchJson.engine.width = adv.width;
        if (!isNaN(adv.highpass)) patchJson.engine.highpass = adv.highpass;
        if (!isNaN(adv.portamentoAmount)) patchJson.engine['portamento.amount'] = adv.portamentoAmount;
        if (!isNaN(adv.portamentoType)) patchJson.engine['portamento.type'] = adv.portamentoType;
        if (!isNaN(adv.tuningRoot)) patchJson.engine['tuning.root'] = adv.tuningRoot;
      }
      
      // Apply envelopes
      if (patchJson.envelope && adv.ampEnvelope) {
        if (!isNaN(adv.ampEnvelope.attack)) patchJson.envelope.amp.attack = adv.ampEnvelope.attack;
        if (!isNaN(adv.ampEnvelope.decay)) patchJson.envelope.amp.decay = adv.ampEnvelope.decay;
        if (!isNaN(adv.ampEnvelope.sustain)) patchJson.envelope.amp.sustain = adv.ampEnvelope.sustain;
        if (!isNaN(adv.ampEnvelope.release)) patchJson.envelope.amp.release = adv.ampEnvelope.release;
      }
      
      if (patchJson.envelope && adv.filterEnvelope) {
        if (!isNaN(adv.filterEnvelope.attack)) patchJson.envelope.filter.attack = adv.filterEnvelope.attack;
        if (!isNaN(adv.filterEnvelope.decay)) patchJson.envelope.filter.decay = adv.filterEnvelope.decay;
        if (!isNaN(adv.filterEnvelope.sustain)) patchJson.envelope.filter.sustain = adv.filterEnvelope.sustain;
        if (!isNaN(adv.filterEnvelope.release)) patchJson.envelope.filter.release = adv.filterEnvelope.release;
      }
    }
    
    const fileReadPromises = [];
    
    // Sort samples by MIDI note for proper key range distribution
    validSamples.sort((a, b) => a.midiNote - b.midiNote);
    
    // Calculate key ranges for each sample
    let lastKey = 0;
    validSamples.forEach((sample, index) => {
      const sampleNote = sample.midiNote;
      sample.lokey = lastKey;
      sample.hikey = sampleNote;
      lastKey = sampleNote + 1;
    });
    // Set the last sample to cover up to MIDI note 127
    if (validSamples.length > 0) {
      validSamples[validSamples.length - 1].hikey = 127;
    }
    
    for (const sample of validSamples) {
      const outputName = sanitizeName(sample.fileName);
      const sampleRate = sample.audioBuffer.sampleRate || 44100;
      const duration = sample.audioBuffer.duration;
      const framecount = sample.audioBuffer.length;
      
      // Create region data for multisample using correct OP-XY format
      const region = {
        framecount: framecount,
        gain: multisampleGain || 0,
        hikey: sample.hikey,
        lokey: sample.lokey,
        "loop.crossfade": 0,
        "loop.end": Math.floor((sample.loopEnd / duration) * framecount),
        "loop.onrelease": multisampleAdvancedSettings.loopEnabled || false,
        "loop.enabled": multisampleAdvancedSettings.loopEnabled || false,
        "loop.start": Math.floor((sample.loopStart / duration) * framecount),
        "pitch.keycenter": sample.midiNote,
        reverse: false,
        sample: outputName,
        "sample.end": Math.floor((sample.outPoint / duration) * framecount),
        "sample.start": Math.floor((sample.inPoint / duration) * framecount),
        tune: 0
      };
      
      // Create WAV blob from AudioBuffer
      const wavBlob = bufferToWavBlob(sample.audioBuffer);
      
      if (targetSampleRate && sampleRate !== targetSampleRate) {
        // Resample if needed (this would require additional implementation)
        fileReadPromises.push(
          Promise.resolve(wavBlob).then(blob => {
            zip.file(outputName, blob);
            patchJson.regions.push(region);
          })
        );
      } else {
        fileReadPromises.push(
          Promise.resolve(wavBlob).then(blob => {
            zip.file(outputName, blob);
            patchJson.regions.push(region);
          })
        );
      }
    }
    
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
    alert('Patch generation failed: ' + (err && err.message ? err.message : err));
  } finally {
    multisampleGenerateBtn.disabled = false;
    multisampleGenerateBtn.textContent = 'generate patch';
  }
}

// Update multisample generate button state
function updateMultisampleGenerateButton() {
  if (!multisampleGenerateBtn) return;
  
  // Check if any sample with valid MIDI note is present
  const hasValidSample = multisampleFiles.some(sample => 
    sample !== null && sample.midiNote >= 0
  );
  
  multisampleGenerateBtn.disabled = !hasValidSample;
  
  if (!hasValidSample) {
    multisampleGenerateBtn.title = 'Load samples and assign MIDI notes to enable patch generation';
  } else {
    multisampleGenerateBtn.title = '';
  }
}

// == Multisample Tool UI Functions ==

// Add browse button logic for multisample loader
function initMultisampleBrowseButton() {
  var multiBrowseBtn = document.querySelector('label[for="multisample-file-input"]');
  var multiFileInput = document.getElementById('multisample-file-input');
  if (multiBrowseBtn && multiFileInput) {
    multiBrowseBtn.addEventListener('click', function() {
      multiFileInput.value = '';
    });
    multiFileInput.addEventListener('change', async function(e) {
      if (multiFileInput.files && multiFileInput.files.length > 0 && window.processMultisampleFiles) {
        await processMultisampleFiles(Array.from(multiFileInput.files));
      }
    });
  }
}

// Initialize multisample tool UI on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  initMultisampleBrowseButton();
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Ensure preset gain is set to 0 dB on load
  if (multisampleGainSlider && multisampleGainValue) {
    multisampleGainSlider.value = '0';
    multisampleGainValue.textContent = '0 dB';
    multisampleGain = 0;
  } else {
    multisampleGain = 0;
  }
  
  // Add click event listener to generate patch button
  if (multisampleGenerateBtn) {
    multisampleGenerateBtn.addEventListener('click', generateMultisamplePatch);
  }
  
  updateMultisampleGenerateButton();
  updateMultisampleDropLabel();
  initializeMultisampleAdvancedModal();
  
  // Initialize patch size display
  updateMultiPatchSize();
  
  // Add event listener for sample rate changes
  const sampleRateSelect = document.getElementById('sample-rate-multi');
  if (sampleRateSelect) {
    sampleRateSelect.addEventListener('change', function() {
      // Update patch size when sample rate changes
      updateMultiPatchSize();
    });
  }
});

let multisampleAdvancedModalInitialized = false;

function initializeMultisampleAdvancedModal() {
  // Reset to defaults on first open
  if (!multisampleAdvancedModalInitialized) {
    document.getElementById('multisample-preset-playmode').value = 'poly';
    document.getElementById('multisample-preset-loop-enabled').checked = true;
    document.getElementById('multisample-preset-velocity-sensitivity').value = 15;
    document.getElementById('multisample-preset-velocity-sensitivity-number').value = 15;
    document.getElementById('multisample-preset-volume').value = 80;
    document.getElementById('multisample-preset-volume-number').value = 80;
    document.getElementById('multisample-preset-width').value = 0;
    document.getElementById('multisample-preset-width-number').value = 0;
    document.getElementById('multisample-preset-transpose').value = 0;
    document.getElementById('multisample-preset-transpose-number').value = 0;
    document.getElementById('multisample-preset-highpass').value = 0;
    document.getElementById('multisample-preset-highpass-number').value = 0;
    document.getElementById('multisample-preset-portamento-amount').value = 0;
    document.getElementById('multisample-preset-portamento-amount-number').value = 0;
    document.getElementById('multisample-preset-tuning-root').value = 0;
    document.getElementById('multisample-amp-attack').value = 0;
    document.getElementById('multisample-amp-attack-number').value = 0;
    document.getElementById('multisample-amp-decay').value = 0;
    document.getElementById('multisample-amp-decay-number').value = 0;
    document.getElementById('multisample-amp-sustain').value = 100;
    document.getElementById('multisample-amp-sustain-number').value = 100;
    document.getElementById('multisample-amp-release').value = 0;
    document.getElementById('multisample-amp-release-number').value = 0;
    document.getElementById('multisample-filter-attack').value = 0;
    document.getElementById('multisample-filter-attack-number').value = 0;
    document.getElementById('multisample-filter-decay').value = 0;
    document.getElementById('multisample-filter-decay-number').value = 0;
    document.getElementById('multisample-filter-sustain').value = 100;
    document.getElementById('multisample-filter-sustain-number').value = 100;
    document.getElementById('multisample-filter-release').value = 0;
    document.getElementById('multisample-filter-release-number').value = 0;
    multisampleAdvancedModalInitialized = true;
  }

  // Sync sliders with number inputs
  const sliderPairs = [
    ['multisample-preset-transpose', 'multisample-preset-transpose-number'],
    ['multisample-preset-velocity-sensitivity', 'multisample-preset-velocity-sensitivity-number'],
    ['multisample-preset-volume', 'multisample-preset-volume-number'],
    ['multisample-preset-width', 'multisample-preset-width-number'],
    ['multisample-preset-highpass', 'multisample-preset-highpass-number'],
    ['multisample-preset-portamento-amount', 'multisample-preset-portamento-amount-number'],
    ['multisample-amp-attack', 'multisample-amp-attack-number'],
    ['multisample-amp-decay', 'multisample-amp-decay-number'],
    ['multisample-amp-sustain', 'multisample-amp-sustain-number'],
    ['multisample-amp-release', 'multisample-amp-release-number'],
    ['multisample-filter-attack', 'multisample-filter-attack-number'],
    ['multisample-filter-decay', 'multisample-filter-decay-number'],
    ['multisample-filter-sustain', 'multisample-filter-sustain-number'],
    ['multisample-filter-release', 'multisample-filter-release-number']
  ];

  sliderPairs.forEach(([sliderId, numberId]) => {
    const slider = document.getElementById(sliderId);
    const number = document.getElementById(numberId);
    
    if (slider && number) {
      slider.addEventListener('input', () => {
        number.value = slider.value;
      });
      
      number.addEventListener('input', () => {
        slider.value = number.value;
      });
    }
  });

  // Save button handler
  const saveBtn = document.getElementById('save-multisample-preset-advanced-settings');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      // Update advanced settings object - convert percentages to internal values
      multisampleAdvancedSettings.playmode = document.getElementById('multisample-preset-playmode')?.value || 'poly';
      multisampleAdvancedSettings.loopEnabled = document.getElementById('multisample-preset-loop-enabled')?.checked || false;
      multisampleAdvancedSettings.transpose = parseInt(document.getElementById('multisample-preset-transpose')?.value || 0);
      
      // Convert percentage values to internal 0-32767 format
      const velocityPercent = parseInt(document.getElementById('multisample-preset-velocity-sensitivity')?.value || 15);
      const volumePercent = parseInt(document.getElementById('multisample-preset-volume')?.value || 80);
      const widthPercent = parseInt(document.getElementById('multisample-preset-width')?.value || 0);
      const highpassPercent = parseInt(document.getElementById('multisample-preset-highpass')?.value || 0);
      const portamentoAmountPercent = parseInt(document.getElementById('multisample-preset-portamento-amount')?.value || 0);
      
      multisampleAdvancedSettings.velocitySensitivity = percentToInternal(velocityPercent);
      multisampleAdvancedSettings.volume = percentToInternal(volumePercent);
      multisampleAdvancedSettings.width = percentToInternal(widthPercent);
      multisampleAdvancedSettings.highpass = percentToInternal(highpassPercent);
      multisampleAdvancedSettings.portamentoAmount = percentToInternal(portamentoAmountPercent);
      
      multisampleAdvancedSettings.portamentoType = parseInt(document.getElementById('multisample-preset-portamento-type')?.value || 32767);
      multisampleAdvancedSettings.tuningRoot = parseInt(document.getElementById('multisample-preset-tuning-root')?.value || 0);
      
      // Amp envelope - convert percentages to internal values
      const ampAttackPercent = parseInt(document.getElementById('multisample-amp-attack')?.value || 0);
      const ampDecayPercent = parseInt(document.getElementById('multisample-amp-decay')?.value || 0);
      const ampSustainPercent = parseInt(document.getElementById('multisample-amp-sustain')?.value || 100);
      const ampReleasePercent = parseInt(document.getElementById('multisample-amp-release')?.value || 0);
      
      multisampleAdvancedSettings.ampEnvelope.attack = percentToInternal(ampAttackPercent);
      multisampleAdvancedSettings.ampEnvelope.decay = percentToInternal(ampDecayPercent);
      multisampleAdvancedSettings.ampEnvelope.sustain = percentToInternal(ampSustainPercent);
      multisampleAdvancedSettings.ampEnvelope.release = percentToInternal(ampReleasePercent);
      
      // Filter envelope - convert percentages to internal values
      const filterAttackPercent = parseInt(document.getElementById('multisample-filter-attack')?.value || 0);
      const filterDecayPercent = parseInt(document.getElementById('multisample-filter-decay')?.value || 0);
      const filterSustainPercent = parseInt(document.getElementById('multisample-filter-sustain')?.value || 100);
      const filterReleasePercent = parseInt(document.getElementById('multisample-filter-release')?.value || 0);
      
      multisampleAdvancedSettings.filterEnvelope.attack = percentToInternal(filterAttackPercent);
      multisampleAdvancedSettings.filterEnvelope.decay = percentToInternal(filterDecayPercent);
      multisampleAdvancedSettings.filterEnvelope.sustain = percentToInternal(filterSustainPercent);
      multisampleAdvancedSettings.filterEnvelope.release = percentToInternal(filterReleasePercent);
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('multisample-preset-advanced-modal'));
      if (modal) {
        modal.hide();
      }
    });
  }
}
