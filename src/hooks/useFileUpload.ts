import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { readWavMetadata } from '../utils/audio';

export function useFileUpload() {
  const { dispatch } = useAppContext();

  const handleDrumSampleUpload = useCallback(async (file: File, index: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Enhanced audio processing with metadata extraction
      const metadata = await readWavMetadata(file);

      dispatch({
        type: 'LOAD_DRUM_SAMPLE',
        payload: { 
          index, 
          file, 
          audioBuffer: metadata.audioBuffer,
          metadata 
        }
      });

    } catch (error) {
      console.error('Error loading drum sample:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to load audio file' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const handleMultisampleUpload = useCallback(async (file: File) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Enhanced audio processing with metadata extraction
      const metadata = await readWavMetadata(file);

      // Auto-detect note from filename or MIDI data
      let detectedNote = '';
      if (metadata.midiNote !== -1) {
        // Use MIDI note from WAV metadata
        detectedNote = `MIDI-${metadata.midiNote}`;
      } else {
        // Try to extract from filename
        try {
          const match = file.name.match(/([A-G](?:#|b)?\d+)/i);
          if (match) {
            detectedNote = match[1].toUpperCase();
          }
        } catch {
          // Use default if can't detect
          detectedNote = 'C4';
        }
      }

      dispatch({
        type: 'LOAD_MULTISAMPLE_FILE',
        payload: { 
          file, 
          note: detectedNote, 
          audioBuffer: metadata.audioBuffer,
          metadata
        }
      });

    } catch (error) {
      console.error('Error loading multisample file:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to load audio file' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const clearDrumSample = useCallback((index: number) => {
    dispatch({ type: 'CLEAR_DRUM_SAMPLE', payload: index });
  }, [dispatch]);

  const clearMultisampleFile = useCallback((index: number) => {
    dispatch({ type: 'CLEAR_MULTISAMPLE_FILE', payload: index });
  }, [dispatch]);

  return {
    handleDrumSampleUpload,
    handleMultisampleUpload,
    clearDrumSample,
    clearMultisampleFile,
  };
}