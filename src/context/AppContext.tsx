import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { WavMetadata } from '../utils/audio';

// Define enhanced types for the application state
export interface DrumSample {
  file: File | null;
  audioBuffer: AudioBuffer | null;
  name: string;
  isLoaded: boolean;
  inPoint: number;
  outPoint: number;
  // Sample settings
  playmode: 'oneshot' | 'group';
  reverse: boolean;
  tune: number; // -36 to +36 semitones
  pan: number; // -100 to +100
  gain: number; // -30 to +20 dB
}

export interface MultisampleFile {
  file: File | null;
  audioBuffer: AudioBuffer | null;
  name: string;
  isLoaded: boolean;
  rootNote: number;
  inPoint: number;
  outPoint: number;
}

export interface AppState {
  // Current tab
  currentTab: 'drum' | 'multisample';
  
  // Audio settings
  sampleRate: number;
  bitDepth: number;
  channels: number;
  
  // Drum samples (24 samples for full OP-XY compatibility)
  drumSamples: DrumSample[];
  
  // Preset settings
  presetName: string;
  presetSettings: {
    playmode: 'poly' | 'mono' | 'legato';
    transpose: number; // -36 to +36
    velocity: number; // 0-100%
    volume: number; // 0-100%
    width: number; // 0-100%
  };
  
  // Multisample files
  multisampleFiles: MultisampleFile[];
  selectedMultisample: number | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
}

