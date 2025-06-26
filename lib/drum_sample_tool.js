// == Importing necessary libraries ==
// Import JSZip for zip file generation
if (typeof JSZip === "undefined") {
  const script = document.createElement("script");
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
  document.head.appendChild(script);
}

// == Global Styles ==
// Add global slider styles to handle all browser-specific styling
// (Moved to style.css)
document.addEventListener("DOMContentLoaded", function () {
  // Example: update gain value display
  const gainSlider = document.getElementById("gain-slider");
  const gainValue = document.getElementById("gain-value");
  if (gainSlider && gainValue) {
    gainSlider.addEventListener("input", () => {
      gainValue.textContent = gainSlider.value;
    });
  }
});

// Drum key mapping for two octaves
const drumKeyMap = [
  // Lower octave (octave 0)
  {
    // top row (offset like a real keyboard)
    W: { label: "KD2", idx: 2 },
    E: { label: "SD2", idx: 4 },
    R: { label: "CLP", idx: 6 },
    Y: { label: "CH", idx: 9 },
    U: { label: "OH", idx: 11 },
    // bottom row
    A: { label: "KD1", idx: 1 },
    S: { label: "SD1", idx: 3 },
    D: { label: "RIM", idx: 5 },
    F: { label: "TB", idx: 7 },
    G: { label: "SH", idx: 8 },
    H: { label: "CL", idx: 10 },
    J: { label: "CAB", idx: 12 },
  },
  // Upper octave (octave 1)
  {
    // top row (offset like a real keyboard)
    W: { label: "RC", idx: 13 },
    E: { label: "CC", idx: 14 },
    R: { label: "COW", idx: 16 },
    Y: { label: "LC", idx: 19 },
    U: { label: "HC", idx: 20 },
    // bottom row
    A: { label: "LT", idx: 15 },
    S: { label: "MT", idx: 17 },
    D: { label: "HT", idx: 18 },
    F: { label: "TRI", idx: 21 },
    G: { label: "LT", idx: 22 },
    H: { label: "WS", idx: 23 },
    J: { label: "GUI", idx: 24 },
  },
];
let currentOctave = 0;

function updateKeyboardLabels() {
  const map = drumKeyMap[currentOctave];
  Object.entries(map).forEach(([key, { label }]) => {
    const wrapper = document.querySelector(".key-" + key.toLowerCase());
    if (wrapper) {
      let labelDiv = wrapper.querySelector(".small.text-muted");
      if (!labelDiv) {
        labelDiv = document.createElement("div");
        labelDiv.className = "small text-muted";
        wrapper.appendChild(labelDiv);
      }
      labelDiv.textContent = label;
    }
  });
}

// Initial label update
updateKeyboardLabels();

// Octave controls
function setOctave(oct) {
  currentOctave = oct;
  updateKeyboardLabels();
}
document.querySelectorAll(".octave-controls .kbd").forEach((el) => {
  el.addEventListener("click", () => {
    if (el.textContent.trim().toUpperCase() === "Z") setOctave(0);
    if (el.textContent.trim().toUpperCase() === "X") setOctave(1);
  });
});

// === Drum Sample Loader & Playback Logic ===
const NUM_DRUMS = 24;
const drumSamples = new Array(NUM_DRUMS + 1).fill(null); // 1-based indexing
const drumSampleNames = new Array(NUM_DRUMS + 1).fill("");
let drumSamplePreviews = {}; // Store preview data for size calculations
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// Function to re-encode audio buffer at specified sample rate
function reencodeAudioBuffer(audioBuffer, targetSampleRate) {
  if (targetSampleRate === 0 || audioBuffer.sampleRate === targetSampleRate) {
    return audioBuffer; // No change needed
  }

  const ratio = targetSampleRate / audioBuffer.sampleRate;
  const newLength = Math.round(audioBuffer.length * ratio);
  const newBuffer = new AudioBuffer({
    numberOfChannels: audioBuffer.numberOfChannels,
    length: newLength,
    sampleRate: targetSampleRate,
  });

  // Simple linear interpolation resampling
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const oldData = audioBuffer.getChannelData(channel);
    const newData = newBuffer.getChannelData(channel);

    for (let i = 0; i < newLength; i++) {
      const oldIndex = i / ratio;
      const index = Math.floor(oldIndex);
      const fraction = oldIndex - index;

      if (index >= oldData.length - 1) {
        newData[i] = oldData[oldData.length - 1];
      } else {
        newData[i] =
          oldData[index] * (1 - fraction) + oldData[index + 1] * fraction;
      }
    }
  }

  return newBuffer;
}

// Function to get target sample rate from dropdown
function getDrumTargetSampleRate() {
  const sampleRateSelect = document.getElementById("sample-rate-drum");
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

// Function to get target bit depth from dropdown
function getDrumTargetBitDepth() {
  const bitDepthSelect = document.getElementById("bit-depth-drum");
  if (!bitDepthSelect) return "keep";
  return bitDepthSelect.value;
}

function loadSample(idx, file) {
  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const metadata = await readWavMetadata(file);
      const buffer = metadata.audioBuffer;
      
      // Store enhanced sample data with metadata
      drumSamples[idx] = {
        audioBuffer: buffer,
        filename: file.name,
        originalBitDepth: metadata.bitDepth,
        originalSampleRate: metadata.sampleRate,
        originalChannels: metadata.channels,
        fileSize: file.size,
        duration: metadata.duration,
        convertedSizes: {} // Cache for converted file sizes
      };
      
      drumSampleNames[idx] = file.name;
      updateSampleUI(idx);
      
      const playBtn = document.getElementById(`play-${idx}`);
      const clearBtn = document.getElementById(`clear-${idx}`);
      const advBtn = document.getElementById(`adv-${idx}`);
      if (playBtn) playBtn.disabled = false;
      if (clearBtn) clearBtn.disabled = false;
      if (advBtn) advBtn.disabled = false;
      // Update generate patch button state
      updateGeneratePatchBtnState();
      // Update patch size indicator
      updateDrumPatchSize().catch(err => console.warn('Patch size update failed:', err));
      updateDrumPatchSummary();
    } catch (err) {
      console.error('Failed to load sample:', err);
      alert('Failed to load audio file. Make sure it is a valid WAV file.');
    }
  };
  reader.readAsArrayBuffer(file);
}

// Enhanced sample UI display
function updateSampleUI(sampleIndex) {
  const sample = drumSamples[sampleIndex];
  if (!sample) return;
  
  const sampleNameDiv = document.getElementById(`sample-name-${sampleIndex}`);
  const bitDepthSelect = document.getElementById('bit-depth-drum');
  const sampleRateSelect = document.getElementById('sample-rate-drum');
  const channelsSelect = document.getElementById('channels-drum');
  
  // Find the highest quality among all loaded samples
  let maxBitDepth = 0;
  let maxSampleRate = 0;
  let hasAnyStereo = false;
  let allSameBitDepth = true;
  let allSameSampleRate = true;
  let firstBitDepth = null;
  let firstSampleRate = null;
  
  // Check all loaded samples
  for (const s of drumSamples) {
    if (s) {
      maxBitDepth = Math.max(maxBitDepth, s.originalBitDepth);
      maxSampleRate = Math.max(maxSampleRate, s.originalSampleRate);
      if (s.originalChannels > 1) hasAnyStereo = true;
      
      // Check if all samples have the same bit depth
      if (firstBitDepth === null) {
        firstBitDepth = s.originalBitDepth;
      } else if (s.originalBitDepth !== firstBitDepth) {
        allSameBitDepth = false;
      }
      
      // Check if all samples have the same sample rate
      if (firstSampleRate === null) {
        firstSampleRate = s.originalSampleRate;
      } else if (s.originalSampleRate !== firstSampleRate) {
        allSameSampleRate = false;
      }
    }
  }
  
  // Update dropdown options based on highest quality found
  if (bitDepthSelect) {
    // Enable all options first
    Array.from(bitDepthSelect.options).forEach(option => {
      option.disabled = false;
    });
    
    // Disable 24-bit if ALL samples are 16-bit or lower
    if (maxBitDepth <= 16) {
      Array.from(bitDepthSelect.options).forEach(option => {
        if (option.value === "24") {
          option.disabled = true;
        }
      });
      // If currently selected option is disabled, switch to "keep original"
      if (bitDepthSelect.value === "24") {
        bitDepthSelect.value = "keep";
      }
    }
    
    // If all samples are the same bit depth, disable that conversion option
    if (allSameBitDepth && firstBitDepth) {
      Array.from(bitDepthSelect.options).forEach(option => {
        if (option.value === firstBitDepth.toString()) {
          option.disabled = true;
        }
      });
      // If currently selected option is disabled, switch to "keep original"
      if (bitDepthSelect.value === firstBitDepth.toString()) {
        bitDepthSelect.value = "keep";
      }
    }
  }
  
  if (sampleRateSelect) {
    // Enable all options first
    Array.from(sampleRateSelect.options).forEach(option => {
      option.disabled = false;
    });
    
    // Get the numerical sample rate for comparison
    const rateMap = {
      "1": 11025,
      "2": 22050,
      "3": 44100
    };
    
    // Create reverse mapping for sample rates to option values
    const reverseRateMap = {};
    Object.entries(rateMap).forEach(([key, value]) => {
      reverseRateMap[value] = key;
    });
    
    // Disable options that would upsample ALL samples
    Array.from(sampleRateSelect.options).forEach(option => {
      if (option.value !== "0" && rateMap[option.value] > maxSampleRate) {
        option.disabled = true;
      }
    });
    
    // If all samples are the same sample rate, disable that conversion option
    if (allSameSampleRate && firstSampleRate) {
      const matchingOption = reverseRateMap[firstSampleRate];
      if (matchingOption) {
        Array.from(sampleRateSelect.options).forEach(option => {
          if (option.value === matchingOption) {
            option.disabled = true;
          }
        });
        // If currently selected option is disabled, switch to "keep original"
        if (sampleRateSelect.value === matchingOption) {
          sampleRateSelect.value = "0";
        }
      }
    }
    
    // If currently selected option is disabled, switch to "keep original"
    if (sampleRateSelect.selectedOptions[0].disabled) {
      sampleRateSelect.value = "0";
    }
  }
  
  const targetBitDepth = bitDepthSelect ? bitDepthSelect.value : 'keep';
  const targetSampleRateOption = sampleRateSelect ? sampleRateSelect.value : '0';
  const targetChannels = channelsSelect ? channelsSelect.value : 'keep';
  
  const effectiveBitDepth = getEffectiveBitDepth(sample.originalBitDepth, targetBitDepth);
  const effectiveSampleRate = getEffectiveSampleRate(sample.originalSampleRate, targetSampleRateOption);
  const effectiveChannels = getEffectiveChannels(sample.originalChannels, targetChannels);
  
  // Build conversion indicators with icons
  let bitDepthText = `<i class="fa fa-database me-1"></i>${sample.originalBitDepth}-bit`;
  if (effectiveBitDepth !== sample.originalBitDepth) {
    bitDepthText += ` <i class="fa fa-arrow-right mx-1"></i> ${effectiveBitDepth}-bit`;
  }
  
  let sampleRateText = `<i class="fa fa-tachometer-alt me-1"></i>${(sample.originalSampleRate / 1000).toFixed(1)}khz`;
  if (effectiveSampleRate !== sample.originalSampleRate) {
    sampleRateText += ` <i class="fa fa-arrow-right mx-1"></i> ${(effectiveSampleRate / 1000).toFixed(1)}khz`;
  }
  
  // Channel info with icons
  let channelIcon = sample.originalChannels === 1 ? 'fa-volume-down' : 'fa-volume-up';
  let channelText = `<i class="fa ${channelIcon} me-1"></i>${sample.originalChannels === 1 ? 'mono' : 'stereo'}`;
  if (effectiveChannels !== sample.originalChannels) {
    const newIcon = effectiveChannels === 1 ? 'fa-volume-down' : 'fa-volume-up';
    const newText = effectiveChannels === 1 ? 'mono' : 'stereo';
    channelText += ` <i class="fa fa-arrow-right mx-1"></i> <i class="fa ${newIcon} me-1"></i>${newText}`;
  }
  
  // Duration and file size
  const durationText = `<i class="fa fa-clock me-1"></i>${sample.duration < 1 ? 
    `${Math.round(sample.duration * 1000)}ms` : 
    `${sample.duration.toFixed(1)}s`}`;
  
  const fileSizeKB = (sample.fileSize / 1024).toFixed(1);
  const fileSizeText = `<i class="fa fa-hdd me-1"></i>${fileSizeKB}kb`;
  
  sampleNameDiv.innerHTML = `
    <div class="sample-filename">${sample.filename}</div>
    <div class="sample-specs mt-1">
      <span class="badge bg-light text-dark me-1">${bitDepthText}</span>
      <span class="badge bg-light text-dark me-1">${sampleRateText}</span>
      <span class="badge bg-light text-dark me-1">${channelText}</span>
    </div>
    <small class="text-muted">
      ${durationText} • ${fileSizeText}
    </small>
  `;
}

