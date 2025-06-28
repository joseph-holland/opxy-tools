import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';

export function useFileUpload() {
  const { dispatch } = useAppContext();

  const handleDrumSampleUpload = useCallback(async (file: File, index: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Basic audio buffer creation - simplified for now
      const audioContext = new AudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      dispatch({
        type: 'LOAD_DRUM_SAMPLE',
        payload: { index, file, audioBuffer }
      });

      // Close audio context to prevent memory leaks
      await audioContext.close();
    } catch (error) {
      console.error('Error loading drum sample:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load audio file' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const handleMultisampleUpload = useCallback(async (file: File, note: string = '') => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Basic audio buffer creation - simplified for now
      const audioContext = new AudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      dispatch({
        type: 'LOAD_MULTISAMPLE_FILE',
        payload: { file, note, audioBuffer }
      });

      // Close audio context to prevent memory leaks
      await audioContext.close();
    } catch (error) {
      console.error('Error loading multisample file:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load audio file' });
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