// Define enhanced action types
export type AppAction = 
  | { type: 'SET_TAB'; payload: 'drum' | 'multisample' }
  | { type: 'SET_SAMPLE_RATE'; payload: number }
  | { type: 'SET_BIT_DEPTH'; payload: number }
  | { type: 'SET_CHANNELS'; payload: number }
  | { type: 'SET_PRESET_NAME'; payload: string }
  | { type: 'SET_PRESET_PLAYMODE'; payload: 'poly' | 'mono' | 'legato' }
  | { type: 'SET_PRESET_TRANSPOSE'; payload: number }
  | { type: 'SET_PRESET_VELOCITY'; payload: number }
  | { type: 'SET_PRESET_VOLUME'; payload: number }
  | { type: 'SET_PRESET_WIDTH'; payload: number }
  | { type: 'LOAD_DRUM_SAMPLE'; payload: { index: number; file: File; audioBuffer: AudioBuffer } }
  | { type: 'CLEAR_DRUM_SAMPLE'; payload: number }
  | { type: 'UPDATE_DRUM_SAMPLE'; payload: { index: number; updates: Partial<DrumSample> } }
  | { type: 'LOAD_MULTISAMPLE_FILE'; payload: { index: number; file: File; audioBuffer: AudioBuffer } }
  | { type: 'CLEAR_MULTISAMPLE_FILE'; payload: number }
  | { type: 'UPDATE_MULTISAMPLE_FILE'; payload: { index: number; updates: Partial<MultisampleFile> } }
  | { type: 'SET_SELECTED_MULTISAMPLE'; payload: number | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Initial state
const initialDrumSample: DrumSample = {
  file: null,
  audioBuffer: null,
  name: '',
  isLoaded: false,
  inPoint: 0,
  outPoint: 0,
  playmode: 'oneshot',
  reverse: false,
  tune: 0,
  pan: 0,
  gain: 0
};

const initialMultisampleFile: MultisampleFile = {
  file: null,
  audioBuffer: null,
  name: '',
  isLoaded: false,
  rootNote: 60, // Middle C
  inPoint: 0,
  outPoint: 0
};

const initialState: AppState = {
  currentTab: 'drum',
  sampleRate: 44100,
  bitDepth: 16,
  channels: 2,
  drumSamples: Array(24).fill(null).map(() => ({ ...initialDrumSample })),
  presetName: '',
  presetSettings: {
    playmode: 'poly',
    transpose: 0,
    velocity: 60,
    volume: 56,
    width: 0
  },
  multisampleFiles: Array(8).fill(null).map(() => ({ ...initialMultisampleFile })),
  selectedMultisample: null,
  isLoading: false,
  error: null
};

// Enhanced reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, currentTab: action.payload };
      
    case 'SET_SAMPLE_RATE':
      return { ...state, sampleRate: action.payload };
      
    case 'SET_BIT_DEPTH':
      return { ...state, bitDepth: action.payload };
      
    case 'SET_CHANNELS':
      return { ...state, channels: action.payload };
      
    case 'SET_PRESET_NAME':
      return { ...state, presetName: action.payload };
      
    case 'SET_PRESET_PLAYMODE':
      return { 
        ...state, 
        presetSettings: { ...state.presetSettings, playmode: action.payload }
      };
      
    case 'SET_PRESET_TRANSPOSE':
      return { 
        ...state, 
        presetSettings: { ...state.presetSettings, transpose: action.payload }
      };
      
    case 'SET_PRESET_VELOCITY':
      return { 
        ...state, 
        presetSettings: { ...state.presetSettings, velocity: action.payload }
      };
      
    case 'SET_PRESET_VOLUME':
      return { 
        ...state, 
        presetSettings: { ...state.presetSettings, volume: action.payload }
      };
      
    case 'SET_PRESET_WIDTH':
      return { 
        ...state, 
        presetSettings: { ...state.presetSettings, width: action.payload }
      };
      
    case 'LOAD_DRUM_SAMPLE':
      const newDrumSamples = [...state.drumSamples];
      newDrumSamples[action.payload.index] = {
        ...newDrumSamples[action.payload.index],
        file: action.payload.file,
        audioBuffer: action.payload.audioBuffer,
        name: action.payload.file.name,
        isLoaded: true,
        inPoint: 0,
        outPoint: action.payload.audioBuffer.length - 1
      };
      return { ...state, drumSamples: newDrumSamples };
      
    case 'CLEAR_DRUM_SAMPLE':
      const clearedDrumSamples = [...state.drumSamples];
      clearedDrumSamples[action.payload] = { ...initialDrumSample };
      return { ...state, drumSamples: clearedDrumSamples };
      
    case 'UPDATE_DRUM_SAMPLE':
      const updatedDrumSamples = [...state.drumSamples];
      updatedDrumSamples[action.payload.index] = {
        ...updatedDrumSamples[action.payload.index],
        ...action.payload.updates
      };
      return { ...state, drumSamples: updatedDrumSamples };
      
    case 'LOAD_MULTISAMPLE_FILE':
      const newMultisampleFiles = [...state.multisampleFiles];
      newMultisampleFiles[action.payload.index] = {
        ...newMultisampleFiles[action.payload.index],
        file: action.payload.file,
        audioBuffer: action.payload.audioBuffer,
        name: action.payload.file.name,
        isLoaded: true,
        inPoint: 0,
        outPoint: action.payload.audioBuffer.length - 1
      };
      return { ...state, multisampleFiles: newMultisampleFiles };
      
    case 'CLEAR_MULTISAMPLE_FILE':
      const clearedMultisampleFiles = [...state.multisampleFiles];
      clearedMultisampleFiles[action.payload] = { ...initialMultisampleFile };
      return { ...state, multisampleFiles: clearedMultisampleFiles };
      
    case 'UPDATE_MULTISAMPLE_FILE':
      const updatedMultisampleFiles = [...state.multisampleFiles];
      updatedMultisampleFiles[action.payload.index] = {
        ...updatedMultisampleFiles[action.payload.index],
        ...action.payload.updates
      };
      return { ...state, multisampleFiles: updatedMultisampleFiles };
      
    case 'SET_SELECTED_MULTISAMPLE':
      return { ...state, selectedMultisample: action.payload };
      
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    default:
      return state;
  }
}

// Create context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider component
export function AppContextProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return context;
}