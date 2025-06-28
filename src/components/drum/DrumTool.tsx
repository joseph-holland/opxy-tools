import { Button } from '@carbon/react';
import { useAppContext } from '../../context/AppContext';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';

export function DrumTool() {
  const { state } = useAppContext();
  const { handleDrumSampleUpload, clearDrumSample } = useFileUpload();
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => 
      file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.wav')
    );
    
    if (audioFile) {
      await handleDrumSampleUpload(audioFile, index);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleDrumSampleUpload(file, index);
    }
    // Reset input
    e.target.value = '';
  };

  const openFileDialog = (index: number) => {
    fileInputRefs.current[index]?.click();
  };

  const handleClearSample = (index: number) => {
    clearDrumSample(index);
  };

  const clearAllSamples = () => {
    for (let i = 0; i < 16; i++) {
      clearDrumSample(i);
    }
  };

  const hasAnySamples = state.drumSamples.some(sample => sample.isLoaded);

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
          Drum Sample Tool
        </h3>
        
        <p style={{ 
          color: '#666',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          Create custom drum presets for the OP-XY. Drag and drop up to 16 samples onto the drum grid below.
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

        {/* Drum grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {Array.from({ length: 16 }, (_, index) => (
            <div key={index}>
              <input
                type="file"
                accept="audio/*,.wav"
                style={{ display: 'none' }}
                ref={(el) => { fileInputRefs.current[index] = el; }}
                onChange={(e) => handleFileSelect(e, index)}
              />
              <div
                style={{
                  background: state.drumSamples[index]?.isLoaded ? '#e8f5e8' : '#f8f9fa',
                  border: `2px ${state.drumSamples[index]?.isLoaded ? 'solid #4caf50' : 'dashed #ced4da'}`,
                  borderRadius: '0.375rem',
                  padding: '1.5rem 1rem',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '0.9rem',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onClick={() => openFileDialog(index)}
                onMouseEnter={(e) => {
                  if (!state.drumSamples[index]?.isLoaded) {
                    e.currentTarget.style.background = '#f0f0f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!state.drumSamples[index]?.isLoaded) {
                    e.currentTarget.style.background = '#f8f9fa';
                  }
                }}
              >
                <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                  Pad {index + 1}
                </div>
                {state.drumSamples[index]?.isLoaded ? (
                  <>
                    <div style={{ 
                      color: '#222', 
                      fontWeight: '500', 
                      marginBottom: '0.5rem',
                      wordBreak: 'break-word',
                      fontSize: '0.8rem'
                    }}>
                      {state.drumSamples[index].name}
                    </div>
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearSample(index);
                      }}
                      style={{ marginTop: '0.5rem' }}
                    >
                      Clear
                    </Button>
                  </>
                ) : (
                  <div style={{ fontSize: '0.8rem' }}>
                    Drop sample here<br />or click to browse
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Button 
            kind="primary" 
            disabled={!hasAnySamples || state.isLoading}
          >
            {state.isLoading ? 'Processing...' : 'Generate Patch'}
          </Button>
          <Button 
            kind="secondary" 
            disabled={!hasAnySamples}
            onClick={clearAllSamples}
          >
            Clear All
          </Button>
        </div>
      </div>
    </div>
  );
}