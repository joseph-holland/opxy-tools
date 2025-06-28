import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { WavMetadata } from '../utils/audio';

// Define enhanced types for the application state
export interface DrumSample {
  file: File | null;
  name: string;
  isLoaded: boolean;
  audioBuffer: AudioBuffer | null;
  metadata?: WavMetadata;
  // Advanced controls
  gain?: number;
  pan?: number;
  tune?: number;
  reverse?: boolean;
  playmode?: 'oneshot' | 'gate' | 'toggle';
  // Trim points
  inPoint?: number;
  outPoint?: number;
}

export interface MultisampleFile {
  file: File | null;
  name: string;
  note: string;
  audioBuffer: AudioBuffer | null;
  metadata?: WavMetadata;
  // Advanced controls
  gain?: number;
  pan?: number;
  tune?: number;
  reverse?: boolean;
  // Loop and velocity settings
  loopStart?: number;
  loopEnd?: number;
  velocityStart?: number;
  velocityEnd?: number;
  // Trim points
  inPoint?: number;
  outPoint?: number;
}

export interface AppState {
  currentTab: 'drum' | 'multisample';
  drumSamples: DrumSample[];
  multisampleFiles: MultisampleFile[];
  isLoading: boolean;
  error: string | null;
  // Patch generation settings
  sampleRate: number;
  bitDepth: number;
  channels: number;
  // UI state
  selectedDrumIndex: number | null;
  selectedMultisampleIndex: number | null;
}

// Define enhanced action types
export type AppAction = 
  | { type: 'SET_TAB'; payload: 'drum' | 'multisample' }
  | { type: 'LOAD_DRUM_SAMPLE'; payload: { index: number; file: File; audioBuffer: AudioBuffer; metadata?: WavMetadata } }
  | { type: 'CLEAR_DRUM_SAMPLE'; payload: number }
  | { type: 'UPDATE_DRUM_SAMPLE'; payload: { index: number; updates: Partial<DrumSample> } }
  | { type: 'LOAD_MULTISAMPLE_FILE'; payload: { file: File; note: string; audioBuffer: AudioBuffer; metadata?: WavMetadata } }
  | { type: 'CLEAR_MULTISAMPLE_FILE'; payload: number }
  | { type: 'UPDATE_MULTISAMPLE_FILE'; payload: { index: number; updates: Partial<MultisampleFile> } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SAMPLE_RATE'; payload: number }
  | { type: 'SET_BIT_DEPTH'; payload: number }
  | { type: 'SET_CHANNELS'; payload: number }
  | { type: 'SET_SELECTED_DRUM'; payload: number | null }
  | { type: 'SET_SELECTED_MULTISAMPLE'; payload: number | null };

// Initial state
const initialState: AppState = {
  currentTab: 'drum',
  drumSamples: Array(16).fill(null).map(() => ({
    file: null,
    name: '',
    isLoaded: false,
    audioBuffer: null,
    gain: 0,
    pan: 0,
    tune: 0,
    reverse: false,
    playmode: 'oneshot',
    inPoint: 0,
    outPoint: 0,
  })),
  multisampleFiles: [],
  isLoading: false,
  error: null,
  sampleRate: 44100,
  bitDepth: 16,
  channels: 2,
  selectedDrumIndex: null,
  selectedMultisampleIndex: null,
};

// Enhanced reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, currentTab: action.payload };
      
    case 'LOAD_DRUM_SAMPLE':
      const newDrumSamples = [...state.drumSamples];
      const audioBuffer = action.payload.audioBuffer;
      newDrumSamples[action.payload.index] = {
        ...newDrumSamples[action.payload.index],
        file: action.payload.file,
        name: action.payload.file.name,
        isLoaded: true,
        audioBuffer: audioBuffer,
        metadata: action.payload.metadata,
        outPoint: audioBuffer ? audioBuffer.length - 1 : 0,
      };
      return { ...state, drumSamples: newDrumSamples };
      
    case 'CLEAR_DRUM_SAMPLE':
      const clearedDrumSamples = [...state.drumSamples];
      clearedDrumSamples[action.payload] = {
        file: null,
        name: '',
        isLoaded: false,
        audioBuffer: null,
        gain: 0,
        pan: 0,
        tune: 0,
        reverse: false,
        playmode: 'oneshot',
        inPoint: 0,
        outPoint: 0,
      };
      return { ...state, drumSamples: clearedDrumSamples };
      
    case 'UPDATE_DRUM_SAMPLE':
      const updatedDrumSamples = [...state.drumSamples];
      updatedDrumSamples[action.payload.index] = {
        ...updatedDrumSamples[action.payload.index],
        ...action.payload.updates,
      };
      return { ...state, drumSamples: updatedDrumSamples };
      
    case 'LOAD_MULTISAMPLE_FILE':
      const audioBuffer2 = action.payload.audioBuffer;
      return {
        ...state,
        multisampleFiles: [
          ...state.multisampleFiles,
          {
            file: action.payload.file,
            name: action.payload.file.name,
            note: action.payload.note,
            audioBuffer: audioBuffer2,
            metadata: action.payload.metadata,
            gain: 0,
            pan: 0,
            tune: 0,
            reverse: false,
            loopStart: action.payload.metadata?.loopStart || 0,
            loopEnd: action.payload.metadata?.loopEnd || (audioBuffer2 ? audioBuffer2.length - 1 : 0),
            velocityStart: 0,
            velocityEnd: 127,
            inPoint: 0,
            outPoint: audioBuffer2 ? audioBuffer2.length - 1 : 0,
          },
        ],
      };
      
    case 'CLEAR_MULTISAMPLE_FILE':
      return {
        ...state,
        multisampleFiles: state.multisampleFiles.filter((_, index) => index !== action.payload),
      };
      
    case 'UPDATE_MULTISAMPLE_FILE':
      const updatedMultisampleFiles = [...state.multisampleFiles];
      updatedMultisampleFiles[action.payload.index] = {
        ...updatedMultisampleFiles[action.payload.index],
        ...action.payload.updates,
      };
      return { ...state, multisampleFiles: updatedMultisampleFiles };
      
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_SAMPLE_RATE':
      return { ...state, sampleRate: action.payload };
      
    case 'SET_BIT_DEPTH':
      return { ...state, bitDepth: action.payload };
      
    case 'SET_CHANNELS':
      return { ...state, channels: action.payload };
      
    case 'SET_SELECTED_DRUM':
      return { ...state, selectedDrumIndex: action.payload };
      
    case 'SET_SELECTED_MULTISAMPLE':
      return { ...state, selectedMultisampleIndex: action.payload };
      
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