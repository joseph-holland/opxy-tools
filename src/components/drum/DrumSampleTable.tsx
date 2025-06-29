import React, { useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '@carbon/react';
import { WaveformEditor } from '../common/WaveformEditor';

interface DrumSampleTableProps {
  onFileUpload: (index: number, file: File) => void;
  onClearSample: (index: number) => void;
}

// Full drum names from OP-XY documentation
const drumSampleNames = [
  'kick', 'kick alt', 'snare', 'snare alt', 'rim', 'hand clap', 
  'tambourine', 'shaker', 'closed hi-hat', 'clave', 'open hi-hat', 'cabasa',
  'low tom', 'ride cymbal', 'mid-tom', 'crash cymbal', 'hi-tom', 'cowbell', 
  'triangle', 'low tom', 'low conga', 'clave', 'hi-conga', 'guiro'
];

export function DrumSampleTable({ onFileUpload, onClearSample }: DrumSampleTableProps) {
  const { state, dispatch } = useAppContext();
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleFileSelect = (index: number, file: File) => {
    onFileUpload(index, file);
  };

  const openFileDialog = (index: number) => {
    fileInputRefs.current[index]?.click();
  };

  const playSample = (index: number) => {
    const sample = state.drumSamples[index];
    if (!sample?.isLoaded || !sample.audioBuffer) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createBufferSource();
      source.buffer = sample.audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error('Error playing sample:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => 
      file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.wav')
    );
    
    if (audioFile) {
      handleFileSelect(index, audioFile);
    }
  };

  return (
    <div style={{
      fontFamily: '"Montserrat", "Arial", sans-serif'
    }}>
      {/* Table Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '140px 1fr 120px 120px',
        gap: '0.5rem',
        padding: '0.75rem',
        background: '#f8f9fa',
        borderRadius: '0.375rem 0.375rem 0 0',
        border: '1px solid #e0e0e0',
        borderBottom: 'none',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        <div>Drum Key</div>
        <div>File Details</div>
        <div>Waveform</div>
        <div>Actions</div>
      </div>

      {/* Sample Rows */}
      <div style={{
        border: '1px solid #e0e0e0',
        borderRadius: '0 0 0.375rem 0.375rem',
        overflow: 'hidden'
      }}>
        {Array.from({ length: 24 }, (_, index) => {
          const sample = state.drumSamples[index];
          const isLoaded = sample?.isLoaded;
          
          return (
            <div key={index}>
              <input
                type="file"
                accept="audio/*,.wav"
                style={{ display: 'none' }}
                ref={(el) => { fileInputRefs.current[index] = el; }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileSelect(index, file);
                  }
                  e.target.value = '';
                }}
              />
              
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 120px 120px',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  background: isLoaded ? '#f0f8f0' : '#fff',
                  borderBottom: index < 23 ? '1px solid #e0e0e0' : 'none',
                  transition: 'background 0.2s ease',
                  alignItems: 'center',
                  minHeight: '60px'
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onMouseEnter={(e) => {
                  if (!isLoaded) {
                    e.currentTarget.style.background = '#f8f9fa';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isLoaded ? '#f0f8f0' : '#fff';
                }}
              >
                {/* Drum Name */}
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  color: '#222',
                  textTransform: 'capitalize'
                }}>
                  {drumSampleNames[index]}
                </div>

                {/* Sample Info */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}>
                  {isLoaded ? (
                    <>
                      <div style={{
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        color: '#222',
                        wordBreak: 'break-word'
                      }}>
                        {sample.name}
                      </div>
                      <div style={{
                        fontSize: '0.7rem',
                        color: '#666'
                      }}>
                        {sample.audioBuffer ? 
                          `${(sample.audioBuffer.duration).toFixed(2)}s • ${sample.audioBuffer.sampleRate}Hz` 
                          : 'Loading...'
                        }
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => openFileDialog(index)}
                      style={{
                        background: 'none',
                        border: '2px dashed #ccc',
                        borderRadius: '0.375rem',
                        padding: '0.5rem',
                        color: '#666',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#999';
                        e.currentTarget.style.color = '#333';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#ccc';
                        e.currentTarget.style.color = '#666';
                      }}
                    >
                      Drop sample here or click to browse
                    </button>
                  )}
                </div>

                {/* Waveform */}
                <div style={{
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {isLoaded && sample.audioBuffer ? (
                    <WaveformEditor
                      audioBuffer={sample.audioBuffer}
                      height={40}
                      inPoint={sample.inPoint || 0}
                      outPoint={sample.outPoint || sample.audioBuffer.length - 1}
                      onMarkersChange={(markers) => {
                        dispatch({
                          type: 'UPDATE_DRUM_SAMPLE',
                          payload: {
                            index,
                            updates: {
                              inPoint: markers.inPoint,
                              outPoint: markers.outPoint
                            }
                          }
                        });
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '40px',
                      background: '#f0f0f0',
                      borderRadius: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999',
                      fontSize: '0.7rem'
                    }}>
                      No sample
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: '0.25rem',
                  alignItems: 'center'
                }}>
                  <Button
                    kind="ghost"
                    size="sm"
                    disabled={!isLoaded}
                    onClick={() => playSample(index)}
                    style={{
                      minHeight: '28px',
                      padding: '0 0.5rem'
                    }}
                  >
                    Play
                  </Button>
                  <Button
                    kind="ghost"
                    size="sm"
                    disabled={!isLoaded}
                    onClick={() => {/* Advanced settings */}}
                    style={{
                      minHeight: '28px',
                      padding: '0 0.5rem'
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    kind="ghost"
                    size="sm"
                    disabled={!isLoaded}
                    onClick={() => onClearSample(index)}
                    style={{
                      minHeight: '28px',
                      padding: '0 0.5rem',
                      color: '#d32f2f'
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk Actions */}
      <div style={{
        marginTop: '1rem',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center'
      }}>
        <Button
          kind="ghost"
          size="sm"
          onClick={() => {/* Bulk edit */}}
        >
          Bulk Edit
        </Button>
        <Button
          kind="ghost"
          size="sm"
          onClick={() => {/* Record */}}
        >
          Record
        </Button>
      </div>
    </div>
  );
} 