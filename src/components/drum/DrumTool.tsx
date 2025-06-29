import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button, Select, SelectItem, TextInput, Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { PatchSizeIndicator } from '../common/PatchSizeIndicator';
import { DrumKeyboard } from './DrumKeyboard';
import { DrumSampleTable } from './DrumSampleTable';
import { DrumPresetSettings } from './DrumPresetSettings';
import { useFileUpload } from '../../hooks/useFileUpload';
import { usePatchGeneration } from '../../hooks/usePatchGeneration';

export function DrumTool() {
  const { state, dispatch } = useAppContext();
  const { handleDrumSampleUpload, clearDrumSample } = useFileUpload();
  const { generateDrumPatchFile } = usePatchGeneration();

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
    clearDrumSample(index);
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
    if (confirm('Are you sure you want to clear all loaded samples?')) {
      for (let i = 0; i < 24; i++) {
        clearDrumSample(i);
      }
    }
  };

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto',
      fontFamily: '"Montserrat", "Arial", sans-serif'
    }}>
      {/* Header with preset name and audio settings */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '2rem',
        marginBottom: '2rem',
        alignItems: 'end'
      }}>
        {/* Preset Name */}
        <div>
          <TextInput
            id="preset-name"
            labelText="Preset Name"
            placeholder="Enter preset name..."
            value={state.presetName}
            onChange={handlePresetNameChange}
            style={{ maxWidth: '400px' }}
          />
        </div>

        {/* Audio Format Controls */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'end'
        }}>
          <Select
            id="sample-rate"
            labelText="Sample Rate"
            value={state.sampleRate.toString()}
            onChange={(e) => handleSampleRateChange(e.target.value)}
            size="sm"
          >
            <SelectItem value="44100" text="44.1 kHz" />
            <SelectItem value="48000" text="48 kHz" />
            <SelectItem value="96000" text="96 kHz" />
          </Select>

          <Select
            id="bit-depth"
            labelText="Bit Depth"
            value={state.bitDepth.toString()}
            onChange={(e) => handleBitDepthChange(e.target.value)}
            size="sm"
          >
            <SelectItem value="16" text="16-bit" />
            <SelectItem value="24" text="24-bit" />
          </Select>

          <Select
            id="channels"
            labelText="Channels"
            value={state.channels.toString()}
            onChange={(e) => handleChannelsChange(e.target.value)}
            size="sm"
          >
            <SelectItem value="1" text="Mono" />
            <SelectItem value="2" text="Stereo" />
          </Select>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs>
        <TabList>
          <Tab>Keyboard</Tab>
          <Tab>Sample Table</Tab>
        </TabList>
        
        <TabPanels>
          {/* Keyboard Tab */}
          <TabPanel>
            <div style={{ marginBottom: '2rem' }}>
              <DrumKeyboard />
            </div>
          </TabPanel>
          
          {/* Sample Table Tab */}
          <TabPanel>
            <div style={{ marginBottom: '2rem' }}>
              <DrumSampleTable 
                onFileUpload={handleFileUpload}
                onClearSample={handleClearSample}
              />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Preset Settings */}
      <div style={{ marginTop: '2rem' }}>
        <DrumPresetSettings />
      </div>

      {/* Patch Generation Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '2rem',
        padding: '1.5rem',
        background: '#f8f9fa',
        borderRadius: '0.375rem',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <PatchSizeIndicator type="drum" />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            kind="secondary"
            onClick={handleClearAll}
            disabled={state.drumSamples.every(s => !s.isLoaded)}
          >
            Clear All
          </Button>
          <Button
            kind="primary"
            onClick={handleGeneratePatch}
            disabled={state.drumSamples.every(s => !s.isLoaded)}
          >
            Generate Patch
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: '#f0f8ff',
        borderRadius: '0.375rem',
        border: '1px solid #b3d9ff',
        fontSize: '0.8rem',
        lineHeight: '1.5',
        color: '#333'
      }}>
        <h4 style={{ marginBottom: '0.5rem', color: '#0066cc' }}>How to use:</h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li><strong>Keyboard Tab:</strong> Use the on-screen keyboard or your computer keyboard to trigger samples</li>
          <li><strong>Sample Table Tab:</strong> Drag & drop audio files or click to browse for each of the 24 drum samples</li>
          <li><strong>Preset Settings:</strong> Adjust playmode, transpose, velocity, volume, and stereo width</li>
          <li><strong>Keyboard Shortcuts:</strong> Z/X to switch octaves, A-J keys to play samples</li>
          <li><strong>Generate Patch:</strong> Creates an OP-XY compatible drum patch file</li>
        </ul>
      </div>
    </div>
  );
}