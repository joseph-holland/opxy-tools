# OPXY Drum Tool

A JavaScript utility for processing, sanitizing, and converting audio samples for use with the OP-XY platform. This tool is designed to run entirely in the browser as a static web application. It provides functions for resampling audio, converting buffers to WAV format, parsing sample filenames, and generating instrument JSON templates.

## Tools

- **[Drum Patch Generator](https://buba447.github.io/opxy-drum-tool/):** Create and export drum patch JSON files for OP-XY.
- **[Multisample Tool](https://buba447.github.io/opxy-drum-tool/multisample-tool.html):** Batch process and organize multisample audio files, extract note/midi info from filenames, and generate multisample JSON for OP-XY.

## Features

- **Audio Resampling:** Resample audio files to a target sample rate using the Web Audio API.
- **WAV Conversion:** Convert `AudioBuffer` objects to standard WAV files (mono or stereo).
- **Filename Parsing:** Extract base names and note/MIDI numbers from a wide variety of sample filename formats.
- **Sanitization:** Clean up names for safe use as filenames or folder names.
- **Instrument Templates:** Generate base JSON objects for multisample and drum instruments presets compatible with OP-XY.

## Filename Parsing in Multisample Tool

The tool supports filenames with spaces or dashes before the note or MIDI number at the end, such as:

- `sample 1 C0.wav`
- `sample-1-C0.wav`
- `sample one final - C0.wav`
- `this is my sample - 13.wav`
- `sample 1 12.wav`

The tool extracts the base name and note or MIDI number from these patterns, making it easy to organize and process multisample libraries.