function clearSample(idx) {
  drumSamples[idx] = null;
  drumSampleNames[idx] = "";
  document.getElementById(`sample-name-${idx}`).innerHTML = "";
  const playBtn = document.getElementById(`play-${idx}`);
  const clearBtn = document.getElementById(`clear-${idx}`);
  const advBtn = document.getElementById(`adv-${idx}`);
  if (playBtn) playBtn.disabled = true;
  if (clearBtn) clearBtn.disabled = true;
  if (advBtn) advBtn.disabled = true;
  document.getElementById(`sample-${idx}`).value = "";
  
  const advancedBtn = document.querySelector(
    `.advanced-btn[data-sample-idx='${idx}']`
  );
  if (advancedBtn) {
    advancedBtn.disabled = true;
    advancedBtn.dataset.playmode = "oneshot";
    advancedBtn.dataset.reverse = "false";
    advancedBtn.dataset.tune = "0";
    advancedBtn.dataset.gain = "0"; // Default gain
  }
  
  // Update generate patch button state
  updateGeneratePatchBtnState();
  // Update patch size indicator
  updateDrumPatchSize().catch(err => console.warn('Patch size update failed:', err));
  updateDrumPatchSummary();
}

function playSample(idx) {
  if (!drumSamples[idx]) return;
  const ctx = getAudioContext();
  const src = ctx.createBufferSource();
  let buffer = drumSamples[idx].audioBuffer;

  // Get Sample options from the button
  const advancedBtn = document.querySelector(
    `.advanced-btn[data-sample-idx='${idx}']`
  );
  const isReverse = advancedBtn && advancedBtn.dataset.reverse === "true";
  let semitones = 0;
  if (advancedBtn && advancedBtn.dataset.tune) {
    semitones = parseInt(advancedBtn.dataset.tune, 10) || 0;
  }
  // === Apply waveform start/end selection ===
  let sampleStart = 0;
  let sampleEnd = buffer.length;
  if (advancedBtn) {
    if (advancedBtn.dataset.sampleStart) {
      sampleStart = Math.max(
        0,
        Math.min(
          parseInt(advancedBtn.dataset.sampleStart, 10) || 0,
          buffer.length - 1
        )
      );
    }
    if (advancedBtn.dataset.sampleEnd) {
      sampleEnd = Math.max(
        sampleStart + 1,
        Math.min(
          parseInt(advancedBtn.dataset.sampleEnd, 10) || buffer.length,
          buffer.length
        )
      );
    }
  }
  // If selection is not the full buffer, create a new buffer for the selection
  if (sampleStart !== 0 || sampleEnd !== buffer.length) {
    const selectionLength = sampleEnd - sampleStart;
    const selectionBuffer = ctx.createBuffer(
      buffer.numberOfChannels,
      selectionLength,
      buffer.sampleRate
    );
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const srcData = buffer.getChannelData(ch);
      const dstData = selectionBuffer.getChannelData(ch);
      for (let i = 0; i < selectionLength; i++) {
        dstData[i] = srcData[sampleStart + i];
      }
    }
    buffer = selectionBuffer;
  }
  // Check reverse state and apply if needed
  if (isReverse) {
    const revBuffer = ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const srcData = buffer.getChannelData(ch);
      const dstData = revBuffer.getChannelData(ch);
      for (let i = 0, j = srcData.length - 1; i < srcData.length; i++, j--) {
        dstData[i] = srcData[j];
      }
    }
    buffer = revBuffer;
  }
  src.buffer = buffer;
  // Apply semitone tuning for browser playback
  src.playbackRate.value = Math.pow(2, semitones / 12);

  // === Stereo Panning ===
  let panValue = 0;
  if (advancedBtn && advancedBtn.dataset.pan) {
    panValue = parseInt(advancedBtn.dataset.pan, 10) || 0;
  }
  // === Gain ===
  let gainValue = 0;
  if (
    advancedBtn &&
    typeof advancedBtn.dataset.gain !== "undefined" &&
    advancedBtn.dataset.gain !== null
  ) {
    gainValue = Number(advancedBtn.dataset.gain);
  }
  // If NaN, fallback to 0
  if (isNaN(gainValue)) gainValue = 0;
  gainValue = Math.max(-30, Math.min(20, gainValue));
  // Map -100..100 to -1..1
  const panNode = ctx.createStereoPanner();
  panNode.pan.value = Math.max(-1, Math.min(1, panValue / 100));
  // Gain node: dB to linear
  const gainNode = ctx.createGain();
  gainNode.gain.value = Math.pow(10, gainValue / 20);
  src.connect(panNode).connect(gainNode).connect(ctx.destination);
  src.start(0);
}

function playSampleSlice(idx, startFrame, endFrame, panValue) {
  if (!drumSamples[idx]) return;
  const ctx = getAudioContext();
  const src = ctx.createBufferSource();
  let buffer = drumSamples[idx].audioBuffer;
  const selectionLength = endFrame - startFrame;
  if (selectionLength <= 0) return;
  const selectionBuffer = ctx.createBuffer(
    buffer.numberOfChannels,
    selectionLength,
    buffer.sampleRate
  );
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const srcData = buffer.getChannelData(ch);
    const dstData = selectionBuffer.getChannelData(ch);
    for (let i = 0; i < selectionLength; i++) {
      dstData[i] = srcData[startFrame + i];
    }
  }
  buffer = selectionBuffer;
  src.buffer = buffer;
  // === Stereo Panning for zoom modal ===
  // Try to get pan from advancedBtn if available
  let finalPanValue = 0;
  let gainValue = 0;
  const advancedBtn = document.querySelector(
    `.advanced-btn[data-sample-idx='${idx}']`
  );
  if (typeof panValue !== "undefined") {
    finalPanValue = panValue;
  } else if (advancedBtn && advancedBtn.dataset.pan) {
    finalPanValue = parseInt(advancedBtn.dataset.pan, 10) || 0;
  }
  if (
    advancedBtn &&
    typeof advancedBtn.dataset.gain !== "undefined" &&
    advancedBtn.dataset.gain !== null
  ) {
    gainValue = Number(advancedBtn.dataset.gain);
  }
  if (isNaN(gainValue)) gainValue = 0;
  gainValue = Math.max(-30, Math.min(20, gainValue));
  const panNode = ctx.createStereoPanner();
  panNode.pan.value = Math.max(-1, Math.min(1, finalPanValue / 100));
  const gainNode = ctx.createGain();
  gainNode.gain.value = Math.pow(10, gainValue / 20);
  src.connect(panNode).connect(gainNode).connect(ctx.destination);
  src.start(0);
}

