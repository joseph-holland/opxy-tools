# unofficial OP-XY tools

web-based tools for creating custom drum and multisample presets for the teenage engineering OP-XY.

![OP-XY Tools Preview](public/assets/preview-image.png)

- **live demo:** [opxy-tools](https://opxy-tools.pages.dev/)
- **GitHub:** [github.com/joseph-holland/opxy-tools](https://github.com/joseph-holland/opxy-tools)

## features

- preset generation for OP-XY (zip file export)
- modern, responsive ui built with React and Carbon Design System
- drag-and-drop sample assignment for drum and multisample presets
- re-encode samples to 44, 22 or 11khz
- advanced preset settings (envelopes, tuning, velocity, etc.)
- waveform and marker editing for samples with snap to zero point crossing functionality

## development setup

This project has been migrated to React with TypeScript for improved maintainability and modularity.

### requirements

- Node.js 16+ 
- npm or yarn

### installation

```bash
# Clone the repository
git clone https://github.com/joseph-holland/opxy-tools.git
cd opxy-tools

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### project structure

```
/src
  /components         # React UI components (Carbon-based, OP-XY themed)
    /common          # Shared components
    /drum           # Drum-specific components
    /multisample    # Multisample-specific components
  /hooks              # Custom hooks for state, file I/O, audio, etc.
  /utils              # Pure JS/TS logic: audio, patch, file mgmt
  /theme              # Custom Carbon theme and style overrides
  /context            # App/global context providers
  App.tsx
  main.tsx
```

## usage

1. open the [web app](https://opxy-tools.pages.dev/) in your browser.
2. select either the **drum** or **multisample** tab.
3. drag and drop your samples, or use the browse button to select files.
4. assign notes (for multisample), adjust settings and use the advanced dialog for detailed control.
5. optionally, use **import settings** to load engine-level settings from existing preset files.
6. click **generate patch** to download your preset as a zip file.
7. unzip and copy the folder to your OP-XY's `presets` directory via usb.

## migration status

This project has been successfully migrated from vanilla HTML/JS to React with Carbon Design System while preserving the distinctive OP-XY monochrome aesthetic. Core functionality including file upload, audio processing, and patch generation is complete.

### completed ✅
- React + TypeScript + Vite setup
- Carbon Design System integration with custom OP-XY theme  
- File upload and drag-and-drop functionality
- Audio processing (resampling, WAV conversion)
- Patch generation and ZIP export
- State management with React Context
- Responsive design and accessibility

### in progress 🚧
- Advanced modal dialogs
- Waveform editing interface
- Session persistence
- Complete feature parity testing

## credits

- originally created by [zeitgeese](https://github.com/buba447)
- forked from [buba447/opxy-drum-tool](https://buba447.github.io/opxy-drum-tool/)

OP-XY is a trademark of teenage engineering. this is an unofficial tool and is not affiliated with or endorsed by teenage engineering.
