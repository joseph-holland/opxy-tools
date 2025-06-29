import { Button } from '@carbon/react';
import { useAppContext } from '../../context/AppContext';
import { useFileUpload } from '../../hooks/useFileUpload';
import { usePatchGeneration } from '../../hooks/usePatchGeneration';
import { useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';

export function MultisampleTool() {
  const { state } = useAppContext();
  const { handleMultisampleUpload, clearMultisampleFile } = useFileUpload();
  const { generateMultisamplePatchFile } = usePatchGeneration();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => 
      file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.wav')
    );
    
    // Process files one by one
    for (const file of audioFiles) {
      await handleMultisampleUpload(file);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        await handleMultisampleUpload(files[i]);
      }
    }
    // Reset input
    e.target.value = '';
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveSample = (index: number) => {
    clearMultisampleFile(index);
  };

  const clearAllSamples = () => {
    // Clear all samples by index
    for (let i = state.multisampleFiles.length - 1; i >= 0; i--) {
      clearMultisampleFile(i);
    }
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

        {state.error && (
          <div style={{
            background: '#fff2f2',
            border: '1px solid #fee',
            borderRadius: '0.375rem',
            padding: '1rem',
            marginBottom: '1rem',
            color: '#d32f2f'
          }}>
            {state.error}
          </div>
        )}

        {/* Drop area */}
        <input
          type="file"
          accept="audio/*,.wav"
          multiple
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileSelect}
        />
        <div 
          style={{
            background: '#f8f9fa',
            border: '2px dashed #ced4da',
            borderRadius: '0.375rem',
            padding: '3rem 2rem',
            textAlign: 'center',
            marginBottom: '2rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={openFileDialog}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f0f0f0';
            e.currentTarget.style.borderColor = '#999';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8f9fa';
            e.currentTarget.style.borderColor = '#ced4da';
          }}
        >
          <div style={{ color: '#666', fontSize: '1.1rem', marginBottom: '1rem' }}>
            {state.isLoading ? 'processing files...' : 'drop audio files here or click to browse'}
          </div>
          <Button 
            kind="secondary"
            disabled={state.isLoading}
          >
            {state.isLoading ? 'loading...' : 'browse files'}
          </Button>
        </div>

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
              borderRadius: '0.375rem'
            }}>
              {state.multisampleFiles.map((sample, index) => (
                <div 
                  key={index}
                  style={{
                    padding: '1rem',
                    borderBottom: index < state.multisampleFiles.length - 1 ? '1px solid #f0f0f0' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500', color: '#222' }}>
                      {sample.name}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      note: {sample.note || 'auto-detect'} • 
                      duration: {sample.audioBuffer ? `${sample.audioBuffer.duration.toFixed(2)}s` : 'unknown'}
                    </div>
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
    </div>
  );
}