// Wire up file inputs, play, clear, and Sample options buttons
const hiHatLabels = ["closed hi-hat", "open hi-hat", "ch", "oh", "hh", "hat"];
for (let i = 1; i <= NUM_DRUMS; i++) {
  const fileInput = document.getElementById(`sample-${i}`);
  const playBtn = document.getElementById(`play-${i}`);
  const clearBtn = document.getElementById(`clear-${i}`);
  const advancedBtn = document.getElementById(`adv-${i}`);
  const label = fileInput?.previousElementSibling;
  const row = advancedBtn?.closest("tr");

  if (fileInput) {
    // Remove the manual click handler since HTML 'for' attribute handles this automatically
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        loadSample(i, e.target.files[0]);
      }
    });
    // === Drag and Drop Support ===
    // Allow drag-and-drop on the file input's parent row or label
    const dropTarget = row || label || fileInput;
    if (dropTarget) {
      dropTarget.addEventListener("dragover", function (e) {
        e.preventDefault();
        dropTarget.classList.add("dragover");
      });
      dropTarget.addEventListener("dragleave", function (e) {
        dropTarget.classList.remove("dragover");
      });
      dropTarget.addEventListener("drop", function (e) {
        e.preventDefault();
        dropTarget.classList.remove("dragover");
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          // Set the file input's files property and trigger change event
          // Note: FileList is read-only, so we call loadSample directly
          loadSample(i, files[0]);
          // Optionally update UI to show file name
          if (fileInput) fileInput.value = "";
        }
      });
    }
  }
  if (playBtn) playBtn.addEventListener("click", () => playSample(i));
  if (clearBtn) clearBtn.addEventListener("click", () => clearSample(i));
  
  // Add record button event handler
  const recordBtn = document.getElementById(`record-${i}`);
  if (recordBtn) {
    recordBtn.addEventListener("click", () => openRecordingModalForDrum(i));
  }

  if (advancedBtn) {
    // Initialize data attributes and set defaults
    const drumLabel = row?.children[0]?.textContent?.toLowerCase() || "";
    if (hiHatLabels.some((hh) => drumLabel.includes(hh))) {
      advancedBtn.dataset.playmode = "group";
    } else {
      advancedBtn.dataset.playmode = "oneshot";
    }
    advancedBtn.dataset.reverse = "false";
    advancedBtn.dataset.tune = "0";
    advancedBtn.dataset.gain = "0"; // Default gain

    advancedBtn.addEventListener("click", function () {
      const advancedBtn = this;
      const sampleIndex = i;
      const buffer = drumSamples[sampleIndex];

      // Create a temporary state object to hold changes
      const tempSettings = {
        playmode: advancedBtn.dataset.playmode || "oneshot",
        isReverse: advancedBtn.dataset.reverse === "true",
        tune: parseInt(advancedBtn.dataset.tune, 10) || 0,
        pan: parseInt(advancedBtn.dataset.pan, 10) || 0,
        gain: parseInt(advancedBtn.dataset.gain, 10) || 0,
        sampleStart: parseInt(advancedBtn.dataset.sampleStart, 10),
        sampleEnd: parseInt(advancedBtn.dataset.sampleEnd, 10),
      };

      if (buffer) {
        if (isNaN(tempSettings.sampleStart)) tempSettings.sampleStart = 0;
        if (isNaN(tempSettings.sampleEnd) || tempSettings.sampleEnd <= 0)
          tempSettings.sampleEnd = buffer.length;
      } else {
        if (isNaN(tempSettings.sampleStart)) tempSettings.sampleStart = 0;
        if (isNaN(tempSettings.sampleEnd)) tempSettings.sampleEnd = 0;
      }

      let modal = document.getElementById("advanced-modal");
      if (modal) {
        // Reset modal fields to match tempSettings
        modal.querySelector(".adv-playmode").value = tempSettings.playmode;
        modal.querySelector(".adv-reverse-label").textContent =
          tempSettings.isReverse ? "reverse" : "forward";
        modal.querySelector(".adv-tune-slider").value = tempSettings.tune;
        modal.querySelector(".adv-tune").value = tempSettings.tune;
        modal.querySelector(".adv-gain-slider").value = tempSettings.gain;
        modal.querySelector(".adv-gain").value = tempSettings.gain;
        modal.querySelector("#advancedPanSlider").value = tempSettings.pan;
        modal.querySelector("#advancedPanNumber").value = tempSettings.pan;
        // Show modal
        modal.style.display = "block";
        setTimeout(() => modal.classList.add("show"), 10);
      }

      // Updated closeModal to animate out
      const closeModal = () => {
        modal.classList.remove("show");
        setTimeout(() => {
          modal.style.display = "none";
          // --- FIX: Also remove the modal-backdrop if present ---
          const backdrop = document.querySelector(".modal-backdrop");
          if (backdrop) backdrop.remove();
          // --- FIX: Remove modal-open class from body if present ---
          document.body.classList.remove("modal-open");
        }, 300);
      };
      modal
        .querySelectorAll(".adv-cancel")
        .forEach((el) => (el.onclick = closeModal));

      // === Close modal if clicking outside modal-dialog ===
      modal.addEventListener("mousedown", function (e) {
        if (e.target === modal) {
          closeModal();
        }
      });

      modal.querySelector(".adv-save").onclick = () => {
        const btnToUpdate = document.getElementById(`adv-${sampleIndex}`);
        if (btnToUpdate) {
          btnToUpdate.dataset.playmode = tempSettings.playmode;
          btnToUpdate.dataset.reverse = tempSettings.isReverse.toString();
          btnToUpdate.dataset.tune = tempSettings.tune;
          btnToUpdate.dataset.pan = tempSettings.pan;
          btnToUpdate.dataset.gain = tempSettings.gain;
          btnToUpdate.dataset.sampleStart = tempSettings.sampleStart;
          btnToUpdate.dataset.sampleEnd = tempSettings.sampleEnd;
        }
        closeModal();
      };

      modal.querySelector(".adv-playmode").onchange = function () {
        tempSettings.playmode = this.value;
      };

      modal.querySelector(".adv-reverse").onclick = function () {
        const icon = this.querySelector("i");
        const label = this.querySelector(".adv-reverse-label");
        tempSettings.isReverse = !tempSettings.isReverse;
        if (tempSettings.isReverse) {
          icon.style.transform = "scaleX(-1)";
          label.textContent = "reverse";
        } else {
          icon.style.transform = "";
          label.textContent = "forward";
        }
        // Play audio after direction change (debounced)
        if (window.zoomPlayTimeout) clearTimeout(window.zoomPlayTimeout);
        window.zoomPlayTimeout = setTimeout(() => {
          modal.querySelector(".adv-play-modal").click();
        }, 80);
      };

      modal.querySelector("#advancedPanSlider").oninput = function () {
        modal.querySelector("#advancedPanNumber").value = this.value;
        tempSettings.pan = parseInt(this.value, 10);
        // Play audio after pan change (debounced)
        if (window.zoomPlayTimeout) clearTimeout(window.zoomPlayTimeout);
        window.zoomPlayTimeout = setTimeout(() => {
          modal.querySelector(".adv-play-modal").click();
        }, 80);
      };
      modal.querySelector("#advancedPanNumber").oninput = function () {
        modal.querySelector("#advancedPanSlider").value = this.value;
        tempSettings.pan = parseInt(this.value, 10);
        // Play audio after pan change (debounced)
        if (window.zoomPlayTimeout) clearTimeout(window.zoomPlayTimeout);
        window.zoomPlayTimeout = setTimeout(() => {
          modal.querySelector(".adv-play-modal").click();
        }, 80);
      };

      modal.querySelector(".adv-tune-slider").oninput = function () {
        modal.querySelector(".adv-tune").value = this.value;
        tempSettings.tune = parseInt(this.value, 10);
        // Play audio after tune change (debounced)
        if (window.zoomPlayTimeout) clearTimeout(window.zoomPlayTimeout);
        window.zoomPlayTimeout = setTimeout(() => {
          modal.querySelector(".adv-play-modal").click();
        }, 80);
      };
      modal.querySelector(".adv-tune").oninput = function () {
        let val = parseInt(this.value, 10) || 0;
        val = Math.max(-48, Math.min(48, val));
        this.value = val;
        modal.querySelector(".adv-tune-slider").value = val;
        tempSettings.tune = val;
        // Play audio after tune change (debounced)
        if (window.zoomPlayTimeout) clearTimeout(window.zoomPlayTimeout);
        window.zoomPlayTimeout = setTimeout(() => {
          modal.querySelector(".adv-play-modal").click();
        }, 80);
      };

      // === Gain slider logic ===
      modal.querySelector(".adv-gain-slider").oninput = function () {
        modal.querySelector(".adv-gain").value = this.value;
        tempSettings.gain = parseInt(this.value, 10);
      };
      modal.querySelector(".adv-gain").oninput = function () {
        let val = parseInt(this.value, 10) || -30;
        val = Math.max(-30, Math.min(20, val));
        this.value = val;
        modal.querySelector(".adv-gain-slider").value = val;
        tempSettings.gain = val;
      };

      modal.querySelector("#zoom-btn").addEventListener("click", () => {
        const startPoint = modal.querySelector(".adv-sample-start").value;
        const endPoint = modal.querySelector(".adv-sample-end").value;

        const zoomModal = new bootstrap.Modal(
          document.getElementById("zoom-modal")
        );
        const zoomModalElement = document.getElementById("zoom-modal");

        zoomModalElement.dataset.sampleIndex = sampleIndex;
        document.getElementById("zoom-start-point").value = startPoint;
        document.getElementById("zoom-end-point").value = endPoint;

        modal.style.display = "none";
        zoomModal.show();
      });

      const zoomModalElement = document.getElementById("zoom-modal");
      zoomModalElement.addEventListener("hidden.bs.modal", () => {
        const advancedModal = document.getElementById("advanced-modal");
        if (advancedModal) {
          advancedModal.style.display = "block";
          advancedModal.classList.remove("show");
          // Force reflow to ensure transition
          void advancedModal.offsetWidth;
          setTimeout(() => {
            advancedModal.classList.add("show");
          }, 10);
          // Update temp settings from the zoom modal's inputs
          tempSettings.sampleStart = parseInt(
            advancedModal.querySelector(".adv-sample-start").value,
            10
          );
          tempSettings.sampleEnd = parseInt(
            advancedModal.querySelector(".adv-sample-end").value,
            10
          );
          if (typeof advancedModal.drawMarkers === "function") {
            advancedModal.drawMarkers();
          }
        }
      });

      zoomModalElement.addEventListener("shown.bs.modal", () => {
        const sampleIndex = zoomModalElement.dataset.sampleIndex;
        const sample = drumSamples[sampleIndex];
        if (!sample) return;
        
        const buffer = sample.audioBuffer;
        if (!buffer) return;

        const canvas = document.getElementById("zoom-canvas");
        // Clean up any existing event listeners
        const newCanvas = canvas.cloneNode(true);
        canvas.parentNode.replaceChild(newCanvas, canvas);
        
        // Responsive: set canvas width/height to parent width and CSS height
        const parentWidth = newCanvas.parentElement.offsetWidth || 300;
        // Get computed height from CSS (or fallback to 60)
        const computedStyle = window.getComputedStyle(newCanvas);
        let cssHeight = parseInt(computedStyle.height, 10);
        if (isNaN(cssHeight) || cssHeight < 10) cssHeight = 60;
        newCanvas.width = parentWidth;
        newCanvas.height = cssHeight;

        const startInput = document.getElementById("zoom-start-point");
        const endInput = document.getElementById("zoom-end-point");
        const width = newCanvas.width;
        const height = newCanvas.height;
        const ctx = newCanvas.getContext("2d");
        const data = buffer.getChannelData(0);

        let startFrame = parseInt(startInput.value, 10);
        let endFrame = parseInt(endInput.value, 10);
        if (isNaN(startFrame)) startFrame = 0;
        if (isNaN(endFrame) || endFrame <= 0) endFrame = data.length;

        function drawZoomWaveform() {
          // Use drawBuffer for min-max waveform
          drawBuffer(width, height, ctx, buffer);
          // Draw center line
          const amp = height / 2;
          ctx.strokeStyle = "#333";
          ctx.beginPath();
          ctx.moveTo(0, amp);
          ctx.lineTo(width, amp);
          ctx.stroke();
        }

        // In the zoom modal, update marker colors to greyscale
        function drawZoomMarkers() {
          // Start marker (dark grey vertical line)
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 2;
          const startX = Math.floor((startFrame / data.length) * width);
          ctx.beginPath();
          ctx.moveTo(startX, 0);
          ctx.lineTo(startX, height);
          ctx.stroke();

          // End marker (dark grey vertical line)
          const endX = Math.floor((endFrame / data.length) * width);
          ctx.beginPath();
          ctx.moveTo(endX, 0);
          ctx.lineTo(endX, height);
          ctx.stroke();

          // Triangle markers at bottom (dark grey, consistent with multisample tool)
          ctx.fillStyle = "#333";
          const triangleSize = 10; // Match multisample tool size
          const bottomY = height; // No gap at bottom

          // Start marker triangle (pointing up)
          ctx.beginPath();
          ctx.moveTo(startX - triangleSize / 2, bottomY);
          ctx.lineTo(startX + triangleSize / 2, bottomY);
          ctx.lineTo(startX, bottomY - triangleSize);
          ctx.closePath();
          ctx.fill();

          // End marker triangle (pointing up)
          ctx.beginPath();
          ctx.moveTo(endX - triangleSize / 2, bottomY);
          ctx.lineTo(endX + triangleSize / 2, bottomY);
          ctx.lineTo(endX, bottomY - triangleSize);
          ctx.closePath();
          ctx.fill();
        }

        function updateZoomWaveformAndMarkers() {
          drawZoomWaveform();
          drawZoomMarkers();
          updateSampleValueDisplays();
        }

        updateZoomWaveformAndMarkers();

        let dragging = null;

        // Add hover cursor change
        newCanvas.addEventListener("mousemove", function (e) {
          const rect = newCanvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const xNormalized = x / width;
          
          if (dragging) {
            const frame = Math.round((x / width) * data.length);
            
            if (dragging === "start") {
              const newStart = Math.max(0, Math.min(frame, data.length - 1));
              startFrame = newStart;
              startInput.value = newStart;
              
              // Push end marker if start goes past it
              if (newStart >= endFrame) {
                endFrame = Math.min(newStart + 10, data.length);
                endInput.value = endFrame;
              }
            } else if (dragging === "end") {
              const newEnd = Math.max(
                startFrame + 10,
                Math.min(frame, data.length)
              );
              endFrame = newEnd;
              endInput.value = endFrame;
            }
            
            updateZoomWaveformAndMarkers();
            if (window.zoomPlayTimeout) clearTimeout(window.zoomPlayTimeout);
            window.zoomPlayTimeout = setTimeout(() => {
              playSampleSlice(
                sampleIndex,
                parseInt(startInput.value, 10),
                parseInt(endInput.value, 10),
                tempSettings.pan
              );
            }, 80);
          } else {
            const startX = Math.floor((startFrame / data.length) * width);
            const endX = Math.floor((endFrame / data.length) * width);
            const startPos = startX / width;
            const endPos = endX / width;
            
            const tolerance = 0.08; // Match multisample tool tolerance
            const isNearMarker = Math.abs(xNormalized - startPos) < tolerance || 
                                Math.abs(xNormalized - endPos) < tolerance;
            
            newCanvas.style.cursor = isNearMarker ? "ew-resize" : "pointer";
          }
        });

        newCanvas.addEventListener("mousedown", function (e) {
          const rect = newCanvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const xNormalized = x / width;
          
          const startX = Math.floor((startFrame / data.length) * width);
          const endX = Math.floor((endFrame / data.length) * width);
          const startPos = startX / width;
          const endPos = endX / width;
          
          const tolerance = 0.08; // Match multisample tool tolerance
          
          // Check which markers are within horizontal tolerance
          if (Math.abs(xNormalized - startPos) < tolerance) {
            dragging = "start";
            newCanvas.style.cursor = "grabbing";
          } else if (Math.abs(xNormalized - endPos) < tolerance) {
            dragging = "end";
            newCanvas.style.cursor = "grabbing";
          } else {
            // Click on waveform - move nearest marker
            const frame = Math.round(xNormalized * data.length);
            const distanceToStart = Math.abs(xNormalized - startPos);
            const distanceToEnd = Math.abs(xNormalized - endPos);
            
            if (distanceToStart < distanceToEnd) {
              const newStart = Math.max(0, Math.min(frame, data.length - 1));
              startFrame = newStart;
              startInput.value = newStart;
              
              // Push end marker if start goes past it
              if (newStart >= endFrame) {
                endFrame = Math.min(newStart + 10, data.length);
                endInput.value = endFrame;
              }
            } else {
              const newEnd = Math.max(
                startFrame + 10,
                Math.min(frame, data.length)
              );
              endFrame = newEnd;
              endInput.value = endFrame;
            }
            
            updateZoomWaveformAndMarkers();
            if (window.zoomPlayTimeout) clearTimeout(window.zoomPlayTimeout);
            window.zoomPlayTimeout = setTimeout(() => {
              playSampleSlice(
                sampleIndex,
                parseInt(startInput.value, 10),
                parseInt(endInput.value, 10),
                tempSettings.pan
              );
            }, 80);
          }
        });

        // Add mouseup/mouseleave handlers to document to handle dragging outside canvas
        const mouseUpHandler = function () {
          if (dragging) {
            dragging = null;
            newCanvas.style.cursor = "pointer";
          }
        };

        document.addEventListener("mouseup", mouseUpHandler);
        document.addEventListener("mouseleave", mouseUpHandler);

        // Clean up event listeners when modal is hidden
        zoomModalElement.addEventListener("hidden.bs.modal", function cleanup() {
          document.removeEventListener("mouseup", mouseUpHandler);
          document.removeEventListener("mouseleave", mouseUpHandler);
          zoomModalElement.removeEventListener("hidden.bs.modal", cleanup);
        });

        document.getElementById("zoom-play-button").onclick = () => {
          const sampleIndex = zoomModalElement.dataset.sampleIndex;
          const startFrame = parseInt(
            document.getElementById("zoom-start-point").value,
            10
          );
          const endFrame = parseInt(
            document.getElementById("zoom-end-point").value,
            10
          );
          playSampleSlice(sampleIndex, startFrame, endFrame, tempSettings.pan);
        };

        document.getElementById("zoom-save-button").onclick = () => {
          const startFrame = document.getElementById("zoom-start-point").value;
          const endFrame = document.getElementById("zoom-end-point").value;

          // Update tempSettings
          tempSettings.sampleStart = parseInt(startFrame, 10);
          tempSettings.sampleEnd = parseInt(endFrame, 10);

          // Also update the inputs in the (currently hidden) advanced modal if it exists
          const advancedModal = document.getElementById("advanced-modal");
          if (advancedModal) {
            advancedModal.querySelector(".adv-sample-start").value = startFrame;
            advancedModal.querySelector(".adv-sample-end").value = endFrame;
          }

          const zoomModal = bootstrap.Modal.getInstance(zoomModalElement);
          zoomModal.hide();
        };
      });

      // Sample Editor logic
      const waveformDiv = modal.querySelector("#waveform-container-modal");
      // --- FIX: Remove any old canvases before drawing a new one ---
      while (waveformDiv.firstChild)
        waveformDiv.removeChild(waveformDiv.firstChild);
      const startInput = modal.querySelector(".adv-sample-start");
      const endInput = modal.querySelector(".adv-sample-end");
      const lengthLabel = modal.querySelector(".adv-sample-length");
      if (buffer) {
        // Draw waveform (min-max, mono only)
        const width = waveformDiv.offsetWidth || 300;
        const height = 60;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        waveformDiv.appendChild(canvas);
        const ctx = canvas.getContext("2d");
        drawBuffer(width, height, ctx, buffer);
        // Markers
        let startFrame = tempSettings.sampleStart;
        let endFrame = tempSettings.sampleEnd;
        if (isNaN(startFrame)) startFrame = 0;
        if (isNaN(endFrame) || endFrame <= 0) endFrame = buffer.audioBuffer.length;
        startInput.value = startFrame;
        endInput.value = endFrame;
        lengthLabel.textContent = `/ ${buffer.audioBuffer.length} frames`;
        // Draw marker lines
        function drawMarkers() {
          // Redraw waveform first
          drawBuffer(width, height, ctx, buffer);

          // Start marker (dark grey vertical line)
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 2;
          const sx = Math.floor((startInput.value / buffer.audioBuffer.length) * width);
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, height);
          ctx.stroke();

          // End marker (dark grey vertical line)
          const ex = Math.floor((endInput.value / buffer.audioBuffer.length) * width);
          ctx.beginPath();
          ctx.moveTo(ex, 0);
          ctx.lineTo(ex, height);
          ctx.stroke();

          // Triangle markers at bottom (dark grey, consistent with multisample tool)
          ctx.fillStyle = "#333";
          const triangleSize = 10; // Match multisample tool size
          const bottomY = height; // No gap at bottom

          // Start marker triangle (pointing up)
          ctx.beginPath();
          ctx.moveTo(sx - triangleSize / 2, bottomY);
          ctx.lineTo(sx + triangleSize / 2, bottomY);
          ctx.lineTo(sx, bottomY - triangleSize);
          ctx.closePath();
          ctx.fill();

          // End marker triangle (pointing up)
          ctx.beginPath();
          ctx.moveTo(ex - triangleSize / 2, bottomY);
          ctx.lineTo(ex + triangleSize / 2, bottomY);
          ctx.lineTo(ex, bottomY - triangleSize);
          ctx.closePath();
          ctx.fill();
        }
        drawMarkers();

        let playTimeout;
        startInput.oninput = endInput.oninput = function () {
          const MIN_DISTANCE = 10;
          function clampMarkers() {
            let s = Math.max(
              0,
              Math.min(parseInt(startInput.value, 10) || 0, buffer.audioBuffer.length - 1)
            );
            let e = Math.max(
              s + MIN_DISTANCE,
              Math.min(
                parseInt(endInput.value, 10) || buffer.audioBuffer.length,
                buffer.audioBuffer.length
              )
            );
            startInput.value = s;
            endInput.value = e;
          }
          clampMarkers();
          drawMarkers();
          tempSettings.sampleStart = parseInt(startInput.value, 10);
          tempSettings.sampleEnd = parseInt(endInput.value, 10);
          if (playTimeout) clearTimeout(playTimeout);
          playTimeout = setTimeout(() => {
            modal.querySelector(".adv-play-modal").click();
          }, 80);
        };
        // --- FIXED DRAG LOGIC ---
        let draggingMarker = null;
        let dragMoveHandler = null;
        let dragUpHandler = null;

        // Add hover cursor change
        canvas.addEventListener("mousemove", function (e) {
          if (draggingMarker) return; // Don't change cursor while dragging
          
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const xNormalized = x / width;
          const sx = Math.floor((startInput.value / buffer.audioBuffer.length) * width);
          const ex = Math.floor((endInput.value / buffer.audioBuffer.length) * width);
          
          const tolerance = 0.08; // Match multisample tool tolerance (8% of width)
          const startPos = sx / width;
          const endPos = ex / width;
          
          const isNearMarker = Math.abs(xNormalized - startPos) < tolerance || 
                              Math.abs(xNormalized - endPos) < tolerance;
          
          canvas.style.cursor = isNearMarker ? "ew-resize" : "pointer";
        });

        canvas.addEventListener("mousedown", function (e) {
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const xNormalized = x / width;
          
          const sx = Math.floor((startInput.value / buffer.audioBuffer.length) * width);
          const ex = Math.floor((endInput.value / buffer.audioBuffer.length) * width);
          const startPos = sx / width;
          const endPos = ex / width;
          
          const tolerance = 0.08; // Match multisample tool tolerance
          
          // Zone-based marker selection (bottom 20% prioritizes markers)
          const bottomZone = height * 0.8;
          let candidateMarkers = [];
          
          // Check which markers are within horizontal tolerance
          if (Math.abs(xNormalized - startPos) < tolerance) {
            candidateMarkers.push({ marker: "start", distance: Math.abs(xNormalized - startPos) });
          }
          if (Math.abs(xNormalized - endPos) < tolerance) {
            candidateMarkers.push({ marker: "end", distance: Math.abs(xNormalized - endPos) });
          }
          
          if (candidateMarkers.length > 0) {
            // If in bottom zone or only one candidate, pick closest
            if (y >= bottomZone || candidateMarkers.length === 1) {
              draggingMarker = candidateMarkers.reduce((a, b) => 
                a.distance < b.distance ? a : b).marker;
            } else {
              // In top/middle zone, still pick closest
              draggingMarker = candidateMarkers.reduce((a, b) => 
                a.distance < b.distance ? a : b).marker;
            }
            canvas.style.cursor = "grabbing";
          } else {
            // Click on waveform - move nearest marker with constraints
            const distances = {
              start: Math.abs(xNormalized - startPos),
              end: Math.abs(xNormalized - endPos)
            };
            
            const nearestMarker = Object.keys(distances).reduce((a, b) =>
              distances[a] < distances[b] ? a : b
            );
            
            const newFrame = Math.round(xNormalized * buffer.audioBuffer.length);
            
            if (nearestMarker === "start") {
              // Start marker can push end marker if needed
              const newStart = Math.max(0, Math.min(newFrame, buffer.audioBuffer.length - 1));
              startInput.value = newStart;
              tempSettings.sampleStart = newStart;
              
              // Push end marker if start goes past it
              if (newStart >= parseInt(endInput.value, 10)) {
                const newEnd = Math.min(newStart + 10, buffer.audioBuffer.length);
                endInput.value = newEnd;
                tempSettings.sampleEnd = newEnd;
              }
            } else {
              // End marker cannot move past start
              const newEnd = Math.max(
                parseInt(startInput.value, 10) + 10,
                Math.min(newFrame, buffer.audioBuffer.length)
              );
              endInput.value = newEnd;
              tempSettings.sampleEnd = newEnd;
            }
            
            drawMarkers();
            if (playTimeout) clearTimeout(playTimeout);
            playTimeout = setTimeout(
              () => modal.querySelector(".adv-play-modal").click(),
              80
            );
            return;
          }
          // Attach move and up listeners only when dragging
          dragMoveHandler = function (e) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const frame = Math.round((x / width) * buffer.audioBuffer.length);

            if (draggingMarker === "start") {
              const newStart = Math.max(0, Math.min(frame, buffer.audioBuffer.length - 1));
              startInput.value = newStart;
              tempSettings.sampleStart = newStart;
              
              // Push end marker if start goes past it
              if (newStart >= parseInt(endInput.value, 10)) {
                const newEnd = Math.min(newStart + 10, buffer.audioBuffer.length);
                endInput.value = newEnd;
                tempSettings.sampleEnd = newEnd;
              }
            } else if (draggingMarker === "end") {
              const newEnd = Math.max(
                parseInt(startInput.value, 10) + 10,
                Math.min(frame, buffer.audioBuffer.length)
              );
              endInput.value = newEnd;
              tempSettings.sampleEnd = newEnd;
            }
            drawMarkers();
            if (playTimeout) clearTimeout(playTimeout);
            playTimeout = setTimeout(
              () => modal.querySelector(".adv-play-modal").click(),
              80
            );
          };
          dragUpHandler = function () {
            draggingMarker = null;
            canvas.style.cursor = "pointer";
            window.removeEventListener("mousemove", dragMoveHandler);
            window.removeEventListener("mouseup", dragUpHandler);
          };
          window.addEventListener("mousemove", dragMoveHandler);
          window.addEventListener("mouseup", dragUpHandler);
        });
      } else {
        waveformDiv.innerHTML =
          '<div class="text-muted small">no sample loaded</div>';
        startInput.value = 0;
        endInput.value = 0;
        lengthLabel.textContent = "";
      }

      // === FIX: Attach play button handler here, in correct scope ===
      modal.querySelector(".adv-play-modal").onclick = () => {
        if (!buffer) return;
        const ctx = getAudioContext();
        const src = ctx.createBufferSource();
        let playBuffer = buffer;

        // Get modal settings from tempSettings
        let sampleStart = tempSettings.sampleStart;
        let sampleEnd = tempSettings.sampleEnd;

        sampleStart = Math.max(0, Math.min(sampleStart, buffer.length - 1));
        sampleEnd = Math.max(
          sampleStart + 1,
          Math.min(sampleEnd, buffer.length)
        );

        if (sampleStart !== 0 || sampleEnd !== buffer.length) {
          const selectionLength = sampleEnd - sampleStart;
          const selectionBuffer = ctx.createBuffer(
            buffer.numberOfChannels,
            selectionLength,
            buffer.sampleRate
          );
          for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
            const srcData = buffer.getChannelData(ch);
            const dstData = selectionBuffer.getChannelData(ch);
            for (let j = 0; j < selectionLength; j++) {
              dstData[j] = srcData[sampleStart + j];
            }
          }
          playBuffer = selectionBuffer;
        }

        // Reverse
        if (tempSettings.isReverse) {
          const revBuffer = ctx.createBuffer(
            playBuffer.numberOfChannels,
            playBuffer.length,
            playBuffer.sampleRate
          );
          for (let ch = 0; ch < playBuffer.numberOfChannels; ch++) {
            const srcData = playBuffer.getChannelData(ch);
            const dstData = revBuffer.getChannelData(ch);
            for (
              let j = 0, k = srcData.length - 1;
              j < srcData.length;
              j++, k--
            ) {
              dstData[j] = srcData[k];
            }
          }
          playBuffer = revBuffer;
        }

        // Tuning
        src.buffer = playBuffer;
        src.playbackRate.value = Math.pow(2, tempSettings.tune / 12);

        // Panning
        const panNode = ctx.createStereoPanner();
        panNode.pan.value = Math.max(-1, Math.min(1, tempSettings.pan / 100));

        // Gain (dB to linear)
        let gainValue = Number(tempSettings.gain);
        if (isNaN(gainValue)) gainValue = 0;
        gainValue = Math.max(-30, Math.min(20, gainValue));
        const gainNode = ctx.createGain();
        gainNode.gain.value = Math.pow(10, gainValue / 20);

        src.connect(panNode).connect(gainNode).connect(ctx.destination);
        src.start(0);
      };
    });
  }
}

