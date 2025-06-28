import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateDrumPatch, generateMultisamplePatch, downloadBlob } from '../utils/patchGeneration';

export function usePatchGeneration() {
  const { state, dispatch } = useAppContext();

  const generateDrumPatchFile = useCallback(async (patchName?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const loadedSamples = state.drumSamples.filter(sample => sample.isLoaded);
      if (loadedSamples.length === 0) {
        throw new Error('No samples loaded');
      }

      const finalPatchName = patchName || `drum_patch_${Date.now()}`;
      const patchBlob = await generateDrumPatch(state, finalPatchName);
      
      downloadBlob(patchBlob, `${finalPatchName}.zip`);
      
      // Show success message (could be enhanced with a proper notification system)
      console.log(`Generated drum patch: ${finalPatchName}.zip`);
      
    } catch (error) {
      console.error('Error generating drum patch:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to generate patch' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state, dispatch]);

  const generateMultisamplePatchFile = useCallback(async (patchName?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      if (state.multisampleFiles.length === 0) {
        throw new Error('No samples loaded');
      }

      const finalPatchName = patchName || `multisample_patch_${Date.now()}`;
      const patchBlob = await generateMultisamplePatch(state, finalPatchName);
      
      downloadBlob(patchBlob, `${finalPatchName}.zip`);
      
      // Show success message
      console.log(`Generated multisample patch: ${finalPatchName}.zip`);
      
    } catch (error) {
      console.error('Error generating multisample patch:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to generate patch' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state, dispatch]);

  return {
    generateDrumPatchFile,
    generateMultisamplePatchFile,
  };
}