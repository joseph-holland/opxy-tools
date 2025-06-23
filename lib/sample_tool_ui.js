// == Importing necessary libraries ==
// Import JSZip for zip file generation
if (typeof JSZip === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    document.head.appendChild(script);
}

// == Global Styles ==
// Add global slider styles to handle all browser-specific styling
document.addEventListener('DOMContentLoaded', function() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* Global slider styles for all modals */
    input[type=range] {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: #ddd;
      outline: none;
      -webkit-transition: .2s;
      transition: opacity .2s;
    }
    
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #222;
      cursor: pointer;
      border: none;
    }
    
    input[type=range]::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #222;
      cursor: pointer;
      border: none;
    }
    
    input[type=range]::-ms-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #222;
      cursor: pointer;
      border: none;
    }
    
    input[type=range]::-webkit-slider-runnable-track {
      width: 100%;
      height: 8px;
      cursor: pointer;
      background: #ddd;
      border-radius: 4px;
    }
    
    input[type=range]::-moz-range-track {
      width: 100%;
      height: 8px;
      cursor: pointer;
      background: #ddd;
      border-radius: 4px;
    }
    
    input[type=range]::-ms-track {
      width: 100%;
      height: 8px;
      cursor: pointer;
      background: transparent;
      border-color: transparent;
      color: transparent;
    }
    
    input[type=range]::-ms-fill-lower {
      background: #ddd;
      border-radius: 4px;
    }
    
    input[type=range]::-ms-fill-upper {
      background: #ddd;
      border-radius: 4px;
    }
    
    input[type=range]:focus {
      outline: none;
    }
    
    input[type=range]:focus::-webkit-slider-thumb {
      background: #222;
      box-shadow: 0 0 0 2px rgba(85,85,85,0.4);
    }
    
    input[type=range]:focus::-moz-range-thumb {
      background: #222;
      box-shadow: 0 0 0 2px rgba(85,85,85,0.4);
    }
    
    input[type=range]:focus::-ms-thumb {
      background: #222;
      box-shadow: 0 0 0 2px rgba(85,85,85,0.4);
    }
  `;
  document.head.appendChild(styleEl);
  
  // Example: update gain value display
  const gainSlider = document.getElementById('gain-slider');
  const gainValue = document.getElementById('gain-value');
  if (gainSlider && gainValue) {
      gainSlider.addEventListener('input', () => {
      gainValue.textContent = gainSlider.value;
      });
  }
});

// Drum key mapping for two octaves
const drumKeyMap = [
    // Lower octave (octave 0)
    {
    // top row (offset like a real keyboard)
    W: { label: 'KD2', idx: 2 },
    E: { label: 'SD2', idx: 4 },
    R: { label: 'CLP', idx: 6 },
    Y: { label: 'CH', idx: 10 },
    U: { label: 'OH', idx: 11 },
    // bottom row
    A: { label: 'KD1', idx: 1 },
    S: { label: 'SD1', idx: 3 },
    D: { label: 'RIM', idx: 5 },
    F: { label: 'TB', idx: 7 },
    G: { label: 'SH', idx: 8 },
    H: { label: 'CL', idx: 9 },
    J: { label: 'CAB', idx: 12 }
    },
    // Upper octave (octave 1)
    {
    // top row (offset like a real keyboard)
    W: { label: 'RC', idx: 13 },
    E: { label: 'CC', idx: 14 },
    R: { label: 'COW', idx: 16 },
    Y: { label: 'LC', idx: 19 },
    U: { label: 'HC', idx: 20 },
    // bottom row
    A: { label: 'LT', idx: 15 },
    S: { label: 'MT', idx: 17 },
    D: { label: 'HT', idx: 18 },
    F: { label: 'TRI', idx: 21 },
    G: { label: 'LT', idx: 22 },
    H: { label: 'WS', idx: 23 },
    J: { label: 'GUI', idx: 24 }
    }
];
let currentOctave = 0;

function updateKeyboardLabels() {
    const map = drumKeyMap[currentOctave];
    Object.entries(map).forEach(([key, { label }]) => {
    const wrapper = document.querySelector('.key-' + key.toLowerCase());
    if (wrapper) {
        let labelDiv = wrapper.querySelector('.small.text-muted');
        if (!labelDiv) {
        labelDiv = document.createElement('div');
        labelDiv.className = 'small text-muted';
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
document.querySelectorAll('.octave-controls .kbd').forEach((el) => {
    el.addEventListener('click', () => {
    if (el.textContent.trim().toUpperCase() === 'Z') setOctave(0);
    if (el.textContent.trim().toUpperCase() === 'X') setOctave(1);
    });
});

// === Drum Sample Loader & Playback Logic ===
const NUM_DRUMS = 24;
const drumSamples = new Array(NUM_DRUMS + 1).fill(null); // 1-based indexing
const drumSampleNames = new Array(NUM_DRUMS + 1).fill("");
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) audioCtx = new(window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function loadSample(idx, file) {
    const reader = new FileReader();
    reader.onload = function(e) {
    getAudioContext().decodeAudioData(e.target.result, (buffer) => {
        drumSamples[idx] = buffer;
        drumSampleNames[idx] = file.name;
        document.getElementById(`sample-name-${idx}`).textContent = file.name;
        document.getElementById(`play-${idx}`).disabled = false;
        document.getElementById(`clear-${idx}`).disabled = false;
    });
    };
    reader.readAsArrayBuffer(file);
}

function clearSample(idx) {
    drumSamples[idx] = null;
    drumSampleNames[idx] = "";
    document.getElementById(`sample-name-${idx}`).textContent = "";
    document.getElementById(`play-${idx}`).disabled = true;
    document.getElementById(`clear-${idx}`).disabled = true;
    document.getElementById(`sample-${idx}`).value = "";
    // Also reset advanced settings on the button
    const advancedBtn = document.querySelector(`.advanced-btn[data-sample-idx='${idx}']`);
    if (advancedBtn) {
    advancedBtn.dataset.playmode = 'oneshot';
    advancedBtn.dataset.reverse = 'false';
    advancedBtn.dataset.tune = '0';
    }
}

function playSample(idx) {
    if (!drumSamples[idx]) return;
    const ctx = getAudioContext();
    const src = ctx.createBufferSource();
    let buffer = drumSamples[idx];

    // Get advanced settings from the button
    const advancedBtn = document.querySelector(`.advanced-btn[data-sample-idx='${idx}']`);
    const isReverse = advancedBtn && advancedBtn.dataset.reverse === 'true';
    let semitones = 0;
    if (advancedBtn && advancedBtn.dataset.tune) {
        semitones = parseInt(advancedBtn.dataset.tune, 10) || 0;
    }
    // === Apply waveform start/end selection ===
    let sampleStart = 0;
    let sampleEnd = buffer.length;
    if (advancedBtn) {
        if (advancedBtn.dataset.sampleStart) {
            sampleStart = Math.max(0, Math.min(parseInt(advancedBtn.dataset.sampleStart, 10) || 0, buffer.length - 1));
        }
        if (advancedBtn.dataset.sampleEnd) {
            sampleEnd = Math.max(sampleStart + 1, Math.min(parseInt(advancedBtn.dataset.sampleEnd, 10) || buffer.length, buffer.length));
        }
    }
    // If selection is not the full buffer, create a new buffer for the selection
    if (sampleStart !== 0 || sampleEnd !== buffer.length) {
        const selectionLength = sampleEnd - sampleStart;
        const selectionBuffer = ctx.createBuffer(buffer.numberOfChannels, selectionLength, buffer.sampleRate);
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
        const revBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
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
    // Map -100..100 to -1..1
    const panNode = ctx.createStereoPanner();
    panNode.pan.value = Math.max(-1, Math.min(1, panValue / 100));
    src.connect(panNode).connect(ctx.destination);
    src.start(0);
}

function playSampleSlice(idx, startFrame, endFrame, panValue) {
    if (!drumSamples[idx]) return;
    const ctx = getAudioContext();
    const src = ctx.createBufferSource();
    let buffer = drumSamples[idx];
    const selectionLength = endFrame - startFrame;
    if (selectionLength <= 0) return;
    const selectionBuffer = ctx.createBuffer(buffer.numberOfChannels, selectionLength, buffer.sampleRate);
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
    if (typeof panValue !== 'undefined') {
        finalPanValue = panValue;
    } else {
        const advancedBtn = document.querySelector(`.advanced-btn[data-sample-idx='${idx}']`);
        if (advancedBtn && advancedBtn.dataset.pan) {
            finalPanValue = parseInt(advancedBtn.dataset.pan, 10) || 0;
        }
    }
    const panNode = ctx.createStereoPanner();
    panNode.pan.value = Math.max(-1, Math.min(1, finalPanValue / 100));
    src.connect(panNode).connect(ctx.destination);
    src.start(0);
}

// Wire up file inputs, play, clear, and advanced settings buttons
const hiHatLabels = ['closed hi-hat', 'open hi-hat', 'ch', 'oh', 'hh', 'hat'];
for (let i = 1; i <= NUM_DRUMS; i++) {
    const fileInput = document.getElementById(`sample-${i}`);
    const playBtn = document.getElementById(`play-${i}`);
    const clearBtn = document.getElementById(`clear-${i}`);
    const advancedBtn = document.querySelector(`.advanced-btn[data-sample-idx='${i}']`);
    const label = fileInput?.previousElementSibling;
    const row = advancedBtn?.closest('tr');

    if (fileInput) {
    if (label && label.tagName === 'LABEL') {
        label.addEventListener('click', () => fileInput.click());
    }
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
        loadSample(i, e.target.files[0]);
        }
    });
    }
    if (playBtn) playBtn.addEventListener('click', () => playSample(i));
    if (clearBtn) clearBtn.addEventListener('click', () => clearSample(i));

    if (advancedBtn) {
    // Initialize data attributes and set defaults
    const drumLabel = row?.children[0]?.textContent?.toLowerCase() || '';
    if (hiHatLabels.some(hh => drumLabel.includes(hh))) {
        advancedBtn.dataset.playmode = 'group';
    } else {
        advancedBtn.dataset.playmode = 'oneshot';
    }
    advancedBtn.dataset.reverse = 'false';
    advancedBtn.dataset.tune = '0';

    advancedBtn.addEventListener('click', function() {
        const advancedBtn = this;
        const sampleIndex = i;
        const buffer = drumSamples[sampleIndex];

        // Create a temporary state object to hold changes
        const tempSettings = {
            playmode: advancedBtn.dataset.playmode || 'oneshot',
            isReverse: advancedBtn.dataset.reverse === 'true',
            tune: parseInt(advancedBtn.dataset.tune, 10) || 0,
            pan: parseInt(advancedBtn.dataset.pan, 10) || 0,
            sampleStart: parseInt(advancedBtn.dataset.sampleStart, 10),
            sampleEnd: parseInt(advancedBtn.dataset.sampleEnd, 10)
        };

        if (buffer) {
            if (isNaN(tempSettings.sampleStart)) tempSettings.sampleStart = 0;
            if (isNaN(tempSettings.sampleEnd) || tempSettings.sampleEnd <= 0) tempSettings.sampleEnd = buffer.length;
        } else {
            if (isNaN(tempSettings.sampleStart)) tempSettings.sampleStart = 0;
            if (isNaN(tempSettings.sampleEnd)) tempSettings.sampleEnd = 0;
        }

        let modal = document.getElementById('advanced-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'advanced-modal';
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Advanced Settings</h5>
                <button type="button" class="btn-close adv-cancel"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                <label class="form-label">Playmode:</label>
                <select class="form-select form-select-sm adv-playmode">
                    <option value="oneshot" ${tempSettings.playmode === 'oneshot' ? 'selected' : ''}>Oneshot</option>
                    <option value="group" ${tempSettings.playmode === 'group' ? 'selected' : ''}>Group</option>
                    <option value="loop" ${tempSettings.playmode === 'loop' ? 'selected' : ''}>Loop</option>
                    <option value="gate" ${tempSettings.playmode === 'gate' ? 'selected' : ''}>Gate</option>
                </select>
                </div>
                <div class="mb-3">
                <label class="form-label">Direction:</label>
                <div>
                    <button type="button" class="btn btn-secondary btn-sm adv-reverse" style="background:#444;color:#fff;border:none;">
                    <i class="fa fa-play" style="transform:${tempSettings.isReverse ? 'scaleX(-1)' : ''}"></i>
                    <span class="adv-reverse-label ms-2">${tempSettings.isReverse ? 'Reverse' : 'Normal'}</span>
                    </button>
                </div>
                </div>
                <div class="mb-3">
                <label class="form-label">Tuning (semitones):</label>
                <input type="range" class="form-range adv-tune-slider" min="-48" max="48" value="${tempSettings.tune}" step="1" style="accent-color:#222;background:#fff;width:100%;height:2.2em;border-radius:8px;outline:none;box-shadow:none;">
                <style>
                  .adv-tune-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #222;
                    cursor: pointer;
                  }
                  .adv-tune-slider::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #222;
                    cursor: pointer;
                    border: none;
                  }
                  .adv-tune-slider::-ms-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #222;
                    cursor: pointer;
                  }
                  .adv-tune-slider::-webkit-slider-runnable-track {
                    background: #ddd;
                    height: 8px;
                    border-radius: 4px;
                  }
                  .adv-tune-slider::-moz-range-track {
                    background: #ddd;
                    height: 8px;
                    border-radius: 4px;
                  }
                  .adv-tune-slider:focus {
                    outline: none;
                  }
                </style>
                <input type="number" class="form-control form-control-sm adv-tune" min="-48" max="48" value="${tempSettings.tune}">
                </div>
                <div class="mb-3">
                <label class="form-label">Pan:</label>
                <input type="range" id="advancedPanSlider" class="form-range" min="-100" max="100" value="${tempSettings.pan}" step="1" style="accent-color:#222;background:#fff;width:100%;height:2.2em;border-radius:8px;outline:none;box-shadow:none;">
                <style>
                  #advancedPanSlider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #222;
                    cursor: pointer;
                  }
                  #advancedPanSlider::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #222;
                    cursor: pointer;
                    border: none;
                  }
                  #advancedPanSlider::-ms-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #222;
                    cursor: pointer;
                  }
                  #advancedPanSlider::-webkit-slider-runnable-track {
                    background: #ddd;
                    height: 8px;
                    border-radius: 4px;
                  }
                  #advancedPanSlider::-moz-range-track {
                    background: #ddd;
                    height: 8px;
                    border-radius: 4px;
                  }
                  #advancedPanSlider:focus {
                    outline: none;
                  }
                </style>
                <input type="number" id="advancedPanNumber" class="form-control form-control-sm" min="-100" max="100" value="${tempSettings.pan}" step="1">
                </div>
                <div class="mb-3">
                <label class="form-label">Sample Editor:</label>
                <button type="button" class="btn btn-secondary btn-sm ms-2" id="zoom-btn" style="background:#444;color:#fff;border:none;"><i class="fa fa-search-plus"></i> Zoom</button>
                <div id="waveform-container-modal" style="height:60px;width:100%;background:#ececec;position:relative;"></div>
                <div class="d-flex align-items-center mt-2">
                    <label class="me-2">Start</label>
                    <input type="number" class="form-control form-control-sm adv-sample-start" min="0" value="${tempSettings.sampleStart}" style="width:80px;">
                    <label class="mx-2">End</label>
                    <input type="number" class="form-control form-control-sm adv-sample-end" min="0" value="${tempSettings.sampleEnd}" style="width:80px;">
                    <span class="ms-2 small text-muted adv-sample-length"></span>
                </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-sm adv-cancel" style="background:#888;color:#fff;border:none;">Cancel</button>
                <button type="button" class="btn btn-secondary btn-sm adv-play-modal" style="background:#222;color:#fff;border:none;"><i class="fa fa-play"></i> Play</button>
                <button type="button" class="btn btn-dark btn-sm adv-save" style="background:#000;color:#fff;border:none;">Save</button>
            </div>
            </div>
        </div>
        `;
        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        modal.querySelectorAll('.adv-cancel').forEach(el => el.onclick = closeModal);

        modal.querySelector('.adv-save').onclick = () => {
            const btnToUpdate = document.querySelector(`.advanced-btn[data-sample-idx='${sampleIndex}']`);
            if (btnToUpdate) {
                btnToUpdate.dataset.playmode = tempSettings.playmode;
                btnToUpdate.dataset.reverse = tempSettings.isReverse.toString();
                btnToUpdate.dataset.tune = tempSettings.tune;
                btnToUpdate.dataset.pan = tempSettings.pan;
                btnToUpdate.dataset.sampleStart = tempSettings.sampleStart;
                btnToUpdate.dataset.sampleEnd = tempSettings.sampleEnd;
            }
            closeModal();
        };

        modal.querySelector('.adv-playmode').onchange = function() {
            tempSettings.playmode = this.value;
        };

        modal.querySelector('.adv-reverse').onclick = function() {
            const icon = this.querySelector('i');
            const label = this.querySelector('.adv-reverse-label');
            tempSettings.isReverse = !tempSettings.isReverse;
            if (tempSettings.isReverse) {
                icon.style.transform = 'scaleX(-1)';
                label.textContent = 'Reverse';
            } else {
                icon.style.transform = '';
                label.textContent = 'Normal';
            }
            // Play audio after direction change (debounced)
            if (window.zoomPlayTimeout) clearTimeout(window.zoomPlayTimeout);
            window.zoomPlayTimeout = setTimeout(() => {
                modal.querySelector('.adv-play-modal').click();
            }, 80);
        };

        modal.querySelector('#advancedPanSlider').oninput = function() {
            modal.querySelector('#advancedPanNumber').value = this.value;
            tempSettings.pan = parseInt(this.value, 10);
            // Play audio after pan change (debounced)
            if (window.zoomPlayTimeout) clearTimeout(window.zoomPlayTimeout);
            window.zoomPlayTimeout = setTimeout(() => {
                modal.querySelector('.adv-play-modal').click();
            }, 80);
        };
        modal.querySelector('#advancedPanNumber').oninput = function() {
            modal.querySelector('#advancedPanSlider').value = this.value;
            tempSettings.pan = parseInt(this.value, 10);
            // Play audio after pan change (debounced)
            if (window.zoomPlayTimeout) clearTimeout(window.zoomPlayTimeout);
            window.zoomPlayTimeout = setTimeout(() => {
                modal.querySelector('.adv-play-modal').click();
            }, 80);
        };

        modal.querySelector('.adv-tune-slider').oninput = function() {
            modal.querySelector('.adv-tune').value = this.value;
            tempSettings.tune = parseInt(this.value, 10);
            // Play audio after tune change (debounced)
            if (window.zoomPlayTimeout) clearTimeout(window.zoomPlayTimeout);
            window.zoomPlayTimeout = setTimeout(() => {
                modal.querySelector('.adv-play-modal').click();
            }, 80);
        };
        modal.querySelector('.adv-tune').oninput = function() {
            let val = parseInt(this.value, 10) || 0;
            val = Math.max(-48, Math.min(48, val));
            this.value = val;
            modal.querySelector('.adv-tune-slider').value = val;
            tempSettings.tune = val;
            // Play audio after tune change (debounced)
            if (window.zoomPlayTimeout) clearTimeout(window.zoomPlayTimeout);
            window.zoomPlayTimeout = setTimeout(() => {
                modal.querySelector('.adv-play-modal').click();
            }, 80);
        };

        modal.querySelector('#zoom-btn').addEventListener('click', () => {
            const startPoint = modal.querySelector('.adv-sample-start').value;
            const endPoint = modal.querySelector('.adv-sample-end').value;

            const zoomModal = new bootstrap.Modal(document.getElementById('zoom-modal'));
            const zoomModalElement = document.getElementById('zoom-modal');

            zoomModalElement.dataset.sampleIndex = sampleIndex;
            document.getElementById('zoom-start-point').value = startPoint;
            document.getElementById('zoom-end-point').value = endPoint;

            modal.style.display = 'none';
            zoomModal.show();
        });

        const zoomModalElement = document.getElementById('zoom-modal');
        zoomModalElement.addEventListener('hidden.bs.modal', () => {
            const advancedModal = document.getElementById('advanced-modal');
            if (advancedModal) {
                advancedModal.style.display = 'block';
                // Update temp settings from the zoom modal's inputs
                tempSettings.sampleStart = parseInt(advancedModal.querySelector('.adv-sample-start').value, 10);
                tempSettings.sampleEnd = parseInt(advancedModal.querySelector('.adv-sample-end').value, 10);

                if (typeof advancedModal.drawMarkers === 'function') {
                    advancedModal.drawMarkers();
                }
            }
        });

        zoomModalElement.addEventListener('shown.bs.modal', () => {
            const sampleIndex = zoomModalElement.dataset.sampleIndex;
            const buffer = drumSamples[sampleIndex];
            if (!buffer) return;

            const canvas = document.getElementById('zoom-canvas');
            const startInput = document.getElementById('zoom-start-point');
            const endInput = document.getElementById('zoom-end-point');
            const width = canvas.width;
            const height = canvas.height;
            const ctx = canvas.getContext('2d');
            const data = buffer.getChannelData(0);

            let startFrame = parseInt(startInput.value, 10);
            let endFrame = parseInt(endInput.value, 10);

            function drawZoomWaveform() {
                ctx.clearRect(0, 0, width, height);
                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(0, 0, width, height);
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.beginPath();

                const step = Math.ceil(data.length / width);
                const amp = height / 2;
                ctx.moveTo(0, amp);

                for (let x = 0; x < width; x++) {
                    const start = x * step;
                    const end = Math.min((x + 1) * step, data.length);
                    const samples = data.slice(start, end);
                    const avg = samples.length ? samples.reduce((sum, v) => sum + v, 0) / samples.length : 0;
                    ctx.lineTo(x, amp + avg * amp);
                }
                ctx.stroke();
            }

            // In the zoom modal, update marker colors to greyscale
            function drawZoomMarkers() {
                const startX = (startFrame / data.length) * width;
                const endX = (endFrame / data.length) * width;

                // Start marker (dark gray)
                ctx.save();
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(startX, 0);
                ctx.lineTo(startX, height);
                ctx.stroke();
                ctx.fillStyle = '#222';
                ctx.beginPath();
                ctx.arc(startX, height - 7, 7, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();

                // End marker (light gray)
                ctx.save();
                ctx.strokeStyle = '#aaa';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(endX, 0);
                ctx.lineTo(endX, height);
                ctx.stroke();
                ctx.fillStyle = '#aaa';
                ctx.beginPath();
                ctx.arc(endX, height - 7, 7, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
            }

            function updateZoomWaveformAndMarkers() {
                drawZoomWaveform();
                drawZoomMarkers();
            }

            updateZoomWaveformAndMarkers();

            let dragging = null;

            canvas.addEventListener('mousedown', (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const startX = (startFrame / data.length) * width;
                const endX = (endFrame / data.length) * width;

                if (Math.abs(x - startX) < 5) {
                    dragging = 'start';
                } else if (Math.abs(x - endX) < 5) {
                    dragging = 'end';
                }
            });

            canvas.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const frame = Math.round((x / width) * data.length);

                if (dragging === 'start') {
                    startFrame = Math.max(0, Math.min(frame, endFrame - 1));
                    startInput.value = startFrame;
                } else if (dragging === 'end') {
                    endFrame = Math.max(startFrame + 1, Math.min(frame, data.length));
                    endInput.value = endFrame;
                }
                updateZoomWaveformAndMarkers();
                // Play audio after marker move (debounced)
                if (window.zoomPlayTimeout) clearTimeout(window.zoomPlayTimeout);
                window.zoomPlayTimeout = setTimeout(() => {
                    playSampleSlice(sampleIndex, parseInt(startInput.value, 10), parseInt(endInput.value, 10), tempSettings.pan);
                }, 80);
            });

            canvas.addEventListener('mouseup', () => {
                dragging = null;
            });
             canvas.addEventListener('mouseleave', () => {
                dragging = null;
            });

            document.getElementById('zoom-play-button').onclick = () => {
                const sampleIndex = zoomModalElement.dataset.sampleIndex;
                const startFrame = parseInt(document.getElementById('zoom-start-point').value, 10);
                const endFrame = parseInt(document.getElementById('zoom-end-point').value, 10);
                playSampleSlice(sampleIndex, startFrame, endFrame, tempSettings.pan);
            };

            document.getElementById('zoom-save-button').onclick = () => {
                const startFrame = document.getElementById('zoom-start-point').value;
                const endFrame = document.getElementById('zoom-end-point').value;

                // Update tempSettings
                tempSettings.sampleStart = parseInt(startFrame, 10);
                tempSettings.sampleEnd = parseInt(endFrame, 10);

                // Also update the inputs in the (currently hidden) advanced modal if it exists
                const advancedModal = document.getElementById('advanced-modal');
                if (advancedModal) {
                    advancedModal.querySelector('.adv-sample-start').value = startFrame;
                    advancedModal.querySelector('.adv-sample-end').value = endFrame;
                }

                const zoomModal = bootstrap.Modal.getInstance(zoomModalElement);
                zoomModal.hide();
            };
        });

        // Sample Editor logic
        const waveformDiv = modal.querySelector('#waveform-container-modal');
        const startInput = modal.querySelector('.adv-sample-start');
        const endInput = modal.querySelector('.adv-sample-end');
        const lengthLabel = modal.querySelector('.adv-sample-length');
        if (buffer) {
        // Draw waveform (simple, mono only)
        const width = waveformDiv.offsetWidth || 300;
        const height = 60;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        waveformDiv.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ececec';
        ctx.fillRect(0, 0, width, height);
        // Draw continuous line waveform
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const data = buffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;
        // Start path at the first point
        let firstAvg = 0;
        if (step > 0) {
            const firstSamples = data.slice(0, step);
            firstAvg = firstSamples.reduce((sum, v) => sum + v, 0) / firstSamples.length;
        }
        ctx.moveTo(0, amp + firstAvg * amp);
        for (let x = 1; x < width; x++) {
            const start = x * step;
            const end = Math.min((x + 1) * step, data.length);
            const samples = data.slice(start, end);
            const avg = samples.length ? samples.reduce((sum, v) => sum + v, 0) / samples.length : 0;
            ctx.lineTo(x, amp + avg * amp);
        }
        ctx.stroke();
        // Markers
        let startFrame = tempSettings.sampleStart;
        let endFrame = tempSettings.sampleEnd;
        if (isNaN(startFrame)) startFrame = 0;
        if (isNaN(endFrame) || endFrame <= 0) endFrame = data.length;
        startInput.value = startFrame;
        endInput.value = endFrame;
        lengthLabel.textContent = `/ ${data.length} frames`;
        // Draw marker lines
        function drawMarkers() {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#ececec';
            ctx.fillRect(0, 0, width, height);
            // Draw continuous line waveform
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            let firstAvg = 0;
            if (step > 0) {
            const firstSamples = data.slice(0, step);
            firstAvg = firstSamples.reduce((sum, v) => sum + v, 0) / firstSamples.length;
            }
            ctx.moveTo(0, amp + firstAvg * amp);
            for (let x = 1; x < width; x++) {
            const start = x * step;
            const end = Math.min((x + 1) * step, data.length);
            const samples = data.slice(start, end);
            const avg = samples.length ? samples.reduce((sum, v) => sum + v, 0) / samples.length : 0;
            ctx.lineTo(x, amp + avg * amp);
            }
            ctx.stroke();
            // Start marker (dark gray)
            ctx.save();
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 3;
            ctx.beginPath();
            const sx = Math.floor((startInput.value / data.length) * width);
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, height);
            ctx.stroke();
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(sx, height - 7, 7, 0, 2*Math.PI);
            ctx.fill();
            ctx.restore();
            // End marker (light gray)
            ctx.save();
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 3;
            ctx.beginPath();
            const ex = Math.floor((endInput.value / data.length) * width);
            ctx.moveTo(ex, 0);
            ctx.lineTo(ex, height);
            ctx.stroke();
            ctx.fillStyle = '#aaa';
            ctx.beginPath();
            ctx.arc(ex, height - 7, 7, 0, 2*Math.PI);
            ctx.fill();
            ctx.restore();
        }
        drawMarkers();

        let playTimeout;
        startInput.oninput = endInput.oninput = function() {
            const MIN_DISTANCE = 10;
            function clampMarkers() {
            let s = Math.max(0, Math.min(parseInt(startInput.value, 10) || 0, data.length-1));
            let e = Math.max(s+MIN_DISTANCE, Math.min(parseInt(endInput.value, 10) || data.length, data.length));
            startInput.value = s;
            endInput.value = e;
            }
            clampMarkers();
            drawMarkers();
            tempSettings.sampleStart = parseInt(startInput.value, 10);
            tempSettings.sampleEnd = parseInt(endInput.value, 10);
            if (playTimeout) clearTimeout(playTimeout);
            playTimeout = setTimeout(() => {
                modal.querySelector('.adv-play-modal').click();
            }, 80);
        };
        // --- FIXED DRAG LOGIC ---
        let draggingMarker = null;
        let dragMoveHandler = null;
        let dragUpHandler = null;
        canvas.addEventListener('mousedown', function(e) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const sx = Math.floor((startInput.value / data.length) * width);
            const ex = Math.floor((endInput.value / data.length) * width);
            if (Math.abs(x - sx) < 12) {
            draggingMarker = 'start';
            } else if (Math.abs(x - ex) < 12) {
            draggingMarker = 'end';
            } else {
            if (Math.abs(x - sx) < Math.abs(x - ex)) {
                startInput.value = Math.max(0, Math.min(Math.round((x / width) * data.length), data.length-1));
                tempSettings.sampleStart = parseInt(startInput.value, 10);
            } else {
                endInput.value = Math.max(parseInt(startInput.value,10)+10, Math.min(Math.round((x / width) * data.length), data.length));
                tempSettings.sampleEnd = parseInt(endInput.value, 10);
            }
            drawMarkers();
            if (playTimeout) clearTimeout(playTimeout);
            playTimeout = setTimeout(() => modal.querySelector('.adv-play-modal').click(), 80);
            draggingMarker = null;
            return;
            }
            // Attach move and up listeners only when dragging
            dragMoveHandler = function(e) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const frame = Math.round((x / width) * data.length);

                if (draggingMarker === 'start') {
                    startInput.value = Math.max(0, Math.min(frame, endFrame - 1));
                    tempSettings.sampleStart = parseInt(startInput.value, 10);
                } else if (draggingMarker === 'end') {
                    endInput.value = Math.max(startFrame + 1, Math.min(frame, data.length));
                    tempSettings.sampleEnd = parseInt(endInput.value, 10);
                }
                drawMarkers();
                if (playTimeout) clearTimeout(playTimeout);
                playTimeout = setTimeout(() => modal.querySelector('.adv-play-modal').click(), 80);
            };
            dragUpHandler = function() {
                draggingMarker = null;
                window.removeEventListener('mousemove', dragMoveHandler);
                window.removeEventListener('mouseup', dragUpHandler);
            };
            window.addEventListener('mousemove', dragMoveHandler);
            window.addEventListener('mouseup', dragUpHandler);
        });
        } else {
        waveformDiv.innerHTML = '<div class="text-muted small">No sample loaded</div>';
        startInput.value = 0;
        endInput.value = 0;
        lengthLabel.textContent = '';
        }

        // === FIX: Attach play button handler here, in correct scope ===
        modal.querySelector('.adv-play-modal').onclick = () => {
            if (!buffer) return;
            const ctx = getAudioContext();
            const src = ctx.createBufferSource();
            let playBuffer = buffer;

            // Get modal settings from tempSettings
            let sampleStart = tempSettings.sampleStart;
            let sampleEnd = tempSettings.sampleEnd;

            sampleStart = Math.max(0, Math.min(sampleStart, buffer.length - 1));
            sampleEnd = Math.max(sampleStart + 1, Math.min(sampleEnd, buffer.length));

            if (sampleStart !== 0 || sampleEnd !== buffer.length) {
                const selectionLength = sampleEnd - sampleStart;
                const selectionBuffer = ctx.createBuffer(buffer.numberOfChannels, selectionLength, buffer.sampleRate);
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
                const revBuffer = ctx.createBuffer(playBuffer.numberOfChannels, playBuffer.length, playBuffer.sampleRate);
                for (let ch = 0; ch < playBuffer.numberOfChannels; ch++) {
                    const srcData = playBuffer.getChannelData(ch);
                    const dstData = revBuffer.getChannelData(ch);
                    for (let j = 0, k = srcData.length - 1; j < srcData.length; j++, k--) {
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
            src.connect(panNode).connect(ctx.destination);

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

document.addEventListener('keydown', (e) => {
    if (document.getElementById('drum-tab').classList.contains('active')) {
    const key = e.key.toUpperCase();
    let octaveSwitched = false;
    if (key === 'Z') {
        currentOctave = 0;
        updateKeyboardLabels();
        octaveSwitched = true;
    }
    if (key === 'X') {
        currentOctave = 1;
        updateKeyboardLabels();
        octaveSwitched = true;
    }
    if (!octaveSwitched) {
        const idx = getDrumIdxForKey(key);
        if (idx && drumSamples[idx]) {
        playSample(idx);
        }
        const keyEl = Array.from(document.querySelectorAll('#drum .kbd')).find(
        k => k.textContent.trim().toUpperCase() === key
        );
        if (keyEl) keyEl.classList.add('kbd-pressed');
    }
    }
});
document.addEventListener('keyup', (e) => {
    if (document.getElementById('drum-tab').classList.contains('active')) {
    const key = e.key.toUpperCase();
    const keyEl = Array.from(document.querySelectorAll('#drum .kbd')).find(
        k => k.textContent.trim().toUpperCase() === key
    );
    if (keyEl) keyEl.classList.remove('kbd-pressed');
    }
});

// === Drum Patch Generation (Generate Patch Button) ===
const drumGenerateBtn = Array.from(document.querySelectorAll('#drum .accent-btn')).find(btn => btn.textContent.includes('Generate Patch'));
if (drumGenerateBtn) {
    drumGenerateBtn.addEventListener('click', async () => {
    const presetName = document.getElementById('preset-name-drum').value || 'Drums';
    const sampleRateIdx = document.getElementById('sample-rate-drum').selectedIndex;
    const targetSampleRate = [null, 11025, 22050, 44100][sampleRateIdx];
    const zip = new JSZip();
    const patchJson = { name: presetName, regions: [] };
    const fileReadPromises = [];

    for (let i = 1; i <= NUM_DRUMS; i++) {
        if (drumSamples[i]) {
        const fileInput = document.getElementById(`sample-${i}`);
        const file = fileInput && fileInput.files && fileInput.files[0];
        if (file) {
            let outputName = sanitizeName(file.name);
            let sampleRate = drumSamples[i].sampleRate || 44100;
            let duration = drumSamples[i].duration;

            const advancedBtn = document.querySelector(`.advanced-btn[data-sample-idx='${i}']`);
            const playmode = advancedBtn ? (advancedBtn.dataset.playmode || 'oneshot') : 'oneshot';
            const reverse = advancedBtn && advancedBtn.dataset.reverse === 'true';
            let tune = 0;
            if (advancedBtn && advancedBtn.dataset.tune) {
            tune = parseInt(advancedBtn.dataset.tune, 10) || 0;
            }
            let pan = 0;
            if (advancedBtn && advancedBtn.dataset.pan) {
            pan = parseInt(advancedBtn.dataset.pan, 10) || 0;
            }

            const region = {
            idx: i,
            sample: outputName,
            playmode: playmode,
            reverse: reverse,
            tune: tune,
            pan: pan,
            };
            if (advancedBtn && advancedBtn.dataset.sampleStart) region['sample.start'] = parseInt(advancedBtn.dataset.sampleStart,10)||0;
            if (advancedBtn && advancedBtn.dataset.sampleEnd) region['sample.end'] = parseInt(advancedBtn.dataset.sampleEnd,10)||0;

            if (targetSampleRate && sampleRate !== targetSampleRate) {
            fileReadPromises.push(
                resampleAudio(file, targetSampleRate).then(wavBlob => {
                zip.file(outputName, wavBlob);
                region.framecount = Math.floor(duration * targetSampleRate);
                region.sampleRate = targetSampleRate;
                patchJson.regions.push(region);
                })
            );
            } else {
            fileReadPromises.push(new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                zip.file(outputName, e.target.result);
                region.framecount = Math.floor(duration * sampleRate);
                region.sampleRate = sampleRate;
                patchJson.regions.push(region);
                resolve();
                };
                reader.readAsArrayBuffer(file);
            }));
            }
        }
        }
    }
    await Promise.all(fileReadPromises);
    zip.file('patch.json', JSON.stringify(patchJson, null, 2));
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${presetName}.preset.zip`;
    a.click();
    URL.revokeObjectURL(url);
    });
}

// Update zoom modal button colors to monochrome and ensure consistent sizing
document.addEventListener('DOMContentLoaded', function() {
  // Wait for DOM to be fully loaded
  const zoomModalElement = document.getElementById('zoom-modal');
  if (zoomModalElement) {
    // Apply consistent styling to zoom modal buttons
    const zoomPlayBtn = zoomModalElement.querySelector('#zoom-play-button');
    const zoomSaveBtn = zoomModalElement.querySelector('#zoom-save-button');
    const zoomCancelBtn = zoomModalElement.querySelector('[data-bs-dismiss="modal"]');
    
    if (zoomPlayBtn && zoomSaveBtn) {
      // Style the Play button
      zoomPlayBtn.className = 'btn btn-sm';
      zoomPlayBtn.style.backgroundColor = '#222';
      zoomPlayBtn.style.color = '#fff';
      zoomPlayBtn.style.border = 'none';
      zoomPlayBtn.style.minWidth = '80px';
      zoomPlayBtn.style.height = '38px';
      zoomPlayBtn.style.fontSize = '1rem';
      zoomPlayBtn.style.padding = '6px 16px';
      
      // Style the Done button
      zoomSaveBtn.className = 'btn btn-sm';
      zoomSaveBtn.style.backgroundColor = '#000';
      zoomSaveBtn.style.color = '#fff';
      zoomSaveBtn.style.border = 'none';
      zoomSaveBtn.style.minWidth = '80px';
      zoomSaveBtn.style.height = '38px';
      zoomSaveBtn.style.fontSize = '1rem';
      zoomSaveBtn.style.padding = '6px 16px';
      
      // Style the Cancel button if it exists
      if (zoomCancelBtn && zoomCancelBtn.tagName === 'BUTTON') {
        zoomCancelBtn.className = 'btn btn-sm';
        zoomCancelBtn.style.backgroundColor = '#888';
        zoomCancelBtn.style.color = '#fff';
        zoomCancelBtn.style.border = 'none';
        zoomCancelBtn.style.minWidth = '80px';
        zoomCancelBtn.style.height = '38px';
        zoomCancelBtn.style.fontSize = '1rem';
        zoomCancelBtn.style.padding = '6px 16px';
      }
    }
  }
});
