import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { RecordingModal } from '../common/RecordingModal';
import { AudioProcessingSection } from '../common/AudioProcessingSection';
import { GeneratePresetSection } from '../common/GeneratePresetSection';
import { DrumKeyboard } from './DrumKeyboard';
import { DrumSampleTable } from './DrumSampleTable';
import { DrumPresetSettings } from './DrumPresetSettings';
import { DrumBulkEditModal } from './DrumBulkEditModal';
import { useFileUpload } from '../../hooks/useFileUpload';
import { usePatchGeneration } from '../../hooks/usePatchGeneration';
import { audioBufferToWav } from '../../utils/audio';
import { DrumKeyboardContainer } from './DrumKeyboardContainer';

export function DrumTool() {
  const { state, dispatch } = useAppContext();
  const { handleDrumSampleUpload, clearDrumSample } = useFileUpload();
  const { generateDrumPatchFile } = usePatchGeneration();
  const [isMobile, setIsMobile] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });
  const [recordingModal, setRecordingModal] = useState<{
    isOpen: boolean;
    targetIndex: number | null;
  }>({ isOpen: false, targetIndex: null });
  const [bulkEditModal, setBulkEditModal] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSampleRateChange = (value: string) => {
    dispatch({ type: 'SET_DRUM_SAMPLE_RATE', payload: parseInt(value) });
  };

  const handleBitDepthChange = (value: string) => {
    dispatch({ type: 'SET_DRUM_BIT_DEPTH', payload: parseInt(value) });
  };

  const handleChannelsChange = (value: string) => {
    dispatch({ type: 'SET_DRUM_CHANNELS', payload: parseInt(value) });
  };

  const handlePresetNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_DRUM_PRESET_NAME', payload: e.target.value });
  };

  const handleNormalizeChange = (enabled: boolean) => {
    dispatch({ type: 'SET_DRUM_NORMALIZE', payload: enabled });
  };

  const handleNormalizeLevelChange = (level: number) => {
    dispatch({ type: 'SET_DRUM_NORMALIZE_LEVEL', payload: level });
  };

  const handleResetAudioSettingsConfirm = () => {
    setConfirmDialog({
      isOpen: true,
      message: 'are you sure you want to reset all audio processing settings to defaults?',
      onConfirm: () => {
        dispatch({ type: 'SET_DRUM_SAMPLE_RATE', payload: 0 });
        dispatch({ type: 'SET_DRUM_BIT_DEPTH', payload: 0 });
        dispatch({ type: 'SET_DRUM_CHANNELS', payload: 0 });
        dispatch({ type: 'SET_DRUM_NORMALIZE', payload: false });
        dispatch({ type: 'SET_DRUM_NORMALIZE_LEVEL', payload: 0.0 });
        setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {} });
      }
    });
  };

  const handleFileUpload = async (index: number, file: File) => {
    try {
      await handleDrumSampleUpload(file, index);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleClearSample = (index: number) => {
    setConfirmDialog({
      isOpen: true,
      message: 'are you sure you want to clear this sample?',
      onConfirm: () => {
        clearDrumSample(index);
        setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {} });
      }
    });
  };

  const handleGeneratePatch = async () => {
    try {
      const patchName = state.drumSettings.presetName.trim() || 'drum_patch';
      await generateDrumPatchFile(patchName);
    } catch (error) {
      console.error('Error generating patch:', error);
    }
  };

  const handleClearAll = () => {
    setConfirmDialog({
      isOpen: true,
      message: 'are you sure you want to clear all loaded samples?',
      onConfirm: () => {
        for (let i = 0; i < 24; i++) {
          clearDrumSample(i);
        }
        setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {} });
      }
    });
  };

  const handleResetAll = () => {
    setConfirmDialog({
      isOpen: true,
      message: 'are you sure you want to reset everything to defaults? this will clear all samples, reset preset name, audio settings and preset settings.',
      onConfirm: () => {
        // Clear all samples
        for (let i = 0; i < 24; i++) {
          clearDrumSample(i);
        }
        
        // Reset preset name
        dispatch({ type: 'SET_DRUM_PRESET_NAME', payload: '' });
        
        // Reset audio format settings to defaults (0 = original)
        dispatch({ type: 'SET_DRUM_SAMPLE_RATE', payload: 0 });
        dispatch({ type: 'SET_DRUM_BIT_DEPTH', payload: 0 });
        dispatch({ type: 'SET_DRUM_CHANNELS', payload: 0 });
        
        // Reset normalize settings
        dispatch({ type: 'SET_DRUM_NORMALIZE', payload: false });
        dispatch({ type: 'SET_DRUM_NORMALIZE_LEVEL', payload: 0.0 });
        
        // Reset preset settings to defaults
        dispatch({ type: 'SET_DRUM_PRESET_PLAYMODE', payload: 'poly' });
        dispatch({ type: 'SET_DRUM_PRESET_TRANSPOSE', payload: 0 });
        dispatch({ type: 'SET_DRUM_PRESET_VELOCITY', payload: 20 });
        dispatch({ type: 'SET_DRUM_PRESET_VOLUME', payload: 69 });
        dispatch({ type: 'SET_DRUM_PRESET_WIDTH', payload: 0 });
        
        setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {} });
      }
    });
  };

  const handleOpenRecording = (targetIndex: number | null = null) => {
    setRecordingModal({ isOpen: true, targetIndex });
  };

  const handleCloseRecording = () => {
    setRecordingModal({ isOpen: false, targetIndex: null });
  };

  const handleSaveRecording = async (audioBuffer: AudioBuffer) => {
    try {
      // Convert AudioBuffer to File-like object for processing
      const numberOfChannels = audioBuffer.numberOfChannels;
      const length = audioBuffer.length;
      const sampleRate = audioBuffer.sampleRate;
      
      // Create a new buffer with the same properties
      const offlineContext = new OfflineAudioContext(numberOfChannels, length, sampleRate);
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start();
      
      const renderedBuffer = await offlineContext.startRendering();
      
      // Create a File-like object from the buffer
      const wavData = audioBufferToWav(renderedBuffer);
      const recordedFile = new File([wavData], 'recorded_sample.wav', { type: 'audio/wav' });
      
      // If a specific target index was set, upload to that slot
      if (recordingModal.targetIndex !== null) {
        await handleFileUpload(recordingModal.targetIndex, recordedFile);
      } else {
        // Find first empty slot or ask user to choose
        const emptyIndex = state.drumSamples.findIndex(sample => !sample.isLoaded);
        if (emptyIndex !== -1) {
          await handleFileUpload(emptyIndex, recordedFile);
        } else {
          // All slots full - could show a selection modal here
          console.warn('All drum slots are full');
        }
      }
    } catch (error) {
      console.error('Error saving recording:', error);
    }
  };

  const hasLoadedSamples = state.drumSamples.some(s => s.isLoaded);
  const hasPresetName = state.drumSettings.presetName.trim().length > 0;
  const canGeneratePatch = hasLoadedSamples && hasPresetName;
  
  // Check if any settings have been changed from defaults
  const hasChangesFromDefaults = (
    hasLoadedSamples || // Any samples loaded
    hasPresetName || // Preset name entered
    state.drumSettings.sampleRate !== 0 || // Audio format changed
    state.drumSettings.bitDepth !== 0 ||
    state.drumSettings.channels !== 0 ||
    state.drumSettings.normalize !== false || // Normalize settings changed
    state.drumSettings.normalizeLevel !== 0.0 ||
    state.drumSettings.presetSettings.playmode !== 'poly' || // Preset settings changed
    state.drumSettings.presetSettings.transpose !== 0 ||
    state.drumSettings.presetSettings.velocity !== 20 ||
    state.drumSettings.presetSettings.volume !== 69 ||
    state.drumSettings.presetSettings.width !== 0 ||
    state.drumSamples.some(s => s.hasBeenEdited) // Any individual sample settings changed
  );

  return (
    <div style={{ 
      fontFamily: '"Montserrat", "Arial", sans-serif',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>

      {/* Always Visible Drum Keyboard Section with pinning */}
      <div style={{ background: 'transparent', padding: isMobile ? '1rem 0.5rem' : '2rem' }}>
        <DrumKeyboardContainer onFileUpload={handleFileUpload} />
      </div>

      {/* Tabbed Content Area */}
      <div style={{ 
        flex: 1,
        padding: isMobile ? '0 0.5rem' : '0 2rem',
        marginBottom: '2rem'
      }}>
        {/* Sample Management Section */}
        <div style={{
          background: '#fff',
          borderRadius: '15px',
          padding: isMobile ? '1rem' : '2rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #f0f0f0'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'flex-start',
            marginBottom: '1.5rem',
            gap: isMobile ? '1rem' : '0'
          }}>
            <h3 style={{ 
              margin: '0',
              color: '#222',
              fontSize: '1.25rem',
              fontWeight: '300',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              sample management
            </h3>
                              <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'center' : 'flex-start',
                alignSelf: isMobile ? 'stretch' : 'auto'
              }}>
                    <button
                      onClick={handleClearAll}
                      disabled={!hasLoadedSamples}
                      style={{
                        padding: '0.625rem 1.25rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '3px',
                        backgroundColor: '#fff',
                        color: hasLoadedSamples ? '#6b7280' : '#9ca3af',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        cursor: hasLoadedSamples ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        opacity: hasLoadedSamples ? 1 : 0.6,
                        flex: isMobile ? '1' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (hasLoadedSamples) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.borderColor = '#9ca3af';
                          e.currentTarget.style.color = '#374151';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (hasLoadedSamples) {
                          e.currentTarget.style.backgroundColor = '#fff';
                          e.currentTarget.style.borderColor = '#d1d5db';
                          e.currentTarget.style.color = '#6b7280';
                        }
                      }}
                    >
                      <i className="fas fa-trash"></i>
                      clear all
                    </button>
                    <button
                      onClick={() => setBulkEditModal(true)}
                      disabled={!hasLoadedSamples}
                      style={{
                        padding: '0.625rem 1.25rem',
                        border: 'none',
                        borderRadius: '3px',
                        backgroundColor: hasLoadedSamples ? '#333' : '#9ca3af',
                        color: '#fff',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        cursor: hasLoadedSamples ? 'pointer' : 'not-allowed',
                        opacity: hasLoadedSamples ? 1 : 0.6,
                        transition: 'all 0.2s ease',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        flex: isMobile ? '1' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (hasLoadedSamples) {
                          e.currentTarget.style.backgroundColor = '#555';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (hasLoadedSamples) {
                          e.currentTarget.style.backgroundColor = '#333';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <i className="fas fa-pencil"></i>
                      bulk edit
                    </button>
                  </div>
          </div>
          <DrumSampleTable 
            onFileUpload={handleFileUpload}
            onClearSample={handleClearSample}
            onRecordSample={handleOpenRecording}
          />
        </div>
      </div>

      {/* Preset Settings Panel - Always Visible */}
      <div style={{
        background: '#fff',
        borderTop: '1px solid #e0e0e0',
        padding: '1.5rem 2rem'
      }}>
        <DrumPresetSettings />
      </div>

      {/* Audio Processing */}
      <AudioProcessingSection
        type="drum"
        sampleRate={state.drumSettings.sampleRate}
        bitDepth={state.drumSettings.bitDepth}
        channels={state.drumSettings.channels}
        onSampleRateChange={handleSampleRateChange}
        onBitDepthChange={handleBitDepthChange}
        onChannelsChange={handleChannelsChange}
        samples={state.drumSamples}
        normalize={state.drumSettings.normalize}
        normalizeLevel={state.drumSettings.normalizeLevel}
        onNormalizeChange={handleNormalizeChange}
        onNormalizeLevelChange={handleNormalizeLevelChange}
        onResetAudioSettingsConfirm={handleResetAudioSettingsConfirm}
      />

      {/* Footer - Generate Preset */}
      <GeneratePresetSection
        type="drum"
        hasLoadedSamples={hasLoadedSamples}
        hasPresetName={hasPresetName}
        canGeneratePatch={canGeneratePatch}
        loadedSamplesCount={state.drumSamples.filter(s => s.isLoaded).length}
        editedSamplesCount={state.drumSamples.filter(s => s.hasBeenEdited).length}
        presetName={state.drumSettings.presetName}
        onPresetNameChange={handlePresetNameChange}
        hasChangesFromDefaults={hasChangesFromDefaults}
        onResetAll={handleResetAll}
        onGeneratePatch={handleGeneratePatch}
        inputId="preset-name"
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {} })}
      />

      {/* Recording Modal */}
      <RecordingModal
        isOpen={recordingModal.isOpen}
        onClose={handleCloseRecording}
        onSave={handleSaveRecording}
        maxDuration={20}
      />

      {/* Bulk Edit Modal */}
      <DrumBulkEditModal
        isOpen={bulkEditModal}
        onClose={() => setBulkEditModal(false)}
      />
    </div>
  );
}