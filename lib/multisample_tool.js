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
  const currentSizeElement = document.getElementById(
    "multi-current-patch-size"
  );
  const progressBar = document.getElementById("multi-patch-size-progress");
  const statusElement = document.getElementById("multi-patch-size-status");

  if (!currentSizeElement || !progressBar || !statusElement) return;

  const sizeInMB = multiTotalPatchSize / (1024 * 1024);
  const percentage = (sizeInMB / 8) * 100; // 8MB limit

  // Update display
  currentSizeElement.textContent = `${sizeInMB.toFixed(1)} MB`;
  progressBar.style.width = `${Math.min(percentage, 100)}%`;

  // Update status and styling - MONOCHROME ONLY
  if (percentage >= 90) {
    statusElement.textContent =
      "patch size too large - consider reducing sample rate";
    progressBar.className = "progress-bar danger";
    statusElement.className = "small text-muted mt-1 danger";
  } else if (percentage >= 70) {
    statusElement.textContent = "approaching size limit";
    progressBar.className = "progress-bar warning";
    statusElement.className = "small text-muted mt-1 warning";
  } else {
    statusElement.textContent = "plenty of space remaining";
    progressBar.className = "progress-bar";
    statusElement.className = "small text-muted mt-1";
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
          numberOfChannels: sample.audioBuffer.numberOfChannels,
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
  const sampleRateSelect = document.getElementById("sample-rate-multi");
  const value = parseInt(sampleRateSelect.value);

  switch (value) {
    case 1:
      return 11025;
    case 2:
      return 22050;
    case 3:
      return 44100;
    default:
      return 0; // Keep original
  }
}

let multisampleAdvancedSettings = {
  playmode: "poly",
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
    release: percentToInternal(0), // 0% -> 0 internal (changed from 100 to match default UI)
  },
  filterEnvelope: {
    attack: percentToInternal(0), // 0% -> 0 internal (changed from 100 to match default UI)
    decay: percentToInternal(0), // 0% -> 0 internal (changed from 100 to match default UI)
    sustain: percentToInternal(100), // 100% -> 32767 internal
    release: percentToInternal(0), // 0% -> 0 internal
  },
};

// Get DOM elements
const multisampleDropArea = document.getElementById("multisample-drop-area");
const multisampleRowsContainer = document.getElementById(
  "multisample-rows-container"
);
const multisampleDropLabel = document.getElementById("multisample-drop-label");
const multisampleGenerateBtn = document.getElementById(
  "generate-multisample-patch"
);
const multisampleGainSlider = document.getElementById("gain-slider-multi");
const multisampleGainValue = document.getElementById("gain-value-multi");

