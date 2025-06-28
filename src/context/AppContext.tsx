import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';

// Define types for the application state
export interface AppState {
  currentTab: 'drum' | 'multisample';
  drumSamples: Array<{
    file: File | null;
    name: string;
    isLoaded: boolean;
    audioBuffer: AudioBuffer | null;
  }>;
  multisampleFiles: Array<{
    file: File | null;
    name: string;
    note: string;
    audioBuffer: AudioBuffer | null;
  }>;
  isLoading: boolean;
  error: string | null;
}

// Define action types
export type AppAction = 
  | { type: 'SET_TAB'; payload: 'drum' | 'multisample' }
  | { type: 'LOAD_DRUM_SAMPLE'; payload: { index: number; file: File; audioBuffer: AudioBuffer } }
  | { type: 'CLEAR_DRUM_SAMPLE'; payload: number }
  | { type: 'LOAD_MULTISAMPLE_FILE'; payload: { file: File; note: string; audioBuffer: AudioBuffer } }
  | { type: 'CLEAR_MULTISAMPLE_FILE'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Initial state
const initialState: AppState = {
  currentTab: 'drum',
  drumSamples: Array(16).fill(null).map(() => ({
    file: null,
    name: '',
    isLoaded: false,
    audioBuffer: null,
  })),
  multisampleFiles: [],
  isLoading: false,
  error: null,
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, currentTab: action.payload };
      
    case 'LOAD_DRUM_SAMPLE':
      const newDrumSamples = [...state.drumSamples];
      newDrumSamples[action.payload.index] = {
        file: action.payload.file,
        name: action.payload.file.name,
        isLoaded: true,
        audioBuffer: action.payload.audioBuffer,
      };
      return { ...state, drumSamples: newDrumSamples };
      
    case 'CLEAR_DRUM_SAMPLE':
      const clearedDrumSamples = [...state.drumSamples];
      clearedDrumSamples[action.payload] = {
        file: null,
        name: '',
        isLoaded: false,
        audioBuffer: null,
      };
      return { ...state, drumSamples: clearedDrumSamples };
      
    case 'LOAD_MULTISAMPLE_FILE':
      return {
        ...state,
        multisampleFiles: [
          ...state.multisampleFiles,
          {
            file: action.payload.file,
            name: action.payload.file.name,
            note: action.payload.note,
            audioBuffer: action.payload.audioBuffer,
          },
        ],
      };
      
    case 'CLEAR_MULTISAMPLE_FILE':
      return {
        ...state,
        multisampleFiles: state.multisampleFiles.filter((_, index) => index !== action.payload),
      };
      
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