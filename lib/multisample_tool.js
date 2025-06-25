// === Multisample Tool Logic ===

const MULTISAMPLE_MAX_SAMPLES = 24;
const MULTISAMPLE_WAVEFORM_WIDTH = 400;
const MULTISAMPLE_WAVEFORM_HEIGHT = 60;

// Variables for multisample samples
const multisampleFiles = Array(MULTISAMPLE_MAX_SAMPLES).fill(null);
let multisampleGain = 0;
let multisampleAdvancedSettings = {
  playmode: 'poly',
  transpose: 0,
  velocitySensitivity: 31, // % (maps to 10240 internally)
  volume: 50, // % (maps to 16466 internally)
  width: 9, // % (maps to 3072 internally)
  highpass: 0, // % (maps to 0-32767 internally)
  portamentoType: 32767, // linear
  portamentoAmount: 0, // % (maps to 0-32767 internally)
  tuningRoot: 0, // C
  ampEnvelope: {
    attack: 0, // % (maps to 0-32767 internally)
    decay: 0,
    sustain: 0,
    release: 100 // % (maps to 32767 internally)
  },
  filterEnvelope: {
    attack: 100, // % (maps to 32767 internally)
    decay: 100,
    sustain: 100,
    release: 0
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
  
  // Loop markers (grey)
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(loopStartPos, 0);
  ctx.lineTo(loopStartPos, MULTISAMPLE_WAVEFORM_HEIGHT);
  ctx.moveTo(loopEndPos, 0);
  ctx.lineTo(loopEndPos, MULTISAMPLE_WAVEFORM_HEIGHT);
  ctx.stroke();
  
  // Marker handles
  const handleRadius = 6;
  ctx.fillStyle = '#dc3545';
  ctx.beginPath();
  ctx.arc(inPos, MULTISAMPLE_WAVEFORM_HEIGHT - 8, handleRadius, 0, 2 * Math.PI);
  ctx.arc(outPos, MULTISAMPLE_WAVEFORM_HEIGHT - 8, handleRadius, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.arc(loopStartPos, MULTISAMPLE_WAVEFORM_HEIGHT - 8, handleRadius, 0, 2 * Math.PI);
  ctx.arc(loopEndPos, MULTISAMPLE_WAVEFORM_HEIGHT - 8, handleRadius, 0, 2 * Math.PI);
  ctx.fill();
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
      
      // Apply constraints
      if (draggingMarker === 'inPoint') {
        sampleData.inPoint = Math.max(0, Math.min(newTime, sampleData.outPoint - 0.01));
      } else if (draggingMarker === 'loopStart') {
        sampleData.loopStart = Math.max(sampleData.inPoint, Math.min(newTime, sampleData.loopEnd - 0.01));
      } else if (draggingMarker === 'loopEnd') {
        sampleData.loopEnd = Math.max(sampleData.loopStart + 0.01, Math.min(newTime, sampleData.outPoint));
      } else if (draggingMarker === 'outPoint') {
        sampleData.outPoint = Math.max(sampleData.inPoint + 0.01, Math.min(newTime, sampleData.duration));
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
    const outPos = (sampleData.outPoint / sampleData.duration);
    
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
  
  const validSamples = [];
  multisampleFiles.forEach((sample, index) => {
    if (sample) {
      const row = createMultisampleRow(index);
      if (row) {
        validSamples.push(sample);
        multisampleRowsContainer.appendChild(row);
      }
    }
  });
  
  // Sort rows by MIDI note
  validSamples.sort((a, b) => a.midiNote - b.midiNote);
  
  // Update sort values and re-append rows
  validSamples.forEach((sample, index) => {
    sample.sort = index;
    const row = multisampleRowsContainer.children[index];
    if (row) {
      row.dataset.sort = sample.midiNote;
      multisampleRowsContainer.appendChild(row);
    }
  });
}

// Generate multisample patch
function generateMultisamplePatch() {
  // Collect valid samples
  const samplesToInclude = multisampleFiles.filter(sample => sample !== null);
  
  if (samplesToInclude.length === 0) {
    alert('No valid samples to include in the patch.');
    return;
  }
  
  // Create patch object
  const patch = {
    samples: samplesToInclude,
    gain: multisampleGain,
    advancedSettings: multisampleAdvancedSettings
  };
  
  // TODO: Convert patch object to actual patch data
  console.log('Generated patch:', patch);
  
  alert('Multisample patch generated! Check console for details.');
}

// Update multisample generate button state
function updateMultisampleGenerateButton() {
  if (!multisampleGenerateBtn) return;
  
  // Check if any sample is present
  const hasSample = multisampleFiles.some(sample => sample !== null);
  
  multisampleGenerateBtn.disabled = !hasSample;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Ensure preset gain is set to 0 dB on load
  if (multisampleGainSlider && multisampleGainValue) {
    multisampleGainSlider.value = '0';
    multisampleGainValue.textContent = '0 dB';
    multisampleGain = 0;
  }
  updateMultisampleGenerateButton();
  initializeMultisampleAdvancedModal();
});

let multisampleAdvancedModalInitialized = false;

function initializeMultisampleAdvancedModal() {
  // Reset to defaults on first open
  if (!multisampleAdvancedModalInitialized) {
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
      // Update advanced settings object
      multisampleAdvancedSettings.playmode = document.getElementById('multisample-preset-playmode')?.value || 'poly';
      multisampleAdvancedSettings.transpose = parseInt(document.getElementById('multisample-preset-transpose')?.value || 0);
      multisampleAdvancedSettings.velocitySensitivity = parseInt(document.getElementById('multisample-preset-velocity-sensitivity')?.value || 31);
      multisampleAdvancedSettings.volume = parseInt(document.getElementById('multisample-preset-volume')?.value || 50);
      multisampleAdvancedSettings.width = parseInt(document.getElementById('multisample-preset-width')?.value || 9);
      multisampleAdvancedSettings.highpass = parseInt(document.getElementById('multisample-preset-highpass')?.value || 0);
      multisampleAdvancedSettings.portamentoType = parseInt(document.getElementById('multisample-preset-portamento-type')?.value || 32767);
      multisampleAdvancedSettings.portamentoAmount = parseInt(document.getElementById('multisample-preset-portamento-amount')?.value || 0);
      multisampleAdvancedSettings.tuningRoot = parseInt(document.getElementById('multisample-preset-tuning-root')?.value || 0);
      
      // Amp envelope
      multisampleAdvancedSettings.ampEnvelope.attack = parseInt(document.getElementById('multisample-amp-attack')?.value || 0);
      multisampleAdvancedSettings.ampEnvelope.decay = parseInt(document.getElementById('multisample-amp-decay')?.value || 0);
      multisampleAdvancedSettings.ampEnvelope.sustain = parseInt(document.getElementById('multisample-amp-sustain')?.value || 0);
      multisampleAdvancedSettings.ampEnvelope.release = parseInt(document.getElementById('multisample-amp-release')?.value || 100);
      
      // Filter envelope
      multisampleAdvancedSettings.filterEnvelope.attack = parseInt(document.getElementById('multisample-filter-attack')?.value || 100);
      multisampleAdvancedSettings.filterEnvelope.decay = parseInt(document.getElementById('multisample-filter-decay')?.value || 100);
      multisampleAdvancedSettings.filterEnvelope.sustain = parseInt(document.getElementById('multisample-filter-sustain')?.value || 100);
      multisampleAdvancedSettings.filterEnvelope.release = parseInt(document.getElementById('multisample-filter-release')?.value || 0);
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('multisample-preset-advanced-modal'));
      if (modal) {
        modal.hide();
      }
    });
  }
}

// Convert percentage to internal value (0-100% -> 0-32767)
function percentToInternal(percent) {
  return Math.round((percent / 100) * 32767);
}

// Convert internal value to percentage (0-32767 -> 0-100%)
function internalToPercent(internal) {
  return Math.round((internal / 32767) * 100);
}
