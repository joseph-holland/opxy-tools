# unofficial OP-XY tools

[![Test Suite](https://github.com/joseph-holland/opxy-tools/actions/workflows/test.yml/badge.svg)](https://github.com/joseph-holland/opxy-tools/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/joseph-holland/opxy-tools/branch/main/graph/badge.svg)](https://codecov.io/gh/joseph-holland/opxy-tools)

web-based tools for creating custom drum and multisample presets for the teenage engineering OP-XY.

![OP-XY Tools Preview](assets/preview-image.png)

- **live demo:** [opxy-tools](https://opxy-tools.pages.dev/)
- **GitHub:** [github.com/joseph-holland/opxy-tools](https://github.com/joseph-holland/opxy-tools)

## features

- preset generation for OP-XY (zip file export)
- modern, responsive ui
- drag-and-drop sample assignment for drum and multisample presets
- re-encode samples to 44, 22 or 11khz
- advanced preset settings (envelopes, tuning, velocity, etc.)
- waveform and marker editing for samples with snap to zero point crossing functionality

## usage

1. open the [web app](https://opxy-tools.pages.dev/) in your browser.
2. select either the **drum** or **multisample** tab.
3. drag and drop your samples, or use the browse button to select files.
4. assign notes (for multisample), adjust settings and use the advanced dialog for detailed control.
5. optionally, use **import settings** to load engine-level settings from existing preset files.
6. click **generate patch** to download your preset as a zip file.
7. unzip and copy the folder to your OP-XY's `presets` directory via usb.

## testing

This project includes comprehensive automated testing:

- **Unit Tests**: Jest for testing core functionality
- **End-to-End Tests**: Playwright for testing user workflows  
- **CI/CD**: GitHub Actions for automated testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

See [TESTING.md](TESTING.md) for detailed testing documentation.

## credits

- originally created by [zeitgeese](https://github.com/buba447)
- forked from [buba447/opxy-drum-tool](https://buba447.github.io/opxy-drum-tool/)

OP-XY is a trademark of teenage engineering. this is an unofficial tool and is not affiliated with or endorsed by teenage engineering.