// Use the already-declared drumKeyMap and currentOctave for keyboard trigger logic
function getDrumIdxForKey(key) {
  const mapping = drumKeyMap[currentOctave][key];
  return mapping ? mapping.idx : null;
}

document.addEventListener("keydown", (e) => {
  if (document.getElementById("drum-tab").classList.contains("active")) {
    // Check if user is typing in an input field, textarea, or contenteditable element
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true' ||
      activeElement.isContentEditable
    );
    
    // Don't trigger sample playback if user is typing
    if (isTyping) {
      return;
    }
    
    const key = e.key.toUpperCase();
    let octaveSwitched = false;
    if (key === "Z") {
      currentOctave = 0;
      updateKeyboardLabels();
      octaveSwitched = true;
    }
    if (key === "X") {
      currentOctave = 1;
      updateKeyboardLabels();
      octaveSwitched = true;
    }
    if (!octaveSwitched) {
      const idx = getDrumIdxForKey(key);
      if (idx && drumSamples[idx]) {
        playSample(idx);
      }
      const keyEl = Array.from(document.querySelectorAll("#drum .kbd")).find(
        (k) => k.textContent.trim().toUpperCase() === key
      );
      if (keyEl) keyEl.classList.add("kbd-pressed");
    }
  }
});
document.addEventListener("keyup", (e) => {
  if (document.getElementById("drum-tab").classList.contains("active")) {
    // Check if user is typing in an input field, textarea, or contenteditable element
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true' ||
      activeElement.isContentEditable
    );
    
    // Don't trigger visual feedback if user is typing
    if (isTyping) {
      return;
    }
    
    const key = e.key.toUpperCase();
    const keyEl = Array.from(document.querySelectorAll("#drum .kbd")).find(
      (k) => k.textContent.trim().toUpperCase() === key
    );
    if (keyEl) keyEl.classList.remove("kbd-pressed");
  }
});

