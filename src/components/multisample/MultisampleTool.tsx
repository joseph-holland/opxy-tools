import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { TextInput } from '@carbon/react';
import { PatchSizeIndicator } from '../common/PatchSizeIndicator';
import { AudioFormatControls } from '../common/AudioFormatControls';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { RecordingModal } from '../common/RecordingModal';
import { FileDropZone } from '../common/FileDropZone';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { MultisampleSampleTable } from './MultisampleSampleTable';
import { MultisampleAdvancedSettings } from './MultisampleAdvancedSettings';
import { useFileUpload } from '../../hooks/useFileUpload';
import { usePatchGeneration } from '../../hooks/usePatchGeneration';
import { audioBufferToWav } from '../../utils/audio';
import { importPresetFromFile, type MultisamplePresetJson } from '../../utils/presetImport';

export function MultisampleTool() {
  const { state, dispatch } = useAppContext();
  const { handleMultisampleUpload, clearMultisampleFile } = useFileUpload();
  const { generateMultisamplePatchFile } = usePatchGeneration();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [advancedSettingsModal, setAdvancedSettingsModal] = useState(false);

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
    dispatch({ type: 'SET_MULTISAMPLE_SAMPLE_RATE', payload: parseInt(value, 10) });
  };

  const handleBitDepthChange = (value: string) => {
    dispatch({ type: 'SET_MULTISAMPLE_BIT_DEPTH', payload: parseInt(value, 10) });
  };

  const handleChannelsChange = (value: string) => {
    dispatch({ type: 'SET_MULTISAMPLE_CHANNELS', payload: parseInt(value, 10) });
  };

  const handlePresetNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_MULTISAMPLE_PRESET_NAME', payload: e.target.value });
  };

  const handleFilesSelected = async (files: File[]) => {
    // Process files one by one
    for (const file of files) {
      await handleMultisampleUpload(file);
    }
  };

  const handleFileUpload = async (_index: number, file: File) => {
    try {
      await handleMultisampleUpload(file);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleClearSample = (index: number) => {
    setConfirmDialog({
      isOpen: true,
      message: 'are you sure you want to clear this sample?',
      onConfirm: () => {
        clearMultisampleFile(index);
        setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {} });
      }
    });
  };

  const handleGeneratePatch = async () => {
    try {
      const patchName = state.multisampleSettings.presetName.trim() || 'multisample_patch';
      await generateMultisamplePatchFile(patchName);
    } catch (error) {
      console.error('Error generating patch:', error);
    }
  };

  const handleClearAll = () => {
    setConfirmDialog({
      isOpen: true,
      message: 'are you sure you want to clear all loaded samples?',
      onConfirm: () => {
        for (let i = state.multisampleFiles.length - 1; i >= 0; i--) {
          clearMultisampleFile(i);
        }
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
        // Just add to the end of the array
        await handleMultisampleUpload(recordedFile);
      }
    } catch (error) {
      console.error('Error saving recording:', error);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be selected again
    event.target.value = '';

    try {
      const result = await importPresetFromFile(file, 'multisampler');
      
      if (result.success && result.data) {
        const importedPreset = result.data as MultisamplePresetJson;
        
        // Store the complete imported preset for patch generation
        dispatch({ type: 'SET_IMPORTED_MULTISAMPLE_PRESET', payload: importedPreset });
        
        // Note: Multisample presets don't have UI-exposed settings like drums
        // The engine settings will be used during patch generation via the imported JSON
        
        // Show success notification
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            id: Date.now().toString(),
            type: 'success',
            title: 'Settings Imported',
            message: 'Successfully imported multisample preset settings'
          }
        });
      } else {
        // Show error notification
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            id: Date.now().toString(),
            type: 'error',
            title: 'Import Failed',
            message: result.error || 'Failed to import preset'
          }
        });
      }
    } catch (error) {
      // Show error notification for unexpected errors
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          id: Date.now().toString(),
          type: 'error',
          title: 'Import Error',
          message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      });
    }
  };

  const hasLoadedSamples = state.multisampleFiles.length > 0;
  const hasPresetName = state.multisampleSettings.presetName.trim().length > 0;
  const canGeneratePatch = hasLoadedSamples && hasPresetName;

  return (
    <div style={{ 
      fontFamily: '"Montserrat", "Arial", sans-serif',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Header Section */}
      <div style={{
        background: 'transparent',
        borderBottom: '1px solid #e0e0e0',
        padding: isMobile ? '1rem 0.5rem' : '1.5rem 2rem',
        margin: '0'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '1.5rem' : '2rem',
          alignItems: isMobile ? 'stretch' : 'end',
          maxWidth: '100%'
        }}>
          {/* Preset Name */}
          <div style={{ flex: isMobile ? 'none' : '1' }}>
            <TextInput
              id="preset-name-multi"
              labelText="preset name"
              placeholder="enter preset name..."
              value={state.multisampleSettings.presetName}
              onChange={handlePresetNameChange}
              style={{ maxWidth: isMobile ? '100%' : '400px' }}
            />
          </div>

          {/* Import Button */}
          <div style={{ display: 'flex', alignItems: 'end', paddingBottom: '2px' }}>
            <button
              onClick={handleImportClick}
              style={{
                padding: '0.625rem 1.25rem',
                border: 'none',
                borderRadius: '3px',
                backgroundColor: '#333',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                height: '40px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#555';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#333';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <i className="fas fa-upload" style={{ fontSize: '0.8rem' }} />
              import settings
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
          </div>

          {/* Audio Format Controls */}
          <div style={{ flex: isMobile ? 'none' : 'none' }}>
            <AudioFormatControls
              sampleRate={state.multisampleSettings.sampleRate}
              bitDepth={state.multisampleSettings.bitDepth}
              channels={state.multisampleSettings.channels}
              onSampleRateChange={handleSampleRateChange}
              onBitDepthChange={handleBitDepthChange}
              onChannelsChange={handleChannelsChange}
              samples={state.multisampleFiles}
              size="sm"
              isMobile={isMobile}
            />
          </div>
        </div>
      </div>

      {/* Drop Zone Section */}
      <div style={{
        background: 'transparent',
        padding: isMobile ? '1rem 0.5rem' : '2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
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
            multisample files
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            fontSize: '0.875rem',
            color: '#666'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontWeight: '500'
            }}>
              <i className="fas fa-check-circle" style={{ color: '#666' }}></i>
              {state.multisampleFiles.length} / 24 loaded
            </div>
          </div>
        </div>

        <ErrorDisplay message={state.error || ''} />

        <FileDropZone
          onFilesSelected={handleFilesSelected}
          multiple={true}
          disabled={state.isLoading}
          style={{ marginBottom: '2rem' }}
        />
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
            alignItems: isMobile ? 'flex-start' : 'center',
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
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setAdvancedSettingsModal(true)}
                style={{
                  padding: '0.625rem 1.25rem',
                  border: 'none',
                  borderRadius: '3px',
                  backgroundColor: '#333',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#555';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#333';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <i className="fas fa-cog"></i>
                advanced settings
              </button>
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
                  gap: '0.5rem',
                  opacity: hasLoadedSamples ? 1 : 0.6
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
            </div>
          </div>
          <MultisampleSampleTable 
            onFileUpload={handleFileUpload}
            onClearSample={handleClearSample}
            onRecordSample={handleOpenRecording}
          />
        </div>
      </div>

      {/* Footer - Patch Generation */}
      <div style={{
        background: '#f8f9fa',
        borderTop: '1px solid #e0e0e0',
        padding: '1.5rem 2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <PatchSizeIndicator type="multisample" />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleClearAll}
              disabled={!hasLoadedSamples}
              style={{
                padding: '0.75rem 1.5rem',
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
                gap: '0.5rem',
                opacity: hasLoadedSamples ? 1 : 0.6
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
              onClick={handleGeneratePatch}
              disabled={!canGeneratePatch}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '3px',
                backgroundColor: canGeneratePatch ? '#222' : '#9ca3af',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: canGeneratePatch ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: canGeneratePatch ? 1 : 0.6
              }}
              onMouseEnter={(e) => {
                if (canGeneratePatch) {
                  e.currentTarget.style.backgroundColor = '#444';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (canGeneratePatch) {
                  e.currentTarget.style.backgroundColor = '#222';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <i className="fas fa-download"></i>
              generate patch
            </button>
          </div>
        </div>
      </div>

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

      {/* Advanced Settings Modal */}
      <MultisampleAdvancedSettings
        isOpen={advancedSettingsModal}
        onClose={() => setAdvancedSettingsModal(false)}
      />
    </div>
  );
}