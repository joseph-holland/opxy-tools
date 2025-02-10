var HEADER_LENGTH = 44;
var MAX_AMPLITUDE = 0x7FFF;

async function resampleAudio(file, targetSampleRate) {
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
        const duration = Math.ceil(audioBuffer.duration * targetSampleRate) / targetSampleRate
        bufferSource.start(0, 0, duration);

        // Render the audio
        const renderedBuffer = await offlineContext.startRendering();

        // Convert the rendered buffer to a WAV file and return it
        return audioBufferToWav(renderedBuffer);
    } catch (error) {
        console.error("Error during audio resampling:", error);
        throw error; // Propagate the error for handling outside the function
    }
}

// Function to convert AudioBuffer to WAV format
function audioBufferToWav(audioBuffer) {
    const nChannels = audioBuffer.numberOfChannels;
    if (nChannels !== 1 && nChannels !== 2) {
        throw new Error('Expecting mono or stereo audioBuffer');
    }

    const bufferLength = audioBuffer.length;
    const arrayBuffer = new ArrayBuffer(HEADER_LENGTH + 2 * bufferLength * nChannels);
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
        0x66, 0x6D, 0x74, 0x20, // F T M █
        0x10, 0x00, 0x00, 0x00, // sub chunk size = 16
        0x01, 0x00, // audio format = 1 (PCM, linear quantization)
        nChannels, 0x00, // number of channels
        sr & 255, (sr >> 8) & 255, (sr >> 16) & 255, (sr >> 24) & 255, // sample rate
        br & 255, (br >> 8) & 255, (br >> 16) & 255, (br >> 24) & 255, // byte rate
        0x04, 0x00, // block align = 4
        0x10, 0x00, // bit per sample = 16
        0x64, 0x61, 0x74, 0x61, // d a t a
        l2 & 255, (l2 >> 8) & 255, (l2 >> 16) & 255, (l2 >> 24) & 255 // sub chunk 2 size
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

    return new Blob([uint8], { type: 'audio/x-wav' });
}

// Sanitize a string to allow only valid characters for filenames and folder names
function sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9 #\-().]+/g, '');
}

// Parse the filename to extract the base name and key
function parseFilename(filename) {
    const [firstPart, remainder] = filename.split("-", 2);
    const baseName = sanitizeName(firstPart);

    const notePattern = /\b[A-G](?:b|#|-)?-?\d\b/;
    const numberPattern = /\b\d+\b/;

    // Try to find a note first
    const noteMatch = remainder.toUpperCase().match(notePattern);
    if (noteMatch) {
        return [baseName, noteStringToMidiValue(noteMatch[0])];
    }

    // If no note, find the first number
    const numberMatch = remainder.match(numberPattern);
    if (numberMatch) {
        return [baseName, parseInt(numberMatch[0], 10)];
    }

    throw new Error(`Filename '${filename}' does not match the expected pattern.`);
}

const NOTE_OFFSET = [33, 35, 24, 26, 28, 29, 31];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Convert MIDI note value to note string
function midiNoteToString(value) {
    const octave = Math.floor(value / 12);
    const noteNumber = value % 12;
    return `${NOTE_NAMES[noteNumber]}${octave - 2}`;
}

// Convert note string to MIDI value
function noteStringToMidiValue(note) {
    const string = note.replace(' ', '');
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
    return parseInt(string.slice(1 + Math.abs(sharpen)), 10) * 12 + NOTE_OFFSET[noteIdx] + sharpen;
}


const baseMultisampleJson = {
    "engine": {
        "bendrange": 13653,
        "highpass": 0,
        "modulation": {
            "aftertouch": {
                "amount": 30719,
                "target": 4096
            },
            "modwheel": {
                "amount": 32767,
                "target": 10240
            },
            "pitchbend": {
                "amount": 16383,
                "target": 0
            },
            "velocity": {
                "amount": 16383,
                "target": 0
            }
        },
        "params": [
            16384,
            16384,
            16384,
            16384,
            16384,
            16384,
            16384,
            16384
        ],
        "playmode": "poly",
        "portamento.amount": 0,
        "portamento.type": 32767,
        "transpose": 0,
        "tuning.root": 0,
        "tuning.scale": 0,
        "velocity.sensitivity": 10240,
        "volume": 16466,
        "width": 3072
    },
    "envelope": {
        "amp": {
            "attack": 0,
            "decay": 20295,
            "release": 16383,
            "sustain": 14989
        },
        "filter": {
            "attack": 0,
            "decay": 16895,
            "release": 19968,
            "sustain": 16896
        }
    },
    "fx": {
        "active": false,
        "params": [
            19661,
            0,
            7391,
            24063,
            0,
            32767,
            0,
            0
        ],
        "type": "svf"
    },
    "lfo": {
        "active": false,
        "params": [
            19024,
            32255,
            4048,
            17408,
            0,
            0,
            0,
            0
        ],
        "type": "element"
    },
    "octave": 0,
    "platform": "OP-XY",
    "regions": [],
    "type": "multisampler",
    "version": 4
};

const baseDrumJson = {
    engine: {
        bendrange: 8191,
        highpass: 0,
        modulation: {
            aftertouch: { amount: 16383, target: 0 },
            modwheel: { amount: 16383, target: 0 },
            pitchbend: { amount: 16383, target: 0 },
            velocity: { amount: 16383, target: 0 }
        },
        params: Array(8).fill(16384),
        playmode: "poly",
        "portamento.amount": 0,
        "portamento.type": 32767,
        transpose: 0,
        "tuning.root": 0,
        "tuning.scale": 0,
        "velocity.sensitivity": 19660,
        volume: 18348,
        width: 0,
    },
    envelope: {
        amp: { attack: 0, decay: 0, release: 1000, sustain: 32767 },
        filter: { attack: 0, decay: 3276, release: 23757, sustain: 983 },
    },
    fx: { active: false, params: [22014, 0, 30285, 11880, 0, 32767, 0, 0], type: "ladder" },
    lfo: { active: false, params: [20309, 5679, 19114, 15807, 0, 0, 0, 12287], type: "random" },
    octave: 0,
    platform: "OP-XY",
    regions: [],
    type: "drum",
    version: 4,
};