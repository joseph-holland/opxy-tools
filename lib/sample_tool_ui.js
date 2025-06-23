// Example: update gain value display
const gainSlider = document.getElementById('gain-slider');
const gainValue = document.getElementById('gain-value');
if (gainSlider && gainValue) {
    gainSlider.addEventListener('input', () => {
    gainValue.textContent = gainSlider.value;
    });
}

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

function playSampleSlice(idx, startFrame, endFrame) {
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
    let panValue = 0;
    const advancedBtn = document.querySelector(`.advanced-btn[data-sample-idx='${idx}']`);
    if (advancedBtn && advancedBtn.dataset.pan) {
        panValue = parseInt(advancedBtn.dataset.pan, 10) || 0;
    }
    const panNode = ctx.createStereoPanner();
    panNode.pan.value = Math.max(-1, Math.min(1, panValue / 100));
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
        // FIX: Define playmode, isReverse, and tune before using them in the modal template
        const playmode = this.dataset.playmode || 'oneshot';
        const isReverse = this.dataset.reverse === 'true';
        const tune = parseInt(this.dataset.tune, 10) || 0;
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
                    <option value="oneshot" ${playmode === 'oneshot' ? 'selected' : ''}>Oneshot</option>
                    <option value="group" ${playmode === 'group' ? 'selected' : ''}>Group</option>
                    <option value="loop" ${playmode === 'loop' ? 'selected' : ''}>Loop</option>
                    <option value="gate" ${playmode === 'gate' ? 'selected' : ''}>Gate</option>
                </select>
                </div>
                <div class="mb-3">
                <label class="form-label">Direction:</label>
                <div>
                    <button type="button" class="btn btn-outline-secondary btn-sm adv-reverse">
                    <i class="fa fa-play" style="transform:${isReverse ? 'scaleX(-1)' : ''}"></i>
                    <span class="adv-reverse-label ms-2">${isReverse ? 'Reverse' : 'Normal'}</span>
                    </button>
                </div>
                </div>
                <div class="mb-3">
                <label class="form-label">Tuning (semitones):</label>
                <input type="range" class="form-range adv-tune-slider" min="-48" max="48" value="${tune}" step="1">
                <input type="number" class="form-control form-control-sm adv-tune" min="-48" max="48" value="${tune}">
                </div>
                <div class="mb-3">
                <label class="form-label">Pan:</label>
                <input type="range" id="advancedPanSlider" class="form-range" min="-100" max="100" value="0" step="1">
                <input type="number" id="advancedPanNumber" class="form-control form-control-sm" min="-100" max="100" value="0" step="1">
                </div>
                <div class="mb-3">
                <label class="form-label">Sample Editor:</label>
                <button type="button" class="btn btn-outline-primary btn-sm ms-2" id="zoom-btn"><i class="fa fa-search-plus"></i> Zoom</button>
                <div id="waveform-container-modal" style="height:60px;width:100%;background:#ececec;position:relative;"></div>
                <div class="d-flex align-items-center mt-2">
                    <label class="me-2">Start</label>
                    <input type="number" class="form-control form-control-sm adv-sample-start" min="0" value="0" style="width:80px;">
                    <label class="mx-2">End</label>
                    <input type="number" class="form-control form-control-sm adv-sample-end" min="0" value="0" style="width:80px;">
                    <span class="ms-2 small text-muted adv-sample-length"></span>
                </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-sm adv-cancel">Cancel</button>
                <button type="button" class="btn btn-outline-primary btn-sm adv-play-modal"><i class="fa fa-play"></i> Play</button>
                <button type="button" class="btn btn-primary btn-sm adv-save">Save</button>
            </div>
            </div>
        </div>
        `;
        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        modal.querySelectorAll('.adv-cancel').forEach(el => el.onclick = closeModal);

        modal.querySelector('.adv-save').onclick = () => {
        const btnToUpdate = document.querySelector(`.advanced-btn[data-sample-idx='${i}']`);
        if (btnToUpdate) {
            btnToUpdate.dataset.playmode = modal.querySelector('.adv-playmode').value;
            const advReverseLabel = modal.querySelector('.adv-reverse-label');
            btnToUpdate.dataset.reverse = (advReverseLabel.textContent.trim() === 'Reverse') ? 'true' : 'false';
            // Clamp tuning value between -48 and 48
            let tuneVal = parseInt(modal.querySelector('.adv-tune').value, 10) || 0;
            tuneVal = Math.max(-48, Math.min(48, tuneVal));
            btnToUpdate.dataset.tune = tuneVal;
            btnToUpdate.dataset.pan = modal.querySelector('#advancedPanSlider').value;
            btnToUpdate.dataset.sampleStart = modal.querySelector('.adv-sample-start').value;
            btnToUpdate.dataset.sampleEnd = modal.querySelector('.adv-sample-end').value;
        }
        closeModal();
        };

        modal.querySelector('.adv-reverse').onclick = function() {
        const icon = this.querySelector('i');
        const label = this.querySelector('.adv-reverse-label');
        if (label.textContent.trim() === 'Normal') {
            icon.style.transform = 'scaleX(-1)';
            label.textContent = 'Reverse';
        } else {
            icon.style.transform = '';
            label.textContent = 'Normal';
        }
        };

        // Set initial values for pan controls
        const panValue = this.dataset.pan || 0;
        modal.querySelector('#advancedPanSlider').value = panValue;
        modal.querySelector('#advancedPanNumber').value = panValue;

        // Sync slider and number input
        modal.querySelector('#advancedPanSlider').oninput = function() {
        modal.querySelector('#advancedPanNumber').value = this.value;
        };
        modal.querySelector('#advancedPanNumber').oninput = function() {
        modal.querySelector('#advancedPanSlider').value = this.value;
        };

        // Set initial values for tuning controls
        modal.querySelector('.adv-tune-slider').value = tune;
        modal.querySelector('.adv-tune').value = tune;
        // Sync slider and number input for tuning
        modal.querySelector('.adv-tune-slider').oninput = function() {
        modal.querySelector('.adv-tune').value = this.value;
        };
        modal.querySelector('.adv-tune').oninput = function() {
        let val = parseInt(this.value, 10) || 0;
        val = Math.max(-48, Math.min(48, val));
        this.value = val;
        modal.querySelector('.adv-tune-slider').value = val;
        };

        modal.querySelector('#zoom-btn').addEventListener('click', () => {
            const sampleIndex = i;
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

            function drawZoomMarkers() {
                const startX = (startFrame / data.length) * width;
                const endX = (endFrame / data.length) * width;

                // Start marker
                ctx.save();
                ctx.strokeStyle = '#ff4940';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(startX, 0);
                ctx.lineTo(startX, height);
                ctx.stroke();
                // Draw handle at bottom
                ctx.fillStyle = '#ff4940';
                ctx.beginPath();
                ctx.arc(startX, height - 7, 7, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();

                // End marker
                ctx.save();
                ctx.strokeStyle = '#007bff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(endX, 0);
                ctx.lineTo(endX, height);
                ctx.stroke();
                // Draw handle at bottom
                ctx.fillStyle = '#007bff';
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
                playSampleSlice(sampleIndex, startFrame, endFrame);
            };

            document.getElementById('zoom-save-button').onclick = () => {
                const sampleIndex = zoomModalElement.dataset.sampleIndex;
                const startFrame = document.getElementById('zoom-start-point').value;
                const endFrame = document.getElementById('zoom-end-point').value;

                const advancedBtn = document.querySelector(`.advanced-btn[data-sample-idx='${sampleIndex}']`);
                if (advancedBtn) {
                    advancedBtn.dataset.sampleStart = startFrame;
                    advancedBtn.dataset.sampleEnd = endFrame;
                }

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
        const buffer = drumSamples[i];
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
        let startFrame = parseInt(this.dataset.sampleStart, 10);
        let endFrame = parseInt(this.dataset.sampleEnd, 10);
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
            // Start marker
            ctx.save();
            ctx.strokeStyle = '#ff4940';
            ctx.lineWidth = 3;
            ctx.beginPath();
            const sx = Math.floor((startInput.value / data.length) * width);
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, height);
            ctx.stroke();
            // Draw handle at bottom
            ctx.fillStyle = '#ff4940';
            ctx.beginPath();
            ctx.arc(sx, height - 7, 7, 0, 2*Math.PI); // bottom of canvas
            ctx.fill();
            ctx.restore();
            // End marker
            ctx.save();
            ctx.strokeStyle = '#007bff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            const ex = Math.floor((endInput.value / data.length) * width);
            ctx.moveTo(ex, 0);
            ctx.lineTo(ex, height);
            ctx.stroke();
            // Draw handle at bottom
            ctx.fillStyle = '#007bff';
            ctx.beginPath();
            ctx.arc(ex, height - 7, 7, 0, 2*Math.PI); // bottom of canvas
            ctx.fill();
            ctx.restore();
        }
        drawMarkers();
        modal.drawMarkers = drawMarkers;

        startInput.oninput = endInput.oninput = function() {
            const MIN_DISTANCE = 10;
            function clampMarkers() {
            let s = Math.max(0, Math.min(parseInt(startInput.value, 10) || 0, data.length-1));
            let e = Math.max(s+MIN_DISTANCE, Math.min(parseInt(endInput.value, 10) || data.length, data.length));
            // Only clamp if user tries to cross the markers
            if (e - s < MIN_DISTANCE) {
                if (draggingMarker === 'start') {
                s = Math.max(0, e-MIN_DISTANCE);
                } else if (draggingMarker === 'end') {
                e = Math.min(data.length, s+MIN_DISTANCE);
                }
            }
            startInput.value = s;
            endInput.value = e;
            }
            clampMarkers();
            drawMarkers();
            playCurrentSelection();
        };
        // Debounced play function for modal
        let playCurrentSelection = null;
        playCurrentSelection = () => {
            if (playTimeout) clearTimeout(playTimeout);
            playTimeout = setTimeout(() => {
            modal.querySelector('.adv-play-modal').click();
            }, 80); // Debounce for smoother dragging
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
            } else {
                endInput.value = Math.max(parseInt(startInput.value,10)+10, Math.min(Math.round((x / width) * data.length), data.length));
            }
            drawMarkers();
            playCurrentSelection();
            draggingMarker = null;
            return;
            }
            // Attach move and up listeners only when dragging
            dragMoveHandler = function(e) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const frame = Math.round((x / width) * data.length);
            if (draggingMarker === 'start') {
                startInput.value = Math.max(0, Math.min(frame, endInput.value-10));
            } else if (draggingMarker === 'end') {
                endInput.value = Math.max(parseInt(startInput.value,10)+10, Math.min(frame, data.length));
            }
            drawMarkers();
            playCurrentSelection();
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
        // Get modal settings
        let sampleStart = parseInt(modal.querySelector('.adv-sample-start').value, 10) || 0;
        let sampleEnd = parseInt(modal.querySelector('.adv-sample-end').value, 10) || buffer.length;
        sampleStart = Math.max(0, Math.min(sampleStart, buffer.length - 1));
        sampleEnd = Math.max(sampleStart + 1, Math.min(sampleEnd, buffer.length));
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
            playBuffer = selectionBuffer;
        }
        // Reverse
        const advReverseLabel = modal.querySelector('.adv-reverse-label');
        const isReverse = advReverseLabel && advReverseLabel.textContent.trim() === 'Reverse';
        if (isReverse) {
            const revBuffer = ctx.createBuffer(playBuffer.numberOfChannels, playBuffer.length, playBuffer.sampleRate);
            for (let ch = 0; ch < playBuffer.numberOfChannels; ch++) {
            const srcData = playBuffer.getChannelData(ch);
            const dstData = revBuffer.getChannelData(ch);
            for (let i = 0, j = srcData.length - 1; i < srcData.length; i++, j--) {
                dstData[i] = srcData[j];
            }
            }
            playBuffer = revBuffer;
        }
        // Tuning
        let semitones = parseInt(modal.querySelector('.adv-tune').value, 10) || 0;
        src.buffer = playBuffer;
        src.playbackRate.value = Math.pow(2, semitones / 12);
        src.connect(ctx.destination);
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
if (typeof JSZip === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    document.head.appendChild(script);
}

function sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9_\-.]/g, '_');
}

async function resampleAudio(file, targetSampleRate) {
    if (window.resampleAudio) {
    return await window.resampleAudio(file, targetSampleRate);
    } else {
    return file;
    }
}

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
