import { Button } from '@carbon/react';
import { useAppContext } from '../../context/AppContext';
import { useFileUpload } from '../../hooks/useFileUpload';
import { usePatchGeneration } from '../../hooks/usePatchGeneration';
import { FileDetailsBadges } from '../common/FileDetailsBadges';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { FileDropZone } from '../common/FileDropZone';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { useState } from 'react';

export function MultisampleTool() {
  const { state } = useAppContext();
  const { handleMultisampleUpload, clearMultisampleFile } = useFileUpload();
  const { generateMultisamplePatchFile } = usePatchGeneration();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

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
    generateMultisamplePatchFile();
  };

  const hasAnySamples = state.multisampleFiles.length > 0;

  return (
    <div>
      <div style={{
        marginBottom: '2.5rem',
        paddingBottom: '1.5rem',
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
              borderRadius: '3px'
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
                  <Button 
                    kind="ghost" 
                    size="sm"
                    onClick={() => handleRemoveSample(index)}
                  >
                    remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Button 
            kind="primary" 
            disabled={!hasAnySamples || state.isLoading}
            onClick={handleGeneratePatch}
          >
            {state.isLoading ? 'generating...' : 'generate patch'}
          </Button>
          <Button 
            kind="secondary" 
            disabled={!hasAnySamples}
            onClick={clearAllSamples}
          >
            clear all
          </Button>
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