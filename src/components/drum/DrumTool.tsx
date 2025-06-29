import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button, TextInput, Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { PatchSizeIndicator } from '../common/PatchSizeIndicator';
import { AudioFormatControls } from '../common/AudioFormatControls';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { DrumKeyboard } from './DrumKeyboard';
import { DrumSampleTable } from './DrumSampleTable';
import { DrumPresetSettings } from './DrumPresetSettings';
import { useFileUpload } from '../../hooks/useFileUpload';
import { usePatchGeneration } from '../../hooks/usePatchGeneration';

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
    dispatch({ type: 'SET_SAMPLE_RATE', payload: parseInt(value) });
  };

  const handleBitDepthChange = (value: string) => {
    dispatch({ type: 'SET_BIT_DEPTH', payload: parseInt(value) });
  };

  const handleChannelsChange = (value: string) => {
    dispatch({ type: 'SET_CHANNELS', payload: parseInt(value) });
  };

  const handlePresetNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_PRESET_NAME', payload: e.target.value });
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
      const patchName = state.presetName.trim() || 'drum_patch';
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

  const hasLoadedSamples = state.drumSamples.some(s => s.isLoaded);

  return (
    <div style={{ 
      maxWidth: isMobile ? '100%' : '1400px', 
      margin: '0 auto',
      fontFamily: '"Montserrat", "Arial", sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header Section */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e0e0e0',
        padding: isMobile ? '1rem 0.5rem' : '1.5rem 2rem',
        marginBottom: '0'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '2rem',
          alignItems: 'end',
          maxWidth: '100%'
        }}>
          {/* Preset Name */}
          <div>
            <TextInput
              id="preset-name"
              labelText="preset name"
              placeholder="enter preset name..."
              value={state.presetName}
              onChange={handlePresetNameChange}
              style={{ maxWidth: '400px' }}
            />
          </div>

          {/* Audio Format Controls */}
          <AudioFormatControls
            sampleRate={state.sampleRate}
            bitDepth={state.bitDepth}
            channels={state.channels}
            onSampleRateChange={handleSampleRateChange}
            onBitDepthChange={handleBitDepthChange}
            onChannelsChange={handleChannelsChange}
            size="sm"
          />
        </div>
      </div>

      {/* Always Visible Keyboard Section */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e0e0e0',
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
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="fas fa-keyboard" style={{ color: '#666' }}></i>
            demo samples
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            fontSize: '0.875rem',
            color: '#666'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fas fa-upload" style={{ color: '#666' }}></i>
              drag files to keys or use table below
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontWeight: '500'
            }}>
              <i className="fas fa-check-circle" style={{ color: '#666' }}></i>
              {state.drumSamples.filter(s => s.isLoaded).length} / 24 loaded
            </div>
          </div>
        </div>
        <DrumKeyboard onFileUpload={handleFileUpload} />
      </div>

      {/* Tabbed Content Area */}
      <div style={{ 
        flex: 1,
        padding: isMobile ? '0 0.5rem' : '0 2rem',
        marginBottom: '2rem'
      }}>
        <Tabs>
          <TabList 
            style={{ 
              marginBottom: '2rem',
              borderBottom: '2px solid #f0f0f0'
            }}
          >
            <Tab style={{ fontSize: '1rem', fontWeight: '500' }}>
              <i className="fas fa-table" style={{ marginRight: '0.5rem' }}></i>
              sample table
            </Tab>
            <Tab style={{ fontSize: '1rem', fontWeight: '500' }}>
              <i className="fas fa-sliders-h" style={{ marginRight: '0.5rem' }}></i>
              advanced
            </Tab>
          </TabList>
          
          <TabPanels>
            {/* Sample Table Tab */}
            <TabPanel style={{ padding: '0' }}>
              <div style={{
                background: '#fff',
                borderRadius: '3px',
                padding: isMobile ? '1rem' : '2rem',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                border: '1px solid #f0f0f0'
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
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="fas fa-list" style={{ color: '#666' }}></i>
                    sample management
                  </h3>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Button
                      kind="secondary"
                      size="sm"
                      onClick={handleClearAll}
                      disabled={!hasLoadedSamples}
                    >
                      <i className="fas fa-trash" style={{ marginRight: '0.5rem' }}></i>
                      clear all
                    </Button>
                  </div>
                </div>
                <DrumSampleTable 
                  onFileUpload={handleFileUpload}
                  onClearSample={handleClearSample}
                />
              </div>
            </TabPanel>

            {/* Advanced Tab */}
            <TabPanel style={{ padding: '0' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2rem'
              }}>
                {/* Individual Sample Controls */}
                <div style={{
                  background: '#fff',
                  borderRadius: '3px',
                  padding: '2rem',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f0f0f0'
                }}>
                  <h3 style={{ 
                    margin: '0 0 1.5rem 0',
                    color: '#222',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="fas fa-cog" style={{ color: '#666' }}></i>
                    individual sample controls
                  </h3>
                  <div style={{
                    background: '#f8f9fa',
                    borderRadius: '3px',
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#666',
                    border: '1px solid #e9ecef'
                  }}>
                    <i className="fas fa-tools" style={{ fontSize: '2rem', marginBottom: '1rem', color: '#999' }}></i>
                    <p style={{ margin: '0' }}>
                      select a sample from the table to edit individual settings like gain, pan, and tune.
                    </p>
                    <p style={{ margin: '1rem 0 0 0', fontSize: '0.875rem' }}>
                      coming soon in the next update
                    </p>
                  </div>
                </div>

                {/* Recording Interface */}
                <div style={{
                  background: '#fff',
                  borderRadius: '3px',
                  padding: '2rem',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f0f0f0'
                }}>
                  <h3 style={{ 
                    margin: '0 0 1.5rem 0',
                    color: '#222',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="fas fa-microphone" style={{ color: '#666' }}></i>
                    recording studio
                  </h3>
                  <div style={{
                    background: '#f8f9fa',
                    borderRadius: '3px',
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#666',
                    border: '1px solid #e9ecef'
                  }}>
                    <i className="fas fa-record-vinyl" style={{ fontSize: '2rem', marginBottom: '1rem', color: '#999' }}></i>
                    <p style={{ margin: '0' }}>
                      record directly into any drum slot using your microphone or line input.
                    </p>
                    <p style={{ margin: '1rem 0 0 0', fontSize: '0.875rem' }}>
                      coming soon in the next update
                    </p>
                  </div>
                </div>

                {/* Import/Export */}
                <div style={{
                  background: '#fff',
                  borderRadius: '3px',
                  padding: '2rem',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #f0f0f0',
                  gridColumn: '1 / -1'
                }}>
                  <h3 style={{ 
                    margin: '0 0 1.5rem 0',
                    color: '#222',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="fas fa-exchange-alt" style={{ color: '#666' }}></i>
                    preset management
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem'
                  }}>
                    <div style={{
                      background: '#f8f9fa',
                      borderRadius: '3px',
                      padding: '1.5rem',
                      color: '#666',
                      border: '1px solid #e9ecef'
                    }}>
                      <h4 style={{ 
                        margin: '0 0 0.5rem 0', 
                        color: '#222',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <i className="fas fa-download" style={{ color: '#666' }}></i>
                        import settings
                      </h4>
                      <p style={{ margin: '0', fontSize: '0.875rem' }}>
                        load preset configurations from JSON files
                      </p>
                    </div>
                    <div style={{
                      background: '#f8f9fa',
                      borderRadius: '3px',
                      padding: '1.5rem',
                      color: '#666',
                      border: '1px solid #e9ecef'
                    }}>
                      <h4 style={{ 
                        margin: '0 0 0.5rem 0', 
                        color: '#222',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <i className="fas fa-upload" style={{ color: '#666' }}></i>
                        export settings
                      </h4>
                      <p style={{ margin: '0', fontSize: '0.875rem' }}>
                        save current preset configuration for later use
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>

      {/* Preset Settings Panel - Always Visible */}
      <div style={{
        background: '#fff',
        borderTop: '1px solid #e0e0e0',
        padding: '1.5rem 2rem'
      }}>
        <DrumPresetSettings />
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
            <PatchSizeIndicator type="drum" />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              kind="secondary"
              onClick={handleClearAll}
              disabled={!hasLoadedSamples}
            >
              <i className="fas fa-trash" style={{ marginRight: '0.5rem' }}></i>
              clear all
            </Button>
            <Button
              kind="primary"
              onClick={handleGeneratePatch}
              disabled={!hasLoadedSamples}
              size="lg"
            >
              <i className="fas fa-download" style={{ marginRight: '0.5rem' }}></i>
              generate patch
            </Button>
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
    </div>
  );
}