// === Drum Patch Generation (Generate Patch Button) ===
const drumGenerateBtn = Array.from(
  document.querySelectorAll("#drum .accent-btn")
).find((btn) => btn.textContent.toLowerCase().includes("generate patch"));
if (drumGenerateBtn) {
  // Wait for JSZip to be loaded before enabling the button
  function enableGenerateBtnWhenReady() {
    if (typeof JSZip !== "undefined") {
      // Don't directly enable - let updateGeneratePatchBtnState handle the enable/disable logic
      updateGeneratePatchBtnState();
      drumGenerateBtn.title = "";
    } else {
      drumGenerateBtn.disabled = true;
      drumGenerateBtn.title = "Loading JSZip...";
      setTimeout(enableGenerateBtnWhenReady, 200);
    }
  }
  enableGenerateBtnWhenReady();

  drumGenerateBtn.addEventListener("click", async () => {
    if (typeof JSZip === "undefined") {
      alert("JSZip library not loaded. Please wait and try again.");
      return;
    }
    if (typeof baseDrumJson === "undefined") {
      alert("baseDrumJson is missing. Patch generation cannot continue.");
      return;
    }
    drumGenerateBtn.disabled = true;
    drumGenerateBtn.textContent = "Generating...";
    try {
      const presetName =
        document.getElementById("preset-name-drum").value || "Drums";
      const sampleRateIdx =
        document.getElementById("sample-rate-drum").selectedIndex;
      const targetSampleRate = [null, 11025, 22050, 44100][sampleRateIdx];
      const zip = new JSZip();
      // Deep copy baseDrumJson
      const patchJson = JSON.parse(JSON.stringify(baseDrumJson));
      patchJson.name = presetName;
      patchJson.regions = [];

      // If advanced preset settings exist, update engine section
      if (window.advancedPresetSettings) {
        const adv = window.advancedPresetSettings;
        if (patchJson.engine) {
          if (adv.playmode) patchJson.engine.playmode = adv.playmode;
          if (!isNaN(adv.transpose)) patchJson.engine.transpose = adv.transpose;
          if (!isNaN(adv.velocity))
            patchJson.engine["velocity.sensitivity"] = adv.velocity;
          if (!isNaN(adv.volume)) patchJson.engine.volume = adv.volume;
          if (!isNaN(adv.width)) patchJson.engine.width = adv.width;
        }
      }
      const fileReadPromises = [];
      let midiNoteCounter = 53; // Start MIDI notes at 53
      for (let i = 1; i <= NUM_DRUMS; i++) {
        // Use drumSampleNames[i] to get the file name, and drumSamples[i] for the buffer
        if (drumSamples[i]) {
          const fileInput = document.getElementById(`sample-${i}`);
          let file = fileInput && fileInput.files && fileInput.files[0];
          // If file input is empty (e.g. after drag-and-drop), synthesize a File from buffer and name
          if (!file && drumSampleNames[i]) {
            // Create a WAV blob from the buffer
            const buffer = drumSamples[i];
            const wavBlob = bufferToWavBlob(buffer);
            file = new File([wavBlob], drumSampleNames[i], {
              type: "audio/wav",
            });
          }
          if (file) {
            let outputName = sanitizeName(file.name);
            let sampleRate = drumSamples[i].sampleRate || 44100;
            let duration =
              drumSamples[i].duration ||
              drumSamples[i].length / drumSamples[i].sampleRate;
            const advancedBtn = document.querySelector(
              `.advanced-btn[data-sample-idx='${i}']`
            );
            const playmode = advancedBtn
              ? advancedBtn.dataset.playmode || "oneshot"
              : "oneshot";
            const reverse =
              advancedBtn && advancedBtn.dataset.reverse === "true";
            let tune = 0;
            if (advancedBtn && advancedBtn.dataset.tune) {
              tune = parseInt(advancedBtn.dataset.tune, 10) || 0;
            }
            let pan = 0;
            if (advancedBtn && advancedBtn.dataset.pan) {
              pan = parseInt(advancedBtn.dataset.pan, 10) || 0;
            }
            // Build region object in correct OP-XY format
            // OP-XY drum presets use consecutive MIDI notes starting from 53
            const midiNote = midiNoteCounter++; // Assign consecutive MIDI notes starting from 53
            const region = {
              "fade.in": 0,
              "fade.out": 0,
              framecount: Math.floor(
                duration * (targetSampleRate || sampleRate)
              ),
              hikey: midiNote,
              lokey: midiNote,
              pan: pan,
              "pitch.keycenter": 60,
              playmode: playmode,
              reverse: reverse,
              sample: outputName,
              transpose: 0,
              tune: tune,
            };
            if (advancedBtn && advancedBtn.dataset.sampleStart)
              region["sample.start"] =
                parseInt(advancedBtn.dataset.sampleStart, 10) || 0;
            if (advancedBtn && advancedBtn.dataset.sampleEnd)
              region["sample.end"] =
                parseInt(advancedBtn.dataset.sampleEnd, 10) || 0;
            if (targetSampleRate && sampleRate !== targetSampleRate) {
              fileReadPromises.push(
                resampleAudio(file, targetSampleRate).then((wavBlob) => {
                  zip.file(outputName, wavBlob);
                  patchJson.regions.push(region);
                })
              );
            } else {
              fileReadPromises.push(
                new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    zip.file(outputName, e.target.result);
                    patchJson.regions.push(region);
                    resolve();
                  };
                  reader.onerror = (err) => reject(err);
                  reader.readAsArrayBuffer(file);
                })
              );
            }
          }
        }
      }
      await Promise.all(fileReadPromises);
      zip.file("patch.json", JSON.stringify(patchJson, null, 2));
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
      drumGenerateBtn.disabled = false;
      drumGenerateBtn.textContent = "generate patch";
    }
  });
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

