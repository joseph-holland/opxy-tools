import { Button, Select, SelectItem } from '@carbon/react';
import { useAppContext } from '../../context/AppContext';
import { useFileUpload } from '../../hooks/useFileUpload';
import { usePatchGeneration } from '../../hooks/usePatchGeneration';
import { PatchSizeIndicator } from '../common/PatchSizeIndicator';
import { WaveformEditor } from '../common/WaveformEditor';
import { useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';

export function DrumTool() {
  const { state, dispatch } = useAppContext();
  const { handleDrumSampleUpload, clearDrumSample } = useFileUpload();
  const { generateDrumPatchFile } = usePatchGeneration();
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

  const handleGeneratePatch = () => {
    generateDrumPatchFile();
  };

  const hasAnySamples = state.drumSamples.some(sample => sample.isLoaded);

  const handleSampleRateChange = (value: string) => {
    dispatch({ type: 'SET_SAMPLE_RATE', payload: parseInt(value) });
  };

  const handleBitDepthChange = (value: string) => {
    dispatch({ type: 'SET_BIT_DEPTH', payload: parseInt(value) });
  };

  const handleChannelsChange = (value: string) => {
    dispatch({ type: 'SET_CHANNELS', payload: parseInt(value) });
  };

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

        {/* Audio Format Settings */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '0.375rem',
          border: '1px solid #e0e0e0'
        }}>
          <Select
            id="sample-rate"
            labelText="Sample Rate"
            value={state.sampleRate.toString()}
            onChange={(e) => handleSampleRateChange(e.target.value)}
          >
            <SelectItem value="11025" text="11.025 kHz" />
            <SelectItem value="22050" text="22.05 kHz" />
            <SelectItem value="44100" text="44.1 kHz" />
          </Select>
          
          <Select
            id="bit-depth"
            labelText="Bit Depth"
            value={state.bitDepth.toString()}
            onChange={(e) => handleBitDepthChange(e.target.value)}
          >
            <SelectItem value="16" text="16-bit" />
            <SelectItem value="24" text="24-bit" />
          </Select>
          
          <Select
            id="channels"
            labelText="Channels"
            value={state.channels.toString()}
            onChange={(e) => handleChannelsChange(e.target.value)}
          >
            <SelectItem value="1" text="Mono" />
            <SelectItem value="2" text="Stereo" />
          </Select>
        </div>

        {/* Patch Size Indicator */}
        <PatchSizeIndicator type="drum" />

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
                  padding: '1rem',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '0.9rem',
                  minHeight: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
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
                    
                    {/* Mini waveform preview */}
                    {state.drumSamples[index].audioBuffer && (
                      <div style={{ margin: '0.5rem 0', flexGrow: 1 }}>
                        <WaveformEditor
                          audioBuffer={state.drumSamples[index].audioBuffer}
                          height={40}
                          inPoint={state.drumSamples[index].inPoint}
                          outPoint={state.drumSamples[index].outPoint}
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
                      </div>
                    )}
                    
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearSample(index);
                      }}
                    >
                      Clear
                    </Button>
                  </>
                ) : (
                  <div style={{ fontSize: '0.8rem', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            onClick={handleGeneratePatch}
          >
            {state.isLoading ? 'Generating...' : 'Generate Patch'}
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