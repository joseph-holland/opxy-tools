import { TextInput } from '@carbon/react';
import { useAppContext } from '../../context/AppContext';
import { useFileUpload } from '../../hooks/useFileUpload';
import { usePatchGeneration } from '../../hooks/usePatchGeneration';
import { FileDetailsBadges } from '../common/FileDetailsBadges';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { FileDropZone } from '../common/FileDropZone';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { AudioFormatControls } from '../common/AudioFormatControls';
import { useState, useRef } from 'react';
import { importPresetFromFile, type MultisamplePresetJson } from '../../utils/presetImport';

export function MultisampleTool() {
  const { state, dispatch } = useAppContext();
  const { handleMultisampleUpload, clearMultisampleFile } = useFileUpload();
  const { generateMultisamplePatchFile } = usePatchGeneration();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

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

  const handleRemoveSample = (index: number) => {
    setConfirmDialog({
      isOpen: true,
      message: 'are you sure you want to remove this sample?',
      onConfirm: () => {
        clearMultisampleFile(index);
        setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {} });
      }
    });
  };

  const clearAllSamples = () => {
    setConfirmDialog({
      isOpen: true,
      message: 'are you sure you want to remove all samples?',
      onConfirm: () => {
        // Clear all samples by index
        for (let i = state.multisampleFiles.length - 1; i >= 0; i--) {
          clearMultisampleFile(i);
        }
        setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {} });
      }
    });
  };

  const handleGeneratePatch = () => {
    const patchName = state.multisampleSettings.presetName.trim() || 'multisample_patch';
    generateMultisamplePatchFile(patchName);
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

  const hasAnySamples = state.multisampleFiles.length > 0;
  const hasPresetName = state.multisampleSettings.presetName.trim().length > 0;
  const canGeneratePatch = hasAnySamples && hasPresetName;

  return (
    <div style={{ 
      fontFamily: '"Montserrat", "Arial", sans-serif',
      height: '100%'
    }}>
      {/* Header Section with Preset Name and Audio Format Controls */}
      <div style={{
        background: 'transparent',
        borderBottom: '1px solid #e0e0e0',
        padding: '1.5rem 2rem',
        margin: '0 0 2rem 0'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: '2rem',
          alignItems: 'end',
          maxWidth: '100%'
        }}>
          {/* Preset Name */}
          <div>
            <TextInput
              id="preset-name-multi"
              labelText="preset name"
              placeholder="enter preset name..."
              value={state.multisampleSettings.presetName}
              onChange={handlePresetNameChange}
              style={{ maxWidth: '400px' }}
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
          <AudioFormatControls
            sampleRate={state.multisampleSettings.sampleRate}
            bitDepth={state.multisampleSettings.bitDepth}
            channels={state.multisampleSettings.channels}
            onSampleRateChange={handleSampleRateChange}
            onBitDepthChange={handleBitDepthChange}
            onChannelsChange={handleChannelsChange}
            samples={state.multisampleFiles}
            size="sm"
          />
        </div>
      </div>

      <div style={{
        margin: '0 0 2.5rem 0',
        padding: '0 1.5rem 1.5rem 1.5rem',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <h3 style={{ 
          marginBottom: '1rem',
          color: '#222',
          fontFamily: '"Montserrat", "Arial", sans-serif'
        }}>
          multisample tool
        </h3>
        
        <p style={{ 
          color: '#666',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          create custom multisample presets for the OP-XY. upload samples and assign them to keyboard notes.
        </p>

        <ErrorDisplay message={state.error || ''} />

        {/* Drop area */}
        <FileDropZone
          onFilesSelected={handleFilesSelected}
          multiple={true}
          disabled={state.isLoading}
          style={{ marginBottom: '2rem' }}
        />

        {/* Sample list */}
        {hasAnySamples && (
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ 
              marginBottom: '1rem',
              color: '#222',
              fontFamily: '"Montserrat", "Arial", sans-serif'
            }}>
              loaded samples ({state.multisampleFiles.length})
            </h4>
            
            <div style={{ 
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '6px'
            }}>
              {state.multisampleFiles.map((sample, index) => (
                <div 
                  key={index}
                  style={{
                    padding: '1rem',
                    background: '#f8f9fa',
                    borderBottom: index < state.multisampleFiles.length - 1 ? '1px solid #e0e0e0' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500', color: '#222', marginBottom: '0.5rem' }}>
                      {sample.name}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                      note: {sample.note || 'auto-detect'}
                    </div>
                    <FileDetailsBadges
                      duration={sample.duration}
                      fileSize={sample.fileSize}
                      channels={sample.originalChannels}
                      bitDepth={sample.originalBitDepth}
                      sampleRate={sample.originalSampleRate}
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveSample(index)}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '3px',
                      backgroundColor: '#fff',
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.borderColor = '#9ca3af';
                      e.currentTarget.style.color = '#374151';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff';
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            disabled={!canGeneratePatch || state.isLoading}
            onClick={handleGeneratePatch}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '3px',
              backgroundColor: (canGeneratePatch && !state.isLoading) ? '#222' : '#9ca3af',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: (canGeneratePatch && !state.isLoading) ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: (canGeneratePatch && !state.isLoading) ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (canGeneratePatch && !state.isLoading) {
                e.currentTarget.style.backgroundColor = '#444';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (canGeneratePatch && !state.isLoading) {
                e.currentTarget.style.backgroundColor = '#222';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <i className="fas fa-download"></i>
            {state.isLoading ? 'generating...' : 'generate patch'}
          </button>
          <button
            disabled={!hasAnySamples}
            onClick={clearAllSamples}
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '3px',
              backgroundColor: '#fff',
              color: hasAnySamples ? '#6b7280' : '#9ca3af',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: hasAnySamples ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: hasAnySamples ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (hasAnySamples) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (hasAnySamples) {
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: () => {} })}
      />
    </div>
  );
}