// Add a function for handling keyboard shortcuts in modals at the beginning of the file
document.addEventListener("DOMContentLoaded", function () {
  // Initialize drum recording functionality
  initializeDrumRecording();
  
  // Global keyboard event listener for modal keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    // Check if the advanced modal is open
    const advancedModal = document.getElementById("advanced-modal");
    if (advancedModal && advancedModal.style.display === "block") {
      // P key to play
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        const playButton = advancedModal.querySelector(".adv-play-modal");
        if (playButton) playButton.click();
      }
      // Escape key to close without saving (cancel)
      if (e.key === "Escape") {
        e.preventDefault();
        const cancelButton = advancedModal.querySelector(".adv-cancel");
        if (cancelButton) cancelButton.click();
      }
    }

    // Check if zoom modal is open
    const zoomModal = document.getElementById("zoom-modal");
    if (zoomModal && zoomModal.classList.contains("show")) {
      // P key to play
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        const playButton = document.getElementById("zoom-play-button");
        if (playButton) playButton.click();
      }
      // Escape key to close without saving (already handled by Bootstrap, but adding for completeness)
      if (e.key === "Escape") {
        e.preventDefault();
        const closeButton = zoomModal.querySelector(
          '[data-bs-dismiss="modal"]'
        );
        if (closeButton) closeButton.click();
      }
    }
  });

  // --- Advanced Preset Settings Modal JS ---
  // Sync range and number inputs for each param
  function syncSliderAndNumber(sliderId, numberId, min, max) {
    const slider = document.getElementById(sliderId);
    const number = document.getElementById(numberId);
    if (!slider || !number) return;
    slider.addEventListener("input", function () {
      number.value = slider.value;
    });
    number.addEventListener("input", function () {
      let val = parseInt(number.value, 10);
      if (isNaN(val)) val = min;
      val = Math.max(min, Math.min(max, val));
      number.value = val;
      slider.value = val;
    });
  }

  // Special sync function for percentage controls that map to 0-32767
  function syncPercentageControls(sliderId, numberId) {
    const slider = document.getElementById(sliderId);
    const number = document.getElementById(numberId);
    if (!slider || !number) return;

    slider.addEventListener("input", function () {
      number.value = slider.value;
    });
    number.addEventListener("input", function () {
      let val = parseInt(number.value, 10);
      if (isNaN(val)) val = 0;
      val = Math.max(0, Math.min(100, val));
      number.value = val;
      slider.value = val;
    });
  }

  // Helper function to convert percentage to int (0-100% -> 0-32767)
  function percentToInt(percent) {
    return Math.round((percent / 100) * 32767);
  }

  // Helper function to convert int to percentage (0-32767 -> 0-100%)
  function intToPercent(intValue) {
    return Math.round((intValue / 32767) * 100);
  }

  syncSliderAndNumber("preset-transpose", "preset-transpose-number", -36, 36);
  syncPercentageControls(
    "preset-velocity-sensitivity",
    "preset-velocity-sensitivity-number"
  );
  syncPercentageControls("preset-volume", "preset-volume-number");
  syncPercentageControls("preset-width", "preset-width-number");

  // Initialize advanced preset settings with default values
  const initializeAdvancedPresetDefaults = () => {
    // Set default values for the modal form fields
    const playmodeSelect = document.getElementById("preset-playmode");
    const transposeSlider = document.getElementById("preset-transpose");
    const transposeNumber = document.getElementById("preset-transpose-number");
    const velocitySlider = document.getElementById(
      "preset-velocity-sensitivity"
    );
    const velocityNumber = document.getElementById(
      "preset-velocity-sensitivity-number"
    );
    const volumeSlider = document.getElementById("preset-volume");
    const volumeNumber = document.getElementById("preset-volume-number");
    const widthSlider = document.getElementById("preset-width");
    const widthNumber = document.getElementById("preset-width-number");

    if (playmodeSelect) playmodeSelect.value = "poly";
    if (transposeSlider) transposeSlider.value = 0;
    if (transposeNumber) transposeNumber.value = 0;
    // Default percentage values (15% for velocity, 80% for volume, 0% for width)
    if (velocitySlider) velocitySlider.value = 15; // 15% = 4915 int
    if (velocityNumber) velocityNumber.value = 15;
    if (volumeSlider) volumeSlider.value = 80; // 80% = 26214 int
    if (volumeNumber) volumeNumber.value = 80;
    if (widthSlider) widthSlider.value = 0; // 0% = 0 int
    if (widthNumber) widthNumber.value = 0;

    // Initialize the global settings object with defaults (using int values for internal processing)
    window.advancedPresetSettings = {
      playmode: "poly",
      transpose: 0,
      velocity: percentToInt(15), // Convert to int for internal use
      volume: percentToInt(80), // Convert to int for internal use
      width: percentToInt(0), // Convert to int for internal use
    };
  };

  // Call initialization function
  initializeAdvancedPresetDefaults();

  // Save button handler for advanced preset settings
  const savePresetBtn = document.getElementById(
    "save-preset-advanced-settings"
  );
  if (savePresetBtn) {
    savePresetBtn.addEventListener("click", function () {
      const playmode = document.getElementById("preset-playmode").value;
      const transpose = parseInt(
        document.getElementById("preset-transpose").value,
        10
      );
      const velocityPercent = parseInt(
        document.getElementById("preset-velocity-sensitivity").value,
        10
      );
      const volumePercent = parseInt(
        document.getElementById("preset-volume").value,
        10
      );
      const widthPercent = parseInt(
        document.getElementById("preset-width").value,
        10
      );

      // Convert percentages to integers for internal storage
      const velocity = percentToInt(velocityPercent);
      const volume = percentToInt(volumePercent);
      const width = percentToInt(widthPercent);

      // Store these values for use in patch generation
      window.advancedPresetSettings = {
        playmode,
        transpose,
        velocity,
        volume,
        width,
      };

      // Hide modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("preset-advanced-modal")
      );
      if (modal) modal.hide();
    });
  }

  // Add clear all button logic for drum sample loader
  function initDrumClearAllButton() {
    const clearAllBtn = document.getElementById("drum-clear-all-btn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", function () {
        for (let i = 1; i <= NUM_DRUMS; i++) {
          drumSamples[i] = null;
          drumSampleNames[i] = "";
        }
        // Update UI for all sample rows
        for (let i = 1; i <= NUM_DRUMS; i++) {
          const nameElem = document.getElementById(`sample-name-${i}`);
          if (nameElem) nameElem.textContent = "";
          const fileInput = document.getElementById(`sample-${i}`);
          if (fileInput) fileInput.value = "";
          const playBtn = document.getElementById(`play-${i}`);
          if (playBtn) playBtn.disabled = true;
          const clearBtn = document.getElementById(`clear-${i}`);
          if (clearBtn) clearBtn.disabled = true;
          const advBtn = document.getElementById(`adv-${i}`);
          if (advBtn) {
            advBtn.disabled = true;
            advBtn.classList.remove('active', 'show', 'focus', 'btn-dark', 'btn-primary', 'btn-secondary', 'btn-outline-secondary', 'btn-outline-primary', 'btn-outline-dark');
            advBtn.classList.add('btn-outline-secondary'); // Restore default style
            advBtn.blur(); // Remove focus highlight if present
            // Remove tabindex and aria-pressed if present
            advBtn.removeAttribute('tabindex');
            advBtn.removeAttribute('aria-pressed');
          }
        }
        // Reset the clear all button's own state
        clearAllBtn.classList.remove('active', 'show', 'focus', 'btn-dark', 'btn-primary', 'btn-secondary');
        clearAllBtn.blur(); // Remove focus highlight
        clearAllBtn.removeAttribute('tabindex');
        clearAllBtn.removeAttribute('aria-pressed');
        
        updateDrumPatchSize().catch(err => console.warn('Patch size update failed:', err));
        // Optionally, disable generate button if you have one
        const genBtn = document.querySelector('.section-block button.accent-btn');
        if (genBtn) genBtn.disabled = true;
      });
    }
  }

  initDrumClearAllButton();

  // Initialize drum import settings functionality
  initializeDrumImportSettings();
});