// Initialize gain slider
if (multisampleGainSlider && multisampleGainValue) {
  // Set initial value
  multisampleGainValue.textContent = `${multisampleGainSlider.value} dB`;

  multisampleGainSlider.addEventListener("input", () => {
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

  const audioFiles = files.filter((file) => file.type.startsWith("audio/"));
  const loadPromises = [];

  // Assign slots and create promises
  for (const file of audioFiles) {
    const slotIndex = multisampleFiles.findIndex((slot) => slot === null);

    if (slotIndex === -1) {
      alert("Maximum number of samples reached. Some files were not loaded.");
      break;
    }

    // Reserve the slot to prevent race conditions with a proper placeholder
    multisampleFiles[slotIndex] = {
      fileName: "Loading...",
      midiNote: -1,
      audioBuffer: null,
      duration: 0,
      inPoint: 0,
      outPoint: 0,
      loopStart: 0,
      loopEnd: 0,
      hasLoopData: false,
      isLoading: true,
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
      hasLoopData: metadata.hasLoopData,
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
  const slotIndex = multisampleFiles.findIndex((slot) => slot === null);

  if (slotIndex === -1) {
    alert("Maximum number of samples reached");
    return;
  }

  // Reserve the slot to prevent race conditions with a proper placeholder
  multisampleFiles[slotIndex] = {
    fileName: "Loading...",
    midiNote: -1,
    audioBuffer: null,
    duration: 0,
    inPoint: 0,
    outPoint: 0,
    loopStart: 0,
    loopEnd: 0,
    hasLoopData: false,
    isLoading: true,
  };
  reloadMultisampleRows(); // Show placeholder

  try {
    await loadMultisampleFileInternal(file, slotIndex);
  } catch (error) {
    alert(
      `Failed to load "${file.name}". Please check the console for details.`
    );
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

  const hasSamples = multisampleFiles.some((sample) => sample !== null);
  multisampleDropLabel.style.display = hasSamples ? "none" : "block";
}

// Helper: Recursively collect files from DataTransferItemList (folders and files)
async function collectFilesFromDataTransferItems(items) {
  const files = [];
  const promises = [];

  function traverseFileTree(entry, path = "") {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file) => {
          // Only accept .wav files
          if (file.name.toLowerCase().endsWith(".wav")) {
            files.push(file);
          }
          resolve();
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        dirReader.readEntries(async (entries) => {
          const subPromises = entries.map((e) =>
            traverseFileTree(e, path + entry.name + "/")
          );
          await Promise.all(subPromises);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) {
        promises.push(traverseFileTree(entry));
      } else {
        // fallback: treat as file
        const file = item.getAsFile();
        if (file && file.name.toLowerCase().endsWith(".wav")) {
          files.push(file);
        }
      }
    }
  }
  await Promise.all(promises);
  return files;
}

// Set up drag and drop functionality
if (multisampleDropArea) {
  multisampleDropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    multisampleDropArea.classList.add("dragover");
  });

  multisampleDropArea.addEventListener("dragleave", (e) => {
    e.preventDefault();
    multisampleDropArea.classList.remove("dragover");
  });

  multisampleDropArea.addEventListener("drop", async (e) => {
    e.preventDefault();
    multisampleDropArea.classList.remove("dragover");

    let files = [];
    // Prefer DataTransferItemList for folder support
    if (
      e.dataTransfer.items &&
      e.dataTransfer.items.length > 0 &&
      e.dataTransfer.items[0].webkitGetAsEntry
    ) {
      files = await collectFilesFromDataTransferItems(e.dataTransfer.items);
    } else {
      files = Array.from(e.dataTransfer.files);
    }
    await processMultisampleFiles(files);
  });
}

// Make processMultisampleFiles available globally for the browse button
window.processMultisampleFiles = processMultisampleFiles;

// Handle file input change for the browse button - handled in initMultisampleBrowseButton()

// Use parseFilename from audio_tools.js for robust MIDI note extraction
function extractMidiNoteFromFilename(filename) {
  try {
    // parseFilename returns [baseName, midiNote]
    const result =
      typeof parseFilename === "function" ? parseFilename(filename) : null;
    if (result && Array.isArray(result) && typeof result[1] === "number") {
      return result[1];
    }
  } catch (e) {
    // ignore, fallback below
  }
  // fallback to old logic if parseFilename not available or fails
  try {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
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
  if (midiNote < 0 || midiNote > 127) return "invalid";
  const noteNames = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
}

// Convert note string to MIDI value (simplified)
function noteStringToMidiValue(noteString) {
  const noteMap = {
    C: 0,
    "C#": 1,
    DB: 1,
    D: 2,
    "D#": 3,
    EB: 3,
    E: 4,
    F: 5,
    "F#": 6,
    GB: 6,
    G: 7,
    "G#": 8,
    AB: 8,
    A: 9,
    "A#": 10,
    BB: 10,
    B: 11,
  };

  const match = noteString.toUpperCase().match(/^([A-G][#B]?)(\d+)$/);
  if (!match) throw new Error("Invalid note format");

  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteValue = noteMap[note];

  if (noteValue === undefined) throw new Error("Invalid note name");

  return (octave + 1) * 12 + noteValue;
}

// Parse note input (MIDI number or note name)
function parseNoteInput(input) {
  if (!input || input.trim() === "") return null;

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
  const ctx = canvas.getContext("2d");
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / MULTISAMPLE_WAVEFORM_WIDTH);
  const amp = MULTISAMPLE_WAVEFORM_HEIGHT / 2;

  // Clear canvas
  ctx.clearRect(0, 0, MULTISAMPLE_WAVEFORM_WIDTH, MULTISAMPLE_WAVEFORM_HEIGHT);

  // Background
  ctx.fillStyle = "#ececec";
  ctx.fillRect(0, 0, MULTISAMPLE_WAVEFORM_WIDTH, MULTISAMPLE_WAVEFORM_HEIGHT);

  // Border
  ctx.fillStyle = "#868686";
  ctx.fillRect(0, 0, 1, MULTISAMPLE_WAVEFORM_HEIGHT);
  ctx.fillRect(
    MULTISAMPLE_WAVEFORM_WIDTH - 1,
    0,
    1,
    MULTISAMPLE_WAVEFORM_HEIGHT
  );

  // Waveform
  ctx.fillStyle = "#333";

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

    ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
  }

  // Draw center line
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, MULTISAMPLE_WAVEFORM_HEIGHT / 2);
  ctx.lineTo(MULTISAMPLE_WAVEFORM_WIDTH, MULTISAMPLE_WAVEFORM_HEIGHT / 2);
  ctx.stroke();
}

// Draw markers on waveform canvas
function drawMultisampleMarkers(canvas, sampleData) {
  const ctx = canvas.getContext("2d");
  const duration = sampleData.duration;

  // Ensure we have valid duration
  if (!duration || duration <= 0) return;

  // Calculate marker positions
  const inPos = (sampleData.inPoint / duration) * MULTISAMPLE_WAVEFORM_WIDTH;
  const loopStartPos =
    (sampleData.loopStart / duration) * MULTISAMPLE_WAVEFORM_WIDTH;
  const loopEndPos =
    (sampleData.loopEnd / duration) * MULTISAMPLE_WAVEFORM_WIDTH;
  const outPos = (sampleData.outPoint / duration) * MULTISAMPLE_WAVEFORM_WIDTH;

  // In/Out markers (dark grey for monochrome)
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(inPos, 0);
  ctx.lineTo(inPos, MULTISAMPLE_WAVEFORM_HEIGHT);
  ctx.moveTo(outPos, 0);
  ctx.lineTo(outPos, MULTISAMPLE_WAVEFORM_HEIGHT);
  ctx.stroke();

  // Loop markers as triangles at the top and vertical lines (light grey)
  const triangleSize = 10; // Increased from 8 for better visibility
  ctx.fillStyle = "#666";
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1;

  // Loop start - draw vertical line first (centered)
  ctx.beginPath();
  ctx.moveTo(loopStartPos, 0);
  ctx.lineTo(loopStartPos, MULTISAMPLE_WAVEFORM_HEIGHT);
  ctx.stroke();
  
  // Fill the triangle part
  ctx.beginPath();
  ctx.moveTo(loopStartPos - triangleSize / 2, 0);
  ctx.lineTo(loopStartPos + triangleSize / 2, 0);
  ctx.lineTo(loopStartPos, triangleSize);
  ctx.closePath();
  ctx.fill();

  // Loop end - draw vertical line first (centered)
  ctx.beginPath();
  ctx.moveTo(loopEndPos, 0);
  ctx.lineTo(loopEndPos, MULTISAMPLE_WAVEFORM_HEIGHT);
  ctx.stroke();
  
  // Fill the triangle part
  ctx.beginPath();
  ctx.moveTo(loopEndPos - triangleSize / 2, 0);
  ctx.lineTo(loopEndPos + triangleSize / 2, 0);
  ctx.lineTo(loopEndPos, triangleSize);
  ctx.closePath();
  ctx.fill();

  // In/Out marker handles - triangles pointing up from bottom (dark grey for monochrome)
  ctx.fillStyle = "#333";
  const sampleTriangleSize = 10; // Match loop triangle size (increased from 8)
  const bottomY = MULTISAMPLE_WAVEFORM_HEIGHT; // No gap at bottom
  
  // Sample start triangle (pointing up)
  ctx.beginPath();
  ctx.moveTo(inPos - sampleTriangleSize / 2, bottomY);
  ctx.lineTo(inPos + sampleTriangleSize / 2, bottomY);
  ctx.lineTo(inPos, bottomY - sampleTriangleSize);
  ctx.closePath();
  ctx.fill();
  
  // Sample end triangle (pointing up)
  ctx.beginPath();
  ctx.moveTo(outPos - sampleTriangleSize / 2, bottomY);
  ctx.lineTo(outPos + sampleTriangleSize / 2, bottomY);
  ctx.lineTo(outPos, bottomY - sampleTriangleSize);
  ctx.closePath();
  ctx.fill();
}

// Create sample row HTML
function createMultisampleRow(sampleIndex) {
  const sampleData = multisampleFiles[sampleIndex];
  if (!sampleData) return null;

  const row = document.createElement("div");
  row.className = "multisample-row";
  row.dataset.sampleIndex = sampleIndex;
  row.dataset.sort = sampleData.midiNote || -1;

  // Label box
  const labelBox = document.createElement("div");
  labelBox.className = "multisample-label-box";

  const midiLabel = document.createElement("div");
  midiLabel.className = "multisample-midi-label";

  // Handle loading state
  if (sampleData.isLoading) {
    midiLabel.textContent = "loading...";
    midiLabel.classList.add("loading");
  } else if (!sampleData.midiNote || sampleData.midiNote < 0) {
    midiLabel.textContent = "click to set note";
    midiLabel.classList.add("invalid");
  } else {
    midiLabel.textContent = `${midiNoteToString(sampleData.midiNote)} (${
      sampleData.midiNote
    })`;
  }

  // Make MIDI label editable (only if not loading)
  if (!sampleData.isLoading) {
    midiLabel.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "text";
      input.value = midiLabel.textContent;
      input.className = "form-control form-control-sm";
      input.style.width = "180px";

      midiLabel.replaceWith(input);
      input.focus();
      input.select(); // Auto-select all text for easy overwriting

      const saveValue = () => {
        const noteValue = parseNoteInput(input.value);
        if (noteValue !== null) {
          sampleData.midiNote = noteValue;
          midiLabel.textContent = `${midiNoteToString(
            noteValue
          )} (${noteValue})`;
          midiLabel.classList.remove("invalid");
          row.dataset.sort = noteValue;
          reloadMultisampleRows();
        } else {
          // If input is invalid, restore the original value if it existed
          if (sampleData.midiNote >= 0) {
            midiLabel.textContent = `${midiNoteToString(sampleData.midiNote)} (${sampleData.midiNote})`;
            midiLabel.classList.remove("invalid");
          } else {
            midiLabel.textContent = "click to set note";
            midiLabel.classList.add("invalid");
          }
        }
        input.replaceWith(midiLabel);
        updateMultisampleGenerateButton();
      };

      input.addEventListener("blur", saveValue);
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          saveValue();
        }
      });
    });
  }

  const fileName = document.createElement("div");
  fileName.className = "multisample-file-name";
  fileName.textContent = sampleData.fileName;

  labelBox.appendChild(midiLabel);
  labelBox.appendChild(fileName);

  // Waveform container
  const waveformContainer = document.createElement("div");
  waveformContainer.className = "multisample-waveform-container";

  if (sampleData.audioBuffer && !sampleData.isLoading) {
    const canvas = document.createElement("canvas");
    canvas.width = MULTISAMPLE_WAVEFORM_WIDTH;
    canvas.height = MULTISAMPLE_WAVEFORM_HEIGHT;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    // Draw waveform and markers
    drawMultisampleWaveform(canvas, sampleData.audioBuffer);
    drawMultisampleMarkers(canvas, sampleData);

    waveformContainer.appendChild(canvas);

    // Add canvas interaction for marker dragging
    addMultisampleCanvasInteractions(canvas, sampleIndex);
  } else {
    // Show loading placeholder
    const placeholder = document.createElement("div");
    placeholder.className = "waveform-placeholder";
    placeholder.textContent = sampleData.isLoading
      ? "Loading..."
      : "No waveform data";
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
  const actions = document.createElement("div");
  actions.className = "multisample-actions";

  const playBtn = document.createElement("button");
  playBtn.className = "btn btn-outline-secondary btn-sm";
  playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
  playBtn.title = "Play sample";
  playBtn.disabled = sampleData.isLoading || !sampleData.audioBuffer;
  if (!sampleData.isLoading && sampleData.audioBuffer) {
    playBtn.addEventListener("click", () => playMultisample(sampleIndex));
  }

  const zoomBtn = document.createElement("button");
  zoomBtn.className = "btn btn-outline-secondary btn-sm";
  zoomBtn.innerHTML = '<i class="fa fa-search-plus"></i>';
  zoomBtn.title = "Edit markers in zoom view";
  zoomBtn.disabled = sampleData.isLoading || !sampleData.audioBuffer;
  if (!sampleData.isLoading && sampleData.audioBuffer) {
    zoomBtn.addEventListener("click", () => openMultisampleZoomModal(sampleIndex));
  }

  const clearBtn = document.createElement("button");
  clearBtn.className = "btn btn-outline-secondary btn-sm";
  clearBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
  clearBtn.title = "Remove sample";
  clearBtn.addEventListener("click", () => {
    multisampleFiles[sampleIndex] = null;
    reloadMultisampleRows();
    updateMultisampleGenerateButton();
    // Update patch size indicator
    updateMultiPatchSize();
  });

  actions.appendChild(playBtn);
  actions.appendChild(zoomBtn);
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

  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xNormalized = x / MULTISAMPLE_WAVEFORM_WIDTH;

    const sampleData = multisampleFiles[sampleIndex];
    if (!sampleData) return;

    // Calculate marker positions
    const inPos = sampleData.inPoint / sampleData.duration;
    const loopStartPos = sampleData.loopStart / sampleData.duration;
    const loopEndPos = sampleData.loopEnd / sampleData.duration;
    const outPos = sampleData.outPoint / sampleData.duration;

    const tolerance = 0.08; // Increased tolerance for easier marker grabbing

    // Zone-based marker selection based on vertical position
    const height = MULTISAMPLE_WAVEFORM_HEIGHT;
    const topZone = height * 0.2; // Top 20% - loop markers priority
    const bottomZone = height * 0.8; // Bottom 20% - sample markers priority

    let candidateMarkers = [];

    // Determine which markers are within horizontal tolerance
    if (Math.abs(xNormalized - inPos) < tolerance) {
      candidateMarkers.push({ marker: "inPoint", distance: Math.abs(xNormalized - inPos), type: "sample" });
    }
    if (Math.abs(xNormalized - loopStartPos) < tolerance) {
      candidateMarkers.push({ marker: "loopStart", distance: Math.abs(xNormalized - loopStartPos), type: "loop" });
    }
    if (Math.abs(xNormalized - loopEndPos) < tolerance) {
      candidateMarkers.push({ marker: "loopEnd", distance: Math.abs(xNormalized - loopEndPos), type: "loop" });
    }
    if (Math.abs(xNormalized - outPos) < tolerance) {
      candidateMarkers.push({ marker: "outPoint", distance: Math.abs(xNormalized - outPos), type: "sample" });
    }

    if (candidateMarkers.length > 0) {
      // Apply zone-based selection
      if (y <= topZone) {
        // Top zone - prefer loop markers
        const loopMarkers = candidateMarkers.filter(m => m.type === "loop");
        if (loopMarkers.length > 0) {
          draggingMarker = loopMarkers.reduce((a, b) => a.distance < b.distance ? a : b).marker;
        } else {
          draggingMarker = candidateMarkers.reduce((a, b) => a.distance < b.distance ? a : b).marker;
        }
      } else if (y >= bottomZone) {
        // Bottom zone - prefer sample markers
        const sampleMarkers = candidateMarkers.filter(m => m.type === "sample");
        if (sampleMarkers.length > 0) {
          draggingMarker = sampleMarkers.reduce((a, b) => a.distance < b.distance ? a : b).marker;
        } else {
          draggingMarker = candidateMarkers.reduce((a, b) => a.distance < b.distance ? a : b).marker;
        }
      } else {
        // Middle zone - any marker, closest wins
        draggingMarker = candidateMarkers.reduce((a, b) => a.distance < b.distance ? a : b).marker;
      }
    } else {
      // Click on waveform - move nearest marker based on constraints
      const newTime = xNormalized * sampleData.duration;
      
      // Find the nearest marker and apply constraints
      const distances = {
        inPoint: Math.abs(xNormalized - inPos),
        loopStart: Math.abs(xNormalized - loopStartPos),
        loopEnd: Math.abs(xNormalized - loopEndPos),
        outPoint: Math.abs(xNormalized - outPos),
      };

      const nearestMarker = Object.keys(distances).reduce((a, b) =>
        distances[a] < distances[b] ? a : b
      );

      // Apply constraints and move paired markers if needed
      if (nearestMarker === "inPoint") {
        // Sample start can push loop start, but cannot move past end markers
        const newInPoint = Math.max(0, Math.min(newTime, sampleData.duration - 0.01));
        if (newInPoint >= sampleData.loopStart) {
          // Push loop start along
          sampleData.loopStart = Math.min(newInPoint + 0.01, sampleData.loopEnd - 0.01);
        }
        sampleData.inPoint = newInPoint;
      } else if (nearestMarker === "loopStart") {
        // Loop start stays between sample start and loop end
        sampleData.loopStart = Math.max(sampleData.inPoint, Math.min(newTime, sampleData.loopEnd - 0.01));
      } else if (nearestMarker === "loopEnd") {
        // Loop end cannot push loop start - stops at loop start
        sampleData.loopEnd = Math.max(sampleData.loopStart + 0.01, Math.min(newTime, sampleData.outPoint));
      } else if (nearestMarker === "outPoint") {
        // Sample end can push loop end backward but cannot go past loop start
        const newOutPoint = Math.max(sampleData.loopStart + 0.02, Math.min(newTime, sampleData.duration));
        if (newOutPoint <= sampleData.loopEnd) {
          // Push loop end backward
          sampleData.loopEnd = Math.max(newOutPoint - 0.01, sampleData.loopStart + 0.01);
        }
        sampleData.outPoint = newOutPoint;
      }

      // Redraw waveform and markers
      drawMultisampleWaveform(canvas, sampleData.audioBuffer);
      drawMultisampleMarkers(canvas, sampleData);
      return;
    }

    canvas.style.cursor = "grabbing";
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!draggingMarker) {
      // Change cursor when hovering over markers
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xNormalized = x / MULTISAMPLE_WAVEFORM_WIDTH;

      const sampleData = multisampleFiles[sampleIndex];
      if (!sampleData) return;

      const inPos = sampleData.inPoint / sampleData.duration;
      const loopStartPos = sampleData.loopStart / sampleData.duration;
      const loopEndPos = sampleData.loopEnd / sampleData.duration;
      const outPos = sampleData.outPoint / sampleData.duration;

      const tolerance = 0.08; // Increased tolerance
      
      // Check if we're near any marker
      const nearMarkers = [];
      if (Math.abs(xNormalized - inPos) < tolerance) nearMarkers.push("inPoint");
      if (Math.abs(xNormalized - loopStartPos) < tolerance) nearMarkers.push("loopStart");
      if (Math.abs(xNormalized - loopEndPos) < tolerance) nearMarkers.push("loopEnd");
      if (Math.abs(xNormalized - outPos) < tolerance) nearMarkers.push("outPoint");

      canvas.style.cursor = nearMarkers.length > 0 ? "ew-resize" : "pointer";
      return;
    }

    // Dragging a marker
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const xNormalized = x / rect.width;

    const sampleData = multisampleFiles[sampleIndex];
    if (sampleData) {
      const newTime = xNormalized * sampleData.duration;

      // Apply constraints based on marker type
      if (draggingMarker === "inPoint") {
        // Sample start can push loop start, but cannot move past loop start
        const newInPoint = Math.max(0, Math.min(newTime, sampleData.duration - 0.01));
        if (newInPoint >= sampleData.loopStart) {
          // Push loop start along
          sampleData.loopStart = Math.min(newInPoint + 0.01, sampleData.loopEnd - 0.01);
        }
        sampleData.inPoint = newInPoint;
      } else if (draggingMarker === "loopStart") {
        // Loop start stays between sample start and loop end
        sampleData.loopStart = Math.max(sampleData.inPoint, Math.min(newTime, sampleData.loopEnd - 0.01));
      } else if (draggingMarker === "loopEnd") {
        // Loop end cannot push loop start - stops at loop start
        sampleData.loopEnd = Math.max(sampleData.loopStart + 0.01, Math.min(newTime, sampleData.outPoint));
      } else if (draggingMarker === "outPoint") {
        // Sample end can push loop end backward but cannot go past loop start
        const newOutPoint = Math.max(sampleData.loopStart + 0.02, Math.min(newTime, sampleData.duration));
        if (newOutPoint <= sampleData.loopEnd) {
          // Push loop end backward
          sampleData.loopEnd = Math.max(newOutPoint - 0.01, sampleData.loopStart + 0.01);
        }
        sampleData.outPoint = newOutPoint;
      }

      // Redraw waveform and markers
      drawMultisampleWaveform(canvas, sampleData.audioBuffer);
      drawMultisampleMarkers(canvas, sampleData);
    }
  });

  canvas.addEventListener("mouseup", () => {
    draggingMarker = null;
    canvas.style.cursor = "pointer";
  });

  canvas.addEventListener("mouseleave", () => {
    draggingMarker = null;
    canvas.style.cursor = "pointer";
  });

  // Double-click to apply marker positions to all samples
  canvas.addEventListener("dblclick", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const xNormalized = x / MULTISAMPLE_WAVEFORM_WIDTH;

    const sampleData = multisampleFiles[sampleIndex];
    if (!sampleData) return;

    // Determine which marker was double-clicked
    const inPos = sampleData.inPoint / sampleData.duration;
    const loopStartPos = sampleData.loopStart / sampleData.duration;
    const loopEndPos = sampleData.loopEnd / sampleData.duration;
    const outPos = sampleData.outPoint / duration;

    const tolerance = 0.03;
    let targetMarker = null;

    if (Math.abs(xNormalized - inPos) < tolerance) {
      targetMarker = "inPoint";
    } else if (Math.abs(xNormalized - loopStartPos) < tolerance) {
      targetMarker = "loopStart";
    } else if (Math.abs(xNormalized - loopEndPos) < tolerance) {
      targetMarker = "loopEnd";
    } else if (Math.abs(xNormalized - outPos) < tolerance) {
      targetMarker = "outPoint";
    }

    if (targetMarker) {
      const markerRelativePosition =
        sampleData[targetMarker] / sampleData.duration;

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
  multisampleRowsContainer.innerHTML = "";

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
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);
  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = buffer.getChannelData(ch)[i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Generate multisample patch
async function generateMultisamplePatch() {
  // Check if JSZip is available
  if (typeof JSZip === "undefined") {
    alert("JSZip library not loaded. Please wait and try again.");
    return;
  }

  // Check if base template is available
  if (typeof baseMultisampleJson === "undefined") {
    alert("baseMultisampleJson is missing. Patch generation cannot continue.");
    return;
  }

  // Collect valid samples with MIDI notes assigned
  const validSamples = multisampleFiles.filter(
    (sample) => sample !== null && sample.midiNote >= 0
  );

  if (validSamples.length === 0) {
    alert(
      "No valid samples with MIDI notes assigned. Please assign MIDI notes to your samples."
    );
    return;
  }

  multisampleGenerateBtn.disabled = true;
  multisampleGenerateBtn.textContent = "Generating...";

  try {
    const presetName =
      document.getElementById("preset-name-multi")?.value || "Multisample";
    const sampleRateIdx =
      document.getElementById("sample-rate-multi")?.selectedIndex || 0;
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
        if (!isNaN(adv.velocitySensitivity))
          patchJson.engine["velocity.sensitivity"] = adv.velocitySensitivity;
        if (!isNaN(adv.volume)) patchJson.engine.volume = adv.volume;
        if (!isNaN(adv.width)) patchJson.engine.width = adv.width;
        if (!isNaN(adv.highpass)) patchJson.engine.highpass = adv.highpass;
        if (!isNaN(adv.portamentoAmount))
          patchJson.engine["portamento.amount"] = adv.portamentoAmount;
        if (!isNaN(adv.portamentoType))
          patchJson.engine["portamento.type"] = adv.portamentoType;
        if (!isNaN(adv.tuningRoot))
          patchJson.engine["tuning.root"] = adv.tuningRoot;
      }

      // Apply envelopes
      if (patchJson.envelope && adv.ampEnvelope) {
        if (!isNaN(adv.ampEnvelope.attack))
          patchJson.envelope.amp.attack = adv.ampEnvelope.attack;
        if (!isNaN(adv.ampEnvelope.decay))
          patchJson.envelope.amp.decay = adv.ampEnvelope.decay;
        if (!isNaN(adv.ampEnvelope.sustain))
          patchJson.envelope.amp.sustain = adv.ampEnvelope.sustain;
        if (!isNaN(adv.ampEnvelope.release))
          patchJson.envelope.amp.release = adv.ampEnvelope.release;
      }

      if (patchJson.envelope && adv.filterEnvelope) {
        if (!isNaN(adv.filterEnvelope.attack))
          patchJson.envelope.filter.attack = adv.filterEnvelope.attack;
        if (!isNaN(adv.filterEnvelope.decay))
          patchJson.envelope.filter.decay = adv.filterEnvelope.decay;
        if (!isNaN(adv.filterEnvelope.sustain))
          patchJson.envelope.filter.sustain = adv.filterEnvelope.sustain;
        if (!isNaN(adv.filterEnvelope.release))
          patchJson.envelope.filter.release = adv.filterEnvelope.release;
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
        tune: 0,
      };

      // Create WAV blob from AudioBuffer
      const wavBlob = bufferToWavBlob(sample.audioBuffer);

      if (targetSampleRate && sampleRate !== targetSampleRate) {
        // Resample if needed (this would require additional implementation)
        fileReadPromises.push(
          Promise.resolve(wavBlob).then((blob) => {
            zip.file(outputName, blob);
            patchJson.regions.push(region);
          })
        );
      } else {
        fileReadPromises.push(
          Promise.resolve(wavBlob).then((blob) => {
            zip.file(outputName, blob);
            patchJson.regions.push(region);
          })
        );
      }
    }

    await Promise.all(fileReadPromises);

    // Add patch.json to zip
    zip.file("patch.json", JSON.stringify(patchJson, null, 2));

    // Generate and download zip
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${presetName}.preset.zip`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 100);
  } catch (err) {
    alert(
      "Patch generation failed: " + (err && err.message ? err.message : err)
    );
  } finally {
    multisampleGenerateBtn.disabled = false;
    multisampleGenerateBtn.textContent = "generate patch";
  }
}

// Update multisample generate button state
function updateMultisampleGenerateButton() {
  if (!multisampleGenerateBtn) return;

  // Check if any sample with valid MIDI note is present
  const hasValidSample = multisampleFiles.some(
    (sample) => sample !== null && sample.midiNote >= 0
  );

  multisampleGenerateBtn.disabled = !hasValidSample;

  if (!hasValidSample) {
    multisampleGenerateBtn.title =
      "Load samples and assign MIDI notes to enable patch generation";
  } else {
    multisampleGenerateBtn.title = "";
  }
}

// == Multisample Tool UI Functions ==

// Add browse button logic for multisample loader
function initMultisampleBrowseButton() {
  var multiBrowseBtn = document.querySelector(
    'label[for="multisample-file-input"]'
  );
  var multiFileInput = document.getElementById("multisample-file-input");
  if (multiBrowseBtn && multiFileInput) {
    multiBrowseBtn.addEventListener("click", function () {
      multiFileInput.value = "";
    });
    multiFileInput.addEventListener("change", async function (e) {
      if (
        multiFileInput.files &&
        multiFileInput.files.length > 0 &&
        window.processMultisampleFiles
      ) {
        await processMultisampleFiles(Array.from(multiFileInput.files));
      }
    });
  }
}

// Add clear all button logic for multisample loader
function initMultisampleClearAllButton() {
  const clearAllBtn = document.getElementById("multisample-clear-all-btn");
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", function () {
      for (let i = 0; i < multisampleFiles.length; i++) {
        multisampleFiles[i] = null;
      }
      reloadMultisampleRows();
      updateMultisampleGenerateButton();
      updateMultiPatchSize();
    });
  }
}

// Initialize multisample tool UI on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // Ensure preset gain is set to 0 dB on load
  if (multisampleGainSlider && multisampleGainValue) {
    multisampleGainSlider.value = "0";
    multisampleGainValue.textContent = "0 dB";
    multisampleGain = 0;
  } else {
    multisampleGain = 0;
  }

  // Add click event listener to generate patch button
  if (multisampleGenerateBtn) {
    multisampleGenerateBtn.addEventListener("click", generateMultisamplePatch);
  }

  // Initialize all UI buttons and handlers
  initMultisampleBrowseButton();
  initMultisampleClearAllButton();
  setupMultisampleZoomModal();

  updateMultisampleGenerateButton();
  updateMultisampleDropLabel();
  initializeMultisampleAdvancedModal();
  updateMultiPatchSize();

  // Add event listener for sample rate changes
  const sampleRateSelect = document.getElementById("sample-rate-multi");
  if (sampleRateSelect) {
    sampleRateSelect.addEventListener("change", function () {
      updateMultiPatchSize();
    });
  }
});

let multisampleAdvancedModalInitialized = false;

function initializeMultisampleAdvancedModal() {
  // Reset to defaults on first open
  if (!multisampleAdvancedModalInitialized) {
    document.getElementById("multisample-preset-playmode").value = "poly";
    document.getElementById("multisample-preset-loop-enabled").checked = true;
    document.getElementById(
      "multisample-preset-velocity-sensitivity"
    ).value = 15;
    document.getElementById(
      "multisample-preset-velocity-sensitivity-number"
    ).value = 15;
    document.getElementById("multisample-preset-volume").value = 80;
    document.getElementById("multisample-preset-volume-number").value = 80;
    document.getElementById("multisample-preset-width").value = 0;
    document.getElementById("multisample-preset-width-number").value = 0;
    document.getElementById("multisample-preset-transpose").value = 0;
    document.getElementById("multisample-preset-transpose-number").value = 0;
    document.getElementById("multisample-preset-highpass").value = 0;
    document.getElementById("multisample-preset-highpass-number").value = 0;
    document.getElementById("multisample-preset-portamento-amount").value = 0;
    document.getElementById(
      "multisample-preset-portamento-amount-number"
    ).value = 0;
    document.getElementById("multisample-preset-tuning-root").value = 0;
    document.getElementById("multisample-amp-attack").value = 0;
    document.getElementById("multisample-amp-attack-number").value = 0;
    document.getElementById("multisample-amp-decay").value = 0;
    document.getElementById("multisample-amp-decay-number").value = 0;
    document.getElementById("multisample-amp-sustain").value = 100;
    document.getElementById("multisample-amp-sustain-number").value = 100;
    document.getElementById("multisample-amp-release").value = 0;
    document.getElementById("multisample-amp-release-number").value = 0;
    document.getElementById("multisample-filter-attack").value = 0;
    document.getElementById("multisample-filter-attack-number").value = 0;
    document.getElementById("multisample-filter-decay").value = 0;
    document.getElementById("multisample-filter-decay-number").value = 0;
    document.getElementById("multisample-filter-sustain").value = 100;
    document.getElementById("multisample-filter-sustain-number").value = 100;
    document.getElementById("multisample-filter-release").value = 0;
    document.getElementById("multisample-filter-release-number").value = 0;
    multisampleAdvancedModalInitialized = true;
  }

  // Sync sliders with number inputs
  const sliderPairs = [
    ["multisample-preset-transpose", "multisample-preset-transpose-number"],
    [
      "multisample-preset-velocity-sensitivity",
      "multisample-preset-velocity-sensitivity-number",
    ],
    ["multisample-preset-volume", "multisample-preset-volume-number"],
    ["multisample-preset-width", "multisample-preset-width-number"],
    ["multisample-preset-highpass", "multisample-preset-highpass-number"],
    [
      "multisample-preset-portamento-amount",
      "multisample-preset-portamento-amount-number",
    ],
    ["multisample-amp-attack", "multisample-amp-attack-number"],
    ["multisample-amp-decay", "multisample-amp-decay-number"],
    ["multisample-amp-sustain", "multisample-amp-sustain-number"],
    ["multisample-amp-release", "multisample-amp-release-number"],
    ["multisample-filter-attack", "multisample-filter-attack-number"],
    ["multisample-filter-decay", "multisample-filter-decay-number"],
    ["multisample-filter-sustain", "multisample-filter-sustain-number"],
    ["multisample-filter-release", "multisample-filter-release-number"],
  ];

  sliderPairs.forEach(([sliderId, numberId]) => {
    const slider = document.getElementById(sliderId);
    const number = document.getElementById(numberId);

    if (slider && number) {
      slider.addEventListener("input", () => {
        number.value = slider.value;
      });

      number.addEventListener("input", () => {
        slider.value = number.value;
      });
    }
  });

  // Save button handler
  const saveBtn = document.getElementById(
    "save-multisample-preset-advanced-settings"
  );
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      // Update advanced settings object - convert percentages to internal values
      multisampleAdvancedSettings.playmode =
        document.getElementById("multisample-preset-playmode")?.value || "poly";
      multisampleAdvancedSettings.loopEnabled =
        document.getElementById("multisample-preset-loop-enabled")?.checked ||
        false;
      multisampleAdvancedSettings.transpose = parseInt(
        document.getElementById("multisample-preset-transpose")?.value || 0
      );

      // Convert percentage values to internal 0-32767 format
      const velocityPercent = parseInt(
        document.getElementById("multisample-preset-velocity-sensitivity")
          ?.value || 15
      );
      const volumePercent = parseInt(
        document.getElementById("multisample-preset-volume")?.value || 80
      );
      const widthPercent = parseInt(
        document.getElementById("multisample-preset-width")?.value || 0
      );
      const highpassPercent = parseInt(
        document.getElementById("multisample-preset-highpass")?.value || 0
      );
      const portamentoAmountPercent = parseInt(
        document.getElementById("multisample-preset-portamento-amount")
          ?.value || 0
      );

      multisampleAdvancedSettings.velocitySensitivity =
        percentToInternal(velocityPercent);
      multisampleAdvancedSettings.volume = percentToInternal(volumePercent);
      multisampleAdvancedSettings.width = percentToInternal(widthPercent);
      multisampleAdvancedSettings.highpass = percentToInternal(highpassPercent);
      multisampleAdvancedSettings.portamentoAmount = percentToInternal(
        portamentoAmountPercent
      );

      multisampleAdvancedSettings.portamentoType = parseInt(
        document.getElementById("multisample-preset-portamento-type")?.value ||
          32767
      );
      multisampleAdvancedSettings.tuningRoot = parseInt(
        document.getElementById("multisample-preset-tuning-root")?.value || 0
      );

      // Amp envelope - convert percentages to internal values
      const ampAttackPercent = parseInt(
        document.getElementById("multisample-amp-attack")?.value || 0
      );
      const ampDecayPercent = parseInt(
        document.getElementById("multisample-amp-decay")?.value || 0
      );
      const ampSustainPercent = parseInt(
        document.getElementById("multisample-amp-sustain")?.value || 100
      );
      const ampReleasePercent = parseInt(
        document.getElementById("multisample-amp-release")?.value || 0
      );

      multisampleAdvancedSettings.ampEnvelope.attack =
        percentToInternal(ampAttackPercent);
      multisampleAdvancedSettings.ampEnvelope.decay =
        percentToInternal(ampDecayPercent);
      multisampleAdvancedSettings.ampEnvelope.sustain =
        percentToInternal(ampSustainPercent);
      multisampleAdvancedSettings.ampEnvelope.release =
        percentToInternal(ampReleasePercent);

      // Filter envelope - convert percentages to internal values
      const filterAttackPercent = parseInt(
        document.getElementById("multisample-filter-attack")?.value || 0
      );
      const filterDecayPercent = parseInt(
        document.getElementById("multisample-filter-decay")?.value || 0
      );
      const filterSustainPercent = parseInt(
        document.getElementById("multisample-filter-sustain")?.value || 100
      );
      const filterReleasePercent = parseInt(
        document.getElementById("multisample-filter-release")?.value || 0
      );

      multisampleAdvancedSettings.filterEnvelope.attack =
        percentToInternal(filterAttackPercent);
      multisampleAdvancedSettings.filterEnvelope.decay =
        percentToInternal(filterDecayPercent);
      multisampleAdvancedSettings.filterEnvelope.sustain =
        percentToInternal(filterSustainPercent);
      multisampleAdvancedSettings.filterEnvelope.release =
        percentToInternal(filterReleasePercent);

      // Close modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("multisample-preset-advanced-modal")
      );
      if (modal) {
        modal.hide();
      }
    });
  }
}

// === Audio Recording Functionality ===
let audioRecording = {
  mediaRecorder: null,
  audioChunks: [],
  recordedBlob: null,
  recordedBuffer: null,
  startTime: null,
  timerInterval: null,
  stream: null
};

// Initialize recording functionality
function initializeRecording() {
  const recordBtn = document.getElementById('multisample-record-btn');
  if (recordBtn) {
    recordBtn.addEventListener('click', openRecordingModal);
  }

  // Set up recording modal event listeners
  setupRecordingModalEvents();
}

function openRecordingModal() {
  const modal = new bootstrap.Modal(document.getElementById('audio-recording-modal'));
  resetRecordingModal();
  modal.show();
}

function resetRecordingModal() {
  // Reset all UI elements to initial state
  document.getElementById('recording-status-text').textContent = 'ready to record';
  document.getElementById('recording-timer').textContent = '00:00';
  document.getElementById('recording-indicator').style.display = 'none';
  document.getElementById('start-recording-btn').style.display = 'inline-block';
  document.getElementById('stop-recording-btn').style.display = 'none';
  document.getElementById('playback-controls').style.display = 'none';
  document.getElementById('sample-naming').style.display = 'none';
  document.getElementById('save-recording-btn').style.display = 'none';
  document.getElementById('recording-error').style.display = 'none';

  // Clear previous recording data
  audioRecording.audioChunks = [];
  audioRecording.recordedBlob = null;
  audioRecording.recordedBuffer = null;
  if (audioRecording.timerInterval) {
    clearInterval(audioRecording.timerInterval);
    audioRecording.timerInterval = null;
  }
}

function setupRecordingModalEvents() {
  // Start recording button
  document.getElementById('start-recording-btn').addEventListener('click', startRecording);
  
  // Stop recording button
  document.getElementById('stop-recording-btn').addEventListener('click', stopRecording);
  
  // Play recording button
  document.getElementById('play-recording-btn').addEventListener('click', playRecording);
  
  // Retake button
  document.getElementById('retake-recording-btn').addEventListener('click', retakeRecording);
  
  // Save recording button
  document.getElementById('save-recording-btn').addEventListener('click', saveRecording);
}

async function startRecording() {
  try {
    // Request microphone access
    audioRecording.stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: 44100,
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      } 
    });

    // Set up MediaRecorder
    audioRecording.mediaRecorder = new MediaRecorder(audioRecording.stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    audioRecording.audioChunks = [];
    audioRecording.startTime = Date.now();

    audioRecording.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioRecording.audioChunks.push(event.data);
      }
    };

    audioRecording.mediaRecorder.onstop = () => {
      audioRecording.recordedBlob = new Blob(audioRecording.audioChunks, { type: 'audio/webm' });
      processRecordedAudio();
    };

    // Start recording
    audioRecording.mediaRecorder.start(100); // Collect data every 100ms

    // Update UI
    document.getElementById('recording-status-text').textContent = 'recording...';
    document.getElementById('recording-indicator').style.display = 'inline-block';
    document.getElementById('start-recording-btn').style.display = 'none';
    document.getElementById('stop-recording-btn').style.display = 'inline-block';
    document.getElementById('recording-error').style.display = 'none';

    // Start timer
    startRecordingTimer();

    // Auto-stop at 20 seconds
    setTimeout(() => {
      if (audioRecording.mediaRecorder && audioRecording.mediaRecorder.state === 'recording') {
        stopRecording();
      }
    }, 20000);

  } catch (error) {
    showRecordingError('Microphone access denied or not available. Please check your browser permissions.');
    console.error('Error starting recording:', error);
  }
}

function stopRecording() {
  if (audioRecording.mediaRecorder && audioRecording.mediaRecorder.state === 'recording') {
    audioRecording.mediaRecorder.stop();
  }

  // Stop timer
  if (audioRecording.timerInterval) {
    clearInterval(audioRecording.timerInterval);
    audioRecording.timerInterval = null;
  }

  // Stop microphone stream
  if (audioRecording.stream) {
    audioRecording.stream.getTracks().forEach(track => track.stop());
    audioRecording.stream = null;
  }

  // Update UI
  document.getElementById('recording-status-text').textContent = 'Processing...';
  document.getElementById('recording-indicator').style.display = 'none';
  document.getElementById('stop-recording-btn').style.display = 'none';
}

function startRecordingTimer() {
  audioRecording.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - audioRecording.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('recording-timer').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, 100);
}

async function processRecordedAudio() {
  try {
    // Convert blob to AudioBuffer
    const arrayBuffer = await audioRecording.recordedBlob.arrayBuffer();
    const audioContext = getMultisampleAudioContext();
    audioRecording.recordedBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Draw waveform
    drawRecordingWaveform();

    // Generate filename with timestamp
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
    const filename = `mic-sample-${timestamp}`;
    document.getElementById('recorded-sample-name').value = filename;

    // Show playback controls and naming
    document.getElementById('recording-status-text').textContent = 'recording complete';
    document.getElementById('playback-controls').style.display = 'block';
    document.getElementById('sample-naming').style.display = 'block';
    document.getElementById('save-recording-btn').style.display = 'inline-block';

  } catch (error) {
    showRecordingError('Error processing recorded audio. Please try again.');
    console.error('Error processing audio:', error);
  }
}

function drawRecordingWaveform() {
  const canvas = document.getElementById('recording-waveform');
  const ctx = canvas.getContext('2d');
  const buffer = audioRecording.recordedBuffer;
  
  if (!buffer) return;

  const width = canvas.width;
  const height = canvas.height;
  const data = buffer.getChannelData(0);
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ececec';
  ctx.fillRect(0, 0, width, height);
  
  // Draw waveform
  ctx.fillStyle = '#333';
  const step = Math.ceil(data.length / width);
  const amp = height / 2;
  
  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;
    
    for (let j = 0; j < step; j++) {
      const datum = data[i * step + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    
    ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
  }
  
  // Draw center line
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
}

function playRecording() {
  if (!audioRecording.recordedBuffer) return;

  const audioContext = getMultisampleAudioContext();
  const source = audioContext.createBufferSource();
  source.buffer = audioRecording.recordedBuffer;
  source.connect(audioContext.destination);
  source.start(0);
}

function retakeRecording() {
  resetRecordingModal();
}

function saveRecording() {
  if (!audioRecording.recordedBuffer) return;

  const filename = document.getElementById('recorded-sample-name').value || 'recorded-sample';
  
  // Convert AudioBuffer to WAV File
  const wavFile = audioBufferToWavFile(audioRecording.recordedBuffer, filename + '.wav');
  
  // Add to multisample files
  addRecordedSampleToMultisample(wavFile, audioRecording.recordedBuffer);
  
  // Close modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('audio-recording-modal'));
  if (modal) {
    modal.hide();
  }
}

function addRecordedSampleToMultisample(file, audioBuffer) {
  // Find first empty slot
  const emptyIndex = multisampleFiles.findIndex(sample => sample === null);
  if (emptyIndex === -1) {
    alert('Maximum number of samples reached (24). Please remove a sample first.');
    return;
  }

  // Extract MIDI note from filename
  const midiNote = extractMidiNoteFromFilename(file.name);
  const duration = audioBuffer.duration || (audioBuffer.length / audioBuffer.sampleRate);

  // Create sample data object with proper initialization
  const sampleData = {
    fileName: file.name,
    audioBuffer: audioBuffer,
    file: file,
    midiNote: midiNote, // Will be -1 if not detected, user can set it
    duration: duration,
    inPoint: 0,
    outPoint: duration,
    loopStart: duration * 0.15, // 15% from start
    loopEnd: duration * 0.85,   // 15% from end (85% of total duration)
    hasLoopData: false,
    isLoading: false
  };

  // Add to multisample files
  multisampleFiles[emptyIndex] = sampleData;
  
  // Reload UI
  reloadMultisampleRows();
  updateMultisampleGenerateButton();
  updateMultiPatchSize();
}

function audioBufferToWavFile(audioBuffer, filename) {
  // Convert AudioBuffer to WAV format
  const length = audioBuffer.length;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataLength = length * blockAlign;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Convert audio data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  return new File([blob], filename, { type: 'audio/wav' });
}

function getMultisampleAudioContext() {
  // Reuse the existing audio context or create a new one
  if (typeof getAudioContext === 'function') {
    return getAudioContext();
  }
  
  // Fallback if getAudioContext is not available
  if (!window.multisampleAudioContext) {
    window.multisampleAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window.multisampleAudioContext;
}

function showRecordingError(message) {
  const errorDiv = document.getElementById('recording-error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

// Initialize recording when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  initializeRecording();
});

// === Multisample Zoom Modal Functionality ===
function openMultisampleZoomModal(sampleIndex) {
  const sampleData = multisampleFiles[sampleIndex];
  if (!sampleData || !sampleData.audioBuffer) return;

  const modal = new bootstrap.Modal(document.getElementById('multisample-zoom-modal'));
  const modalElement = document.getElementById('multisample-zoom-modal');
  
  // Store sample index on modal for reference
  modalElement.dataset.sampleIndex = sampleIndex;
  
  // Set up modal title with sample name
  document.getElementById('multisample-zoom-modal-label').textContent = 
    `edit markers - ${sampleData.fileName}`;
  
  modal.show();
}

function setupMultisampleZoomModal() {
  const modalElement = document.getElementById('multisample-zoom-modal');
  
  modalElement.addEventListener('shown.bs.modal', () => {
    const sampleIndex = parseInt(modalElement.dataset.sampleIndex);
    const sampleData = multisampleFiles[sampleIndex];
    if (!sampleData || !sampleData.audioBuffer) return;

    const canvas = document.getElementById('multisample-zoom-canvas');
    const buffer = sampleData.audioBuffer;
    
    // Set up canvas dimensions
    const parentWidth = canvas.parentElement.offsetWidth || 1100;
    canvas.width = parentWidth;
    canvas.height = 200;
    
    const ctx = canvas.getContext('2d');
    const data = buffer.getChannelData(0);
    const width = canvas.width;
    const height = canvas.height;

    // Remove duplicate let declarations for marker frames
    // Declare these once at the top of the zoom modal handler scope:
    let inFrame, loopStartFrame, loopEndFrame, outFrame;

    // Initialize inputs with current marker values
    const inInput = document.getElementById('multisample-zoom-in-point');
    const loopStartInput = document.getElementById('multisample-zoom-loop-start');
    const loopEndInput = document.getElementById('multisample-zoom-loop-end');
    const outInput = document.getElementById('multisample-zoom-out-point');

    inFrame = Math.floor((sampleData.inPoint / sampleData.duration) * buffer.length);
    loopStartFrame = Math.floor((sampleData.loopStart / sampleData.duration) * buffer.length);
    loopEndFrame = Math.floor((sampleData.loopEnd / sampleData.duration) * buffer.length);
    outFrame = Math.floor((sampleData.outPoint / sampleData.duration) * buffer.length);

    inInput.value = inFrame;
    loopStartInput.value = loopStartFrame;
    loopEndInput.value = loopEndFrame;
    outInput.value = outFrame;

    function drawMultisampleZoomWaveform() {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Background
      ctx.fillStyle = '#ececec';
      ctx.fillRect(0, 0, width, height);
      
      // Waveform
      ctx.fillStyle = '#333';
      const step = Math.ceil(data.length / width);
      const amp = height / 2;
      
      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        
        for (let j = 0; j < step; j++) {
          const datum = data[i * step + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
        
        ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
      }
      
      // Draw center line
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }

    function drawMultisampleZoomMarkers() {
      const inPos = (inFrame / data.length) * width;
      const loopStartPos = (loopStartFrame / data.length) * width;
      const loopEndPos = (loopEndFrame / data.length) * width;
      const outPos = (outFrame / data.length) * width;

      // In/Out markers (dark grey) - Make them more prominent
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 4; // Increased line width
      ctx.beginPath();
      ctx.moveTo(inPos, 0);
      ctx.lineTo(inPos, height);
      ctx.moveTo(outPos, 0);
      ctx.lineTo(outPos, height);
      ctx.stroke();

      // In/Out marker handles - triangles pointing up from bottom
      ctx.fillStyle = '#222';
      const sampleTriangleSize = 15; // Match loop triangle size (increased from 12)
      const bottomY = height; // No gap at bottom
      
      // Sample start triangle (pointing up)
      ctx.beginPath();
      ctx.moveTo(inPos - sampleTriangleSize / 2, bottomY);
      ctx.lineTo(inPos + sampleTriangleSize / 2, bottomY);
      ctx.lineTo(inPos, bottomY - sampleTriangleSize);
      ctx.closePath();
      ctx.fill();
      
      // Sample end triangle (pointing up)
      ctx.beginPath();
      ctx.moveTo(outPos - sampleTriangleSize / 2, bottomY);
      ctx.lineTo(outPos + sampleTriangleSize / 2, bottomY);
      ctx.lineTo(outPos, bottomY - sampleTriangleSize);
      ctx.closePath();
      ctx.fill();

      // Loop markers (medium grey) - Make them more visible
      const triangleSize = 15; // Increased from 12 for better visibility
      ctx.fillStyle = '#666';
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 3; // Thicker line

      // Loop start - draw vertical line first (centered)
      ctx.beginPath();
      ctx.moveTo(loopStartPos, 0);
      ctx.lineTo(loopStartPos, height);
      ctx.stroke();
      
      // Fill the triangle part
      ctx.beginPath();
      ctx.moveTo(loopStartPos - triangleSize / 2, 0);
      ctx.lineTo(loopStartPos + triangleSize / 2, 0);
      ctx.lineTo(loopStartPos, triangleSize);
      ctx.closePath();
      ctx.fill();

      // Loop end - draw vertical line first (centered)
      ctx.beginPath();
      ctx.moveTo(loopEndPos, 0);
      ctx.lineTo(loopEndPos, height);
      ctx.stroke();
      
      // Fill the triangle part
      ctx.beginPath();
      ctx.moveTo(loopEndPos - triangleSize / 2, 0);
      ctx.lineTo(loopEndPos + triangleSize / 2, 0);
      ctx.lineTo(loopEndPos, triangleSize);
      ctx.closePath();
      ctx.fill();
    }

    function findNearestZeroCrossing(position, searchDirection, maxSearchDistance = 1000) {
      const searchStart = Math.max(0, Math.min(position, data.length - 1));
      let bestPosition = searchStart;
      let minAbsValue = Math.abs(data[searchStart]);

      const searchLimit = Math.min(maxSearchDistance, 
        searchDirection > 0 ? data.length - searchStart : searchStart);

      for (let i = 1; i <= searchLimit; i++) {
        const checkPos = searchStart + (i * searchDirection);
        if (checkPos < 0 || checkPos >= data.length) break;

        const absValue = Math.abs(data[checkPos]);
        if (absValue < minAbsValue) {
          minAbsValue = absValue;
          bestPosition = checkPos;
        }

        if (absValue < 0.01) break;
      }

      return bestPosition;
    }

    function updateSampleValueDisplays() {
      const inValueElement = document.getElementById('multisample-zoom-in-value');
      const loopStartValueElement = document.getElementById('multisample-zoom-loop-start-value');
      const loopEndValueElement = document.getElementById('multisample-zoom-loop-end-value');
      const outValueElement = document.getElementById('multisample-zoom-out-value');

      function updateValueDisplay(element, frame) {
        if (element && frame >= 0 && frame < data.length) {
          const value = data[frame];
          element.textContent = value.toFixed(3);
          
          if (Math.abs(value) < 0.01) {
            element.classList.add('bg-success');
            element.classList.remove('bg-secondary');
          } else {
            element.classList.remove('bg-success');
            element.classList.add('bg-secondary');
          }
        }
      }

      updateValueDisplay(inValueElement, inFrame);
      updateValueDisplay(loopStartValueElement, loopStartFrame);
      updateValueDisplay(loopEndValueElement, loopEndFrame);
      updateValueDisplay(outValueElement, outFrame);
    }

    function updateMultisampleZoomWaveformAndMarkers() {
      drawMultisampleZoomWaveform();
      drawMultisampleZoomMarkers();
      updateSampleValueDisplays();
    }

    updateMultisampleZoomWaveformAndMarkers();

    // Input event handlers
    function updateFromInputs() {
      inFrame = Math.max(0, Math.min(parseInt(inInput.value) || 0, buffer.length - 1));
      loopStartFrame = Math.max(inFrame, Math.min(parseInt(loopStartInput.value) || 0, buffer.length - 1));
      loopEndFrame = Math.max(loopStartFrame + 1, Math.min(parseInt(loopEndInput.value) || buffer.length, buffer.length));
      outFrame = Math.max(loopEndFrame, Math.min(parseInt(outInput.value) || buffer.length, buffer.length));

      // Update inputs with clamped values
      inInput.value = inFrame;
      loopStartInput.value = loopStartFrame;
      loopEndInput.value = loopEndFrame;
      outInput.value = outFrame;

      updateMultisampleZoomWaveformAndMarkers();
    }

    inInput.addEventListener('input', updateFromInputs);
    loopStartInput.addEventListener('input', updateFromInputs);
    loopEndInput.addEventListener('input', updateFromInputs);
    outInput.addEventListener('input', updateFromInputs);

    // Mouse interaction
    let dragging = null;

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inPos = (inFrame / data.length) * width;
      const loopStartPos = (loopStartFrame / data.length) * width;
      const loopEndPos = (loopEndFrame / data.length) * width;
      const outPos = (outFrame / data.length) * width;
      
      // Define vertical zones
      const topZone = height * 0.2;     // Top fifth - loop markers only
      const bottomZone = height * 0.8;  // Bottom fifth - sample markers only
      // Middle zone (between topZone and bottomZone) - all markers (3/5 of canvas)
      
      const tolerance = 40; // Larger tolerance since we have zone filtering
      
      // Determine which markers are available based on vertical zone
      let availableMarkers = [];
      
      if (y <= topZone) {
        // Top zone - only loop markers
        availableMarkers = ['loopStart', 'loopEnd'];
      } else if (y >= bottomZone) {
        // Bottom zone - only sample markers
        availableMarkers = ['in', 'out'];
      } else {
        // Middle zone - all markers
        availableMarkers = ['in', 'loopStart', 'loopEnd', 'out'];
      }
      
      // Check for marker grabs in the available markers
      const markerPositions = {
        in: inPos,
        loopStart: loopStartPos,
        loopEnd: loopEndPos,
        out: outPos
      };
      
      let grabbed = false;
      
      // Check each available marker for proximity
      for (const markerType of availableMarkers) {
        if (Math.abs(x - markerPositions[markerType]) < tolerance) {
          dragging = markerType;
          canvas.style.cursor = "grabbing";
          grabbed = true;
          break;
        }
      }
      
      if (!grabbed) {
        // Click to move nearest available marker
        const distances = {};
        availableMarkers.forEach(markerType => {
          distances[markerType] = Math.abs(x - markerPositions[markerType]);
        });
        
        const closest = Object.keys(distances).reduce((a, b) => distances[a] < distances[b] ? a : b);
        dragging = null;
        canvas.style.cursor = "pointer";
        const snapToZero = document.getElementById('multisample-zero-crossing-snap').checked;
        let targetFrame = Math.round((x / width) * data.length);
        if (snapToZero) {
          targetFrame = findNearestZeroCrossing(targetFrame, targetFrame > data.length / 2 ? -1 : 1, 500);
        }
        switch (closest) {
          case 'in':
            // If sample start moves past loop start, push loop start along
            inFrame = Math.max(0, Math.min(targetFrame, data.length - 1));
            if (inFrame >= loopStartFrame) {
              loopStartFrame = Math.min(inFrame + 1, loopEndFrame - 1);
              loopStartInput.value = loopStartFrame;
            }
            inInput.value = inFrame;
            break;
          case 'loopStart':
            loopStartFrame = Math.max(inFrame, Math.min(targetFrame, loopEndFrame - 1));
            loopStartInput.value = loopStartFrame;
            break;
          case 'loopEnd':
            // Loop end cannot move past sample end
            loopEndFrame = Math.max(loopStartFrame + 1, Math.min(targetFrame, outFrame));
            loopEndInput.value = loopEndFrame;
            break;
          case 'out':
            // Sample end can push loop end backward (stops at it, moves it if needed)
            outFrame = Math.max(loopStartFrame + 2, Math.min(targetFrame, data.length));
            if (outFrame <= loopEndFrame) {
              loopEndFrame = Math.max(outFrame - 1, loopStartFrame + 1);
              loopEndInput.value = loopEndFrame;
            }
            outInput.value = outFrame;
            break;
        }
        updateMultisampleZoomWaveformAndMarkers();
      }
    });
    canvas.addEventListener('mousemove', (e) => {
      if (dragging) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const frame = Math.round((x / width) * data.length);
        const snapToZero = document.getElementById('multisample-zero-crossing-snap').checked;
        let targetFrame = frame;
        if (snapToZero) {
          targetFrame = findNearestZeroCrossing(frame, frame > data.length / 2 ? -1 : 1, 500);
        }
        switch (dragging) {
          case 'in':
            // Sample start can push loop start forward but cannot go past loop end
            inFrame = Math.max(0, Math.min(targetFrame, loopEndFrame - 2, data.length - 1));
            if (inFrame >= loopStartFrame) {
              loopStartFrame = Math.min(inFrame + 1, loopEndFrame - 1);
              loopStartInput.value = loopStartFrame;
            }
            inInput.value = inFrame;
            break;
          case 'loopStart':
            // Loop start can move between sample start and loop end, can push sample start back
            if (targetFrame < inFrame) {
              // Moving loop start before sample start - push sample start back
              inFrame = Math.max(0, targetFrame);
              inInput.value = inFrame;
              loopStartFrame = Math.max(inFrame, Math.min(targetFrame, loopEndFrame - 1));
            } else {
              // Normal constraint - stay between sample start and loop end
              loopStartFrame = Math.max(inFrame, Math.min(targetFrame, loopEndFrame - 1));
            }
            loopStartInput.value = loopStartFrame;
            break;
          case 'loopEnd':
            // Loop end CANNOT move loop start - it stops at loop start position
            loopEndFrame = Math.max(loopStartFrame + 1, Math.min(targetFrame, outFrame));
            loopEndInput.value = loopEndFrame;
            break;
          case 'out':
            // Sample end can push loop end backward but cannot go past loop start
            outFrame = Math.max(loopStartFrame + 2, Math.min(targetFrame, data.length));
            if (outFrame <= loopEndFrame) {
              loopEndFrame = Math.max(outFrame - 1, loopStartFrame + 1);
              loopEndInput.value = loopEndFrame;
            }
            outInput.value = outFrame;
            break;
        }
        updateMultisampleZoomWaveformAndMarkers();
      } else {
        // Change cursor when hovering over markers
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;

        const inPos = (inFrame / data.length) * width;
        const loopStartPos = (loopStartFrame / data.length) * width;
        const loopEndPos = (loopEndFrame / data.length) * width;
        const outPos = (outFrame / data.length) * width;

        const tolerance = 25; // Increased tolerance for better marker detection
        const isNearMarker = 
          Math.abs(x - inPos) < tolerance ||
          Math.abs(x - loopStartPos) < tolerance ||
          Math.abs(x - loopEndPos) < tolerance ||
          Math.abs(x - outPos) < tolerance;

        canvas.style.cursor = isNearMarker ? "ew-resize" : "pointer";
      }
    });

    canvas.addEventListener('mouseup', () => {
      dragging = null;
      canvas.style.cursor = "pointer";
    });

    canvas.addEventListener('mouseleave', () => {
      dragging = null;
      canvas.style.cursor = "pointer";
    });

    // Play button
    document.getElementById('multisample-zoom-play-button').onclick = () => {
      const audioContext = getMultisampleAudioContext();
      const source = audioContext.createBufferSource();
      
      // Create a buffer for the selected region
      const selectionLength = outFrame - inFrame;
      const selectionBuffer = audioContext.createBuffer(
        buffer.numberOfChannels,
        selectionLength,
        buffer.sampleRate
      );
      
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const srcData = buffer.getChannelData(ch);
        const dstData = selectionBuffer.getChannelData(ch);
        for (let i = 0; i < selectionLength; i++) {
          dstData[i] = srcData[inFrame + i];
        }
      }
      
      source.buffer = selectionBuffer;
      source.connect(audioContext.destination);
      source.start(0);
    };

    // Save button
    document.getElementById('multisample-zoom-save-button').onclick = () => {
      // Update the sample data with new marker positions
      sampleData.inPoint = (inFrame / buffer.length) * sampleData.duration;
      sampleData.loopStart = (loopStartFrame / buffer.length) * sampleData.duration;
      sampleData.loopEnd = (loopEndFrame / buffer.length) * sampleData.duration;
      sampleData.outPoint = (outFrame / buffer.length) * sampleData.duration;

      // Close modal (fix: get modal instance from element)
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) modalInstance.hide();
      
      // Refresh the main multisample view
      reloadMultisampleRows();
    };

    // Keyboard shortcuts
    const keydownHandler = (e) => {
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        document.getElementById('multisample-zoom-play-button').click();
      }
    };

    document.addEventListener('keydown', keydownHandler);
    
    // Clean up event listener when modal is hidden
    modalElement.addEventListener('hidden.bs.modal', () => {
      document.removeEventListener('keydown', keydownHandler);
    }, { once: true });
  });
}

// === Initialization on DOM Ready ===
document.addEventListener('DOMContentLoaded', () => {
  // Initialize multisample advanced modal
  setupMultisampleZoomModal();
});