// Ensure search buttons open the correct file input for each drum row
function setupDrumSampleSearchButtons() {
  // There are 24 drum rows (1-based index)
  for (let i = 1; i <= 24; i++) {
    const searchBtn = document.getElementById(`search-${i}`);
    const fileInput = document.getElementById(`sample-${i}`);
    if (searchBtn && fileInput) {
      searchBtn.addEventListener('click', function (e) {
        e.preventDefault();
        fileInput.click();
      });
    }
  }
}

// Call this after DOMContentLoaded or when drum rows are rendered
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDrumSampleSearchButtons);
} else {
  setupDrumSampleSearchButtons();
}

// == Drum Tool UI Functions ==

// Add mouse-only pressed style for octave up/down keys
function setOctaveKbdMouseActive() {
  document.querySelectorAll(".octave-kbd").forEach(function (el) {
    el.addEventListener("mousedown", function () {
      el.classList.add("mouse-active");
    });
    el.addEventListener("mouseup", function () {
      el.classList.remove("mouse-active");
    });
    el.addEventListener("mouseleave", function () {
      el.classList.remove("mouse-active");
    });
  });

  // Keyboard pressed visual feedback for octave up/down
  document.addEventListener("keydown", function (e) {
    if (e.repeat) return;
    
    // Check if user is typing in an input field, textarea, or contenteditable element
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true' ||
      activeElement.isContentEditable
    );
    
       
    // Don't trigger visual feedback if user is typing
    if (isTyping) {
      return;
    }
    
    if (e.key === "z" || e.key === "Z") {
      var zKey = document.querySelector(".octave-kbd .osk-letter");
      if (zKey && zKey.textContent.trim().toLowerCase() === "z") {
        zKey.parentElement.classList.add("kbd-pressed");
      }
    }
    if (e.key === "x" || e.key === "X") {
      var xKey = document.querySelectorAll(".octave-kbd .osk-letter");
      xKey.forEach(function (el) {
        if (el.textContent.trim().toLowerCase() === "x") {
          el.parentElement.classList.add("kbd-pressed");
        }
      });
    }
  });

  document.addEventListener("keyup", function (e) {
    // Check if user is typing in an input field, textarea, or contenteditable element
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true' ||
      activeElement.isContentEditable
    );
    
    // Don't trigger visual feedback if user is typing
    if (isTyping) {
      return;
    }
    
    if (e.key === "z" || e.key === "Z") {
      var zKey = document.querySelector(".octave-kbd .osk-letter");
      if (zKey && zKey.textContent.trim().toLowerCase() === "z") {
        zKey.parentElement.classList.remove("kbd-pressed");
      }
    }
    if (e.key === "x" || e.key === "X") {
      var xKey = document.querySelectorAll(".octave-kbd .osk-letter");
      xKey.forEach(function (el) {
        if (el.textContent.trim().toLowerCase() === "x") {
          el.parentElement.classList.remove("kbd-pressed");
        }
      });
    }
  });
}

// Initialize drum tool UI on DOM ready
document.addEventListener("DOMContentLoaded", function () {
  setOctaveKbdMouseActive();
});

// --- Add drawBuffer function for min-max waveform drawing ---
function drawBuffer(width, height, context, buffer) {
  // Handle the new buffer structure
  const audioBuffer = buffer.audioBuffer || buffer;
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#ececec";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#333";
  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;
    for (let j = 0; j < step; j++) {
      const datum = data[i * step + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    context.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
  }
  
  // Draw center line
  context.strokeStyle = "#333";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, height / 2);
  context.lineTo(width, height / 2);
  context.stroke();
}

// Ensure all drum play/clear/advanced buttons are disabled on page load
document.addEventListener("DOMContentLoaded", function () {
  for (let i = 1; i <= 24; i++) {
    const playBtn = document.getElementById(`play-${i}`);
    const clearBtn = document.getElementById(`clear-${i}`);
    const advBtn = document.getElementById(`adv-${i}`);
    if (playBtn) playBtn.disabled = true;
    if (clearBtn) clearBtn.disabled = true;
    if (advBtn) advBtn.disabled = true;
  }

  // Initialize patch size display
  updateDrumPatchSize().catch(err => console.warn('Patch size update failed:', err));

  // Function to refresh all sample displays
  function refreshAllDrumSampleDisplays() {
    console.log('refreshAllDrumSampleDisplays called');
    for (let i = 1; i <= NUM_DRUMS; i++) {
      if (drumSamples[i]) {
        updateSampleUI(i);
      }
    }
    console.log('About to call updateDrumPatchSize');
    updateDrumPatchSize().catch(err => console.warn('Patch size update failed:', err));
  }

  // Add event listener for sample rate changes
  const sampleRateSelect = document.getElementById("sample-rate-drum");
  if (sampleRateSelect) {
    console.log('Adding sample rate event listener');
    sampleRateSelect.addEventListener("change", refreshAllDrumSampleDisplays);
  } else {
    console.log('Sample rate select not found');
  }

  // Add event listener for bit depth changes
  const bitDepthSelect = document.getElementById("bit-depth-drum");
  if (bitDepthSelect) {
    console.log('Adding bit depth event listener');
    bitDepthSelect.addEventListener("change", refreshAllDrumSampleDisplays);
  } else {
    console.log('Bit depth select not found');
  }

  // Add event listener for channels changes
  const channelsSelect = document.getElementById("channels-drum");
  if (channelsSelect) {
    console.log('Adding channels event listener');
    channelsSelect.addEventListener("change", refreshAllDrumSampleDisplays);
  } else {
    console.log('Channels select not found');
  }
});

// --- Responsive waveform canvas resize ---
window.addEventListener("resize", function () {
  // Modal waveform
  const modal = document.getElementById("advanced-modal");
  if (modal && modal.classList.contains("show")) {
    const waveformDiv = modal.querySelector("#waveform-container-modal");
    const canvas = waveformDiv && waveformDiv.querySelector("canvas");
    const sample = window.drumSamples && window.drumSamples[modal.dataset.sampleIndex];
    const buffer = sample && sample.audioBuffer;
    if (canvas && waveformDiv && buffer) {
      // Set canvas width to container's width
      const width = waveformDiv.offsetWidth || 300;
      const height = canvas.offsetHeight || 60;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      drawBuffer(width, height, ctx, buffer);
      // Redraw markers if needed
      if (typeof window.drawMarkers === "function") window.drawMarkers();
    }
  }
  // Zoom modal waveform
  const zoomModal = document.getElementById("zoom-modal");
  if (zoomModal && zoomModal.classList.contains("show")) {
    const canvas = zoomModal.querySelector("canvas");
    const buffer =
      window.drumSamples && window.drumSamples[zoomModal.dataset.sampleIndex];
    if (canvas && buffer) {
      const width = canvas.parentElement.offsetWidth || 300;
      const height = canvas.offsetHeight || 60;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      drawBuffer(width, height, ctx, buffer);
      // Redraw markers if needed
      if (typeof window.drawZoomMarkers === "function")
        window.drawZoomMarkers();
    }
  }
});

// Helper: Check if any drum samples are loaded
function anyDrumSamplesLoaded() {
  return drumSamples.some((s, i) => i > 0 && s);
}

// Helper: Update generate patch button enabled state
function updateGeneratePatchBtnState() {
  const btn = document.getElementById("generate-patch-btn");
  if (!btn) return;

    const hasSamples = anyDrumSamplesLoaded();
  const name = document.getElementById("patch-name-drum").value.trim();

  btn.disabled = !hasSamples || name.length === 0;
}

// Update on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateGeneratePatchBtnState);
} else {
  updateGeneratePatchBtnState();
}

// Patch: update on file input change and clearSample
for (let i = 1; i <= NUM_DRUMS; i++) {
  const fileInput = document.getElementById(`sample-${i}`);
  if (fileInput) {
    fileInput.addEventListener("change", updateGeneratePatchBtnState);
  }
}
const origClearSample = clearSample;
clearSample = function (idx) {
  origClearSample.apply(this, arguments);
  updateGeneratePatchBtnState();
};

// === Patch Size Tracking ===
let drumTotalPatchSize = 0;

async function updateDrumPatchSize() {
  // read user's dropdown selections
  const srDropdown = document.getElementById("sample-rate-drum");
  const bdDropdown = document.getElementById("bit-depth-drum");
  const chDropdown = document.getElementById("channels-drum");

  const selectedRate = srDropdown ? srDropdown.value : "0";
  const selectedDepth = bdDropdown ? bdDropdown.value : "keep";
  const selectedCh = chDropdown ? chDropdown.value : "keep";

  let total = 0;
  let sampleCount = 0;
  const sizePromises = [];
  
  // loop through all drum samples in your array
  for (const sample of drumSamples) {
    if (sample && sample.audioBuffer) {
      sizePromises.push(
        getActualConvertedSize(sample, selectedRate, selectedDepth, selectedCh)
      );
      sampleCount++;
    }
  }

  const results = await Promise.all(sizePromises);
  total = results.reduce((acc, val) => acc + val, 0);

  // optional overhead
  const overhead = 2048;
  total += overhead;

  // update the UI via helper
  updateDrumPatchSizeDisplay(total, sampleCount);
}

function updateDrumPatchSizeDisplay(totalBytes, sampleCount) {
  const currentSizeElement = document.getElementById("drum-current-patch-size");
  const progressBar = document.getElementById("drum-patch-size-progress");
  const statusElement = document.getElementById("drum-patch-size-status");

  if (!currentSizeElement || !progressBar || !statusElement) return;

  const sizeInMB = totalBytes / (1024 * 1024);
  const percentage = (sizeInMB / 8) * 100; // 8MB limit

  // Update display
  currentSizeElement.textContent = `${sizeInMB.toFixed(1)} MB`;
  progressBar.style.width = `${Math.min(percentage, 100)}%`;
  
  // Update status and styling
  if (percentage >= 90) {
    statusElement.textContent = "patch size too large - consider reducing sample rate, bit depth, or convert to mono";
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

// Function to convert a float to a 16-bit PCM sample
function floatTo16BitPCM(output, offset, input) {
  // ... existing code ...
}

// === Patch Summary Functions ===
function updateDrumPatchSummary() {
  const summaryDiv = document.getElementById('drum-patch-summary');
  const statsDiv = document.getElementById('drum-patch-stats');
  if (!summaryDiv || !statsDiv) return;

  // Count loaded samples
  const loadedSamples = drumSamples.filter((s, i) => i > 0 && s).length;
  if (loadedSamples === 0) {
    summaryDiv.style.display = 'none';
    return;
  }

  // Show the summary box
  summaryDiv.style.display = 'block';

  // Get current conversion settings
  const targetSampleRateOption = document.getElementById('sample-rate-drum')?.value || '0';
  const targetBitDepth = document.getElementById('bit-depth-drum')?.value || 'keep';
  const targetChannels = document.getElementById('channels-drum')?.value || 'keep';

  console.log('Channel settings:', {
    targetChannels,
    value: document.getElementById('channels-drum')?.value
  });

  // Map sample rate option to actual rate
  const sampleRateMap = {
    '0': null,  // keep original
    '1': 11025, // 11khz
    '2': 22050, // 22khz
    '3': 44100  // 44khz
  };
  const targetSampleRate = sampleRateMap[targetSampleRateOption];

  // Count conversions needed
  let sampleRateConversions = 0;
  let bitDepthConversions = 0;
  let channelConversions = 0;
  let originalSize = 0;
  let estimatedSize = 0;

  for (const sample of drumSamples) {
    if (!sample || !sample.audioBuffer) continue;

    console.log('Processing sample channels:', {
      originalChannels: sample.originalChannels,
      targetChannels: targetChannels
    });

    // Calculate original size
    const sampleSize = sample.fileSize || 0;
    originalSize += sampleSize;

    // Count needed conversions
    if (targetSampleRate && sample.originalSampleRate !== targetSampleRate) {
      sampleRateConversions++;
    }
    if (targetBitDepth !== 'keep' && sample.originalBitDepth !== parseInt(targetBitDepth)) {
      bitDepthConversions++;
    }
    if (targetChannels === 'mono' && sample.originalChannels === 2) {
      channelConversions++;
      console.log('Channel conversion needed: stereo to mono');
    }

    // Calculate estimated size after conversion
    let conversionRatio = 1;
    if (targetSampleRate) {
      conversionRatio *= targetSampleRate / sample.originalSampleRate;
    }
    if (targetBitDepth !== 'keep') {
      conversionRatio *= parseInt(targetBitDepth) / sample.originalBitDepth;
    }
    if (targetChannels === 'mono' && sample.originalChannels === 2) {
      conversionRatio *= 0.5; // Mono is half the size of stereo
    }
    estimatedSize += sampleSize * conversionRatio;
  }

  console.log('Conversion counts:', {
    sampleRateConversions,
    bitDepthConversions,
    channelConversions
  });

  // Calculate total percentage saved
  const percentageSaved = originalSize > 0 ? ((originalSize - estimatedSize) / originalSize * 100) : 0;

  // Build the stats text
  let statsText = `${loadedSamples} sample${loadedSamples !== 1 ? 's' : ''} loaded`;
  
  const totalConversions = sampleRateConversions + bitDepthConversions + channelConversions;
  if (totalConversions > 0) {
    statsText += ` • ${totalConversions} conversion${totalConversions !== 1 ? 's' : ''} needed`;
    if (percentageSaved > 0) {
      statsText += ` • ${Math.round(percentageSaved)}% size reduction`;
    } else if (percentageSaved < 0) {
      statsText += ` • ${Math.round(-percentageSaved)}% size increase`;
    }
  }

  console.log('Final stats:', {
    statsText,
    percentageSaved
  });

  statsDiv.textContent = statsText;
}

// Hook into existing functions to update the summary
const origUpdateDrumPatchSize = updateDrumPatchSize;
updateDrumPatchSize = async function() {
  await origUpdateDrumPatchSize.apply(this, arguments);
  updateDrumPatchSummary();
};

// Update summary when samples are loaded/cleared
const origLoadSample = loadSample;
loadSample = function(idx, file) {
  origLoadSample.apply(this, arguments);
  updateDrumPatchSummary();
};

const origClearSampleForSummary = clearSample;
clearSample = function(idx) {
  origClearSampleForSummary.apply(this, arguments);
  updateDrumPatchSummary();
};

// Add event listeners for conversion dropdowns
document.addEventListener('DOMContentLoaded', function() {
  const dropdowns = ['sample-rate-drum', 'bit-depth-drum', 'channels-drum'];
  dropdowns.forEach(id => {
    const dropdown = document.getElementById(id);
    if (dropdown) {
      dropdown.addEventListener('change', updateDrumPatchSummary);
    }
  });
  
  // Initial update
  updateDrumPatchSummary();
});

// Function to mark a sample row as edited
function markSampleAsEdited(sampleIndex) {
  console.log('Marking sample as edited:', sampleIndex);
  const sampleNameDiv = document.getElementById(`sample-name-${sampleIndex}`);
  console.log('Found sample name div:', sampleNameDiv);
  if (sampleNameDiv) {
    const row = sampleNameDiv.closest('tr');
    console.log('Found row:', row);
    if (row) {
      row.classList.add('sample-row-edited');
      console.log('Added edited class to row');
      console.log('Row classes after:', row.classList.toString());
    }
  }
}

// Function to reset edited state when sample is cleared
function resetSampleEditedState(sampleIndex) {
  console.log('Resetting sample edited state:', sampleIndex);
  const sampleNameDiv = document.getElementById(`sample-name-${sampleIndex}`);
  if (sampleNameDiv) {
    const row = sampleNameDiv.closest('tr');
    if (row) {
      row.classList.remove('sample-row-edited');
      console.log('Removed edited class from row');
      console.log('Row classes after:', row.classList.toString());
    }
  }
}

// Hook into existing functions to track edited state
const origUpdateSampleUI = updateSampleUI;
updateSampleUI = function(sampleIndex) {
  origUpdateSampleUI.apply(this, arguments);
  
  const sample = drumSamples[sampleIndex];
  if (!sample) {
    resetSampleEditedState(sampleIndex);
    return;
  }
  
  const targetBitDepth = document.getElementById('bit-depth-drum')?.value || 'keep';
  const targetSampleRateOption = document.getElementById('sample-rate-drum')?.value || '0';
  const targetChannels = document.getElementById('channels-drum')?.value || 'keep';
  
  console.log('Checking conversions for sample', sampleIndex, {
    targetBitDepth,
    targetSampleRateOption,
    targetChannels,
    originalBitDepth: sample.originalBitDepth,
    originalChannels: sample.originalChannels
  });
  
  // Check if any conversion settings are different from original
  const needsBitDepthConversion = targetBitDepth !== 'keep' && parseInt(targetBitDepth) !== sample.originalBitDepth;
  const needsSampleRateConversion = targetSampleRateOption !== '0';
  const needsChannelConversion = targetChannels === 'mono' && sample.originalChannels > 1;
  
  console.log('Conversion needed:', {
    needsBitDepthConversion,
    needsSampleRateConversion,
    needsChannelConversion
  });
  
  if (needsBitDepthConversion || needsSampleRateConversion || needsChannelConversion) {
    markSampleAsEdited(sampleIndex);
  } else {
    resetSampleEditedState(sampleIndex);
  }
};

// Hook into clear sample to reset edited state
const origClearSampleWithEdit = clearSample;
clearSample = function(idx) {
  resetSampleEditedState(idx);
  origClearSampleWithEdit.apply(this, arguments);
};

// Add event listeners for conversion dropdowns
document.addEventListener('DOMContentLoaded', function() {
  const dropdowns = ['sample-rate-drum', 'bit-depth-drum', 'channels-drum'];
  dropdowns.forEach(id => {
    const dropdown = document.getElementById(id);
    if (dropdown) {
      dropdown.addEventListener('change', function() {
        // Update all loaded samples
        drumSamples.forEach((sample, idx) => {
          if (sample) {
            updateSampleUI(idx);
          }
        });
      });
    }
  });
});
