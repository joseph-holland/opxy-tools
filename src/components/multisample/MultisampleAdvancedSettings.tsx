import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Modal, Slider, Select, SelectItem, Toggle } from '@carbon/react';

interface MultisampleAdvancedSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MultisampleAdvancedSettings {
  playmode: 'poly' | 'mono' | 'legato';
  loopEnabled: boolean;
  transpose: number; // -36 to +36
  velocitySensitivity: number; // 0-100%
  volume: number; // 0-100%
  width: number; // 0-100%
  highpass: number; // 0-100%
  portamentoType: 'linear' | 'exponential';
  portamentoAmount: number; // 0-100%
  tuningRoot: number; // 0-11 (C to B)
  ampEnvelope: {
    attack: number; // 0-100%
    decay: number; // 0-100%
    sustain: number; // 0-100%
    release: number; // 0-100%
  };
  filterEnvelope: {
    attack: number; // 0-100%
    decay: number; // 0-100%
    sustain: number; // 0-100%
    release: number; // 0-100%
  };
}

// Convert percentage to internal value (0-100% -> 0-32767)
const percentToInternal = (percent: number): number => {
  return Math.round((percent / 100) * 32767);
};

// Convert internal value to percentage (0-32767 -> 0-100%)
// const internalToPercent = (internal: number): number => {
//   return Math.round((internal / 32767) * 100);
// };

const defaultSettings: MultisampleAdvancedSettings = {
  playmode: 'poly',
  loopEnabled: true,
  transpose: 0,
  velocitySensitivity: 15,
  volume: 80,
  width: 0,
  highpass: 0,
  portamentoType: 'linear',
  portamentoAmount: 0,
  tuningRoot: 0, // C
  ampEnvelope: {
    attack: 0,
    decay: 0,
    sustain: 100,
    release: 0,
  },
  filterEnvelope: {
    attack: 0,
    decay: 0,
    sustain: 100,
    release: 0,
  },
};

export function MultisampleAdvancedSettings({ isOpen, onClose }: MultisampleAdvancedSettingsProps) {
  const { dispatch } = useAppContext();
  const [settings, setSettings] = useState<MultisampleAdvancedSettings>(defaultSettings);

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const handleSave = () => {
    // TODO: Add action to save advanced settings to context
    // For now, we'll store them in the imported preset which gets used during patch generation
    dispatch({
      type: 'SET_IMPORTED_MULTISAMPLE_PRESET',
      payload: {
        engine: {
          playmode: settings.playmode,
          transpose: settings.transpose,
          'velocity.sensitivity': percentToInternal(settings.velocitySensitivity),
          volume: percentToInternal(settings.volume),
          width: percentToInternal(settings.width),
          highpass: percentToInternal(settings.highpass),
          'portamento.amount': percentToInternal(settings.portamentoAmount),
          'portamento.type': settings.portamentoType === 'linear' ? 32767 : 0,
          'tuning.root': settings.tuningRoot,
        },
        envelope: {
          amp: {
            attack: percentToInternal(settings.ampEnvelope.attack),
            decay: percentToInternal(settings.ampEnvelope.decay),
            sustain: percentToInternal(settings.ampEnvelope.sustain),
            release: percentToInternal(settings.ampEnvelope.release),
          },
          filter: {
            attack: percentToInternal(settings.filterEnvelope.attack),
            decay: percentToInternal(settings.filterEnvelope.decay),
            sustain: percentToInternal(settings.filterEnvelope.sustain),
            release: percentToInternal(settings.filterEnvelope.release),
          },
        },
        regions: [] // Will be populated during patch generation
      }
    });

    // Show success notification
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: Date.now().toString(),
        type: 'success',
        title: 'Settings Saved',
        message: 'Advanced multisample settings have been saved'
      }
    });

    onClose();
  };

  const handleReset = () => {
    setSettings(defaultSettings);
  };

  const updateSetting = <K extends keyof MultisampleAdvancedSettings>(
    key: K,
    value: MultisampleAdvancedSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateEnvelopeSetting = (
    envelope: 'ampEnvelope' | 'filterEnvelope',
    param: keyof MultisampleAdvancedSettings['ampEnvelope'],
    value: number
  ) => {
    setSettings(prev => ({
      ...prev,
      [envelope]: {
        ...prev[envelope],
        [param]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onRequestClose={onClose}
      modalHeading="Advanced Multisample Settings"
      primaryButtonText="Save Settings"
      secondaryButtonText="Reset to Defaults"
      onRequestSubmit={handleSave}
      onSecondarySubmit={handleReset}
      size="lg"
    >
      <div style={{ 
        display: 'grid', 
        gap: '2rem',
        maxHeight: '70vh',
        overflowY: 'auto',
        padding: '1rem 0'
      }}>
        
        {/* Playback Settings */}
        <section>
          <h4 style={{ 
            marginBottom: '1rem', 
            color: '#222',
            fontWeight: '500',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '0.5rem'
          }}>
            Playback
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Play Mode
              </label>
              <Select
                id="playmode"
                value={settings.playmode}
                onChange={(e) => updateSetting('playmode', e.target.value as any)}
              >
                <SelectItem value="poly" text="Polyphonic" />
                <SelectItem value="mono" text="Monophonic" />
                <SelectItem value="legato" text="Legato" />
              </Select>
            </div>

            <div>
              <Toggle
                id="loop-enabled"
                labelText="Loop Enabled"
                toggled={settings.loopEnabled}
                onToggle={(checked) => updateSetting('loopEnabled', checked)}
              />
            </div>
          </div>
        </section>

        {/* Global Parameters */}
        <section>
          <h4 style={{ 
            marginBottom: '1rem', 
            color: '#222',
            fontWeight: '500',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '0.5rem'
          }}>
            Global Parameters
          </h4>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <Slider
                labelText={`Transpose: ${settings.transpose > 0 ? '+' : ''}${settings.transpose} semitones`}
                min={-36}
                max={36}
                step={1}
                value={settings.transpose}
                onChange={({ value }) => updateSetting('transpose', value)}
              />
            </div>

            <div>
              <Slider
                labelText={`Velocity Sensitivity: ${settings.velocitySensitivity}%`}
                min={0}
                max={100}
                step={1}
                value={settings.velocitySensitivity}
                onChange={({ value }) => updateSetting('velocitySensitivity', value)}
              />
            </div>

            <div>
              <Slider
                labelText={`Volume: ${settings.volume}%`}
                min={0}
                max={100}
                step={1}
                value={settings.volume}
                onChange={({ value }) => updateSetting('volume', value)}
              />
            </div>

            <div>
              <Slider
                labelText={`Width: ${settings.width}%`}
                min={0}
                max={100}
                step={1}
                value={settings.width}
                onChange={({ value }) => updateSetting('width', value)}
              />
            </div>

            <div>
              <Slider
                labelText={`Highpass Filter: ${settings.highpass}%`}
                min={0}
                max={100}
                step={1}
                value={settings.highpass}
                onChange={({ value }) => updateSetting('highpass', value)}
              />
            </div>
          </div>
        </section>

        {/* Portamento */}
        <section>
          <h4 style={{ 
            marginBottom: '1rem', 
            color: '#222',
            fontWeight: '500',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '0.5rem'
          }}>
            Portamento
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Type
              </label>
              <Select
                id="portamento-type"
                value={settings.portamentoType}
                onChange={(e) => updateSetting('portamentoType', e.target.value as any)}
              >
                <SelectItem value="linear" text="Linear" />
                <SelectItem value="exponential" text="Exponential" />
              </Select>
            </div>

            <div>
              <Slider
                labelText={`Amount: ${settings.portamentoAmount}%`}
                min={0}
                max={100}
                step={1}
                value={settings.portamentoAmount}
                onChange={({ value }) => updateSetting('portamentoAmount', value)}
              />
            </div>
          </div>
        </section>

        {/* Tuning */}
        <section>
          <h4 style={{ 
            marginBottom: '1rem', 
            color: '#222',
            fontWeight: '500',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '0.5rem'
          }}>
            Tuning
          </h4>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Root Note
            </label>
            <Select
              id="tuning-root"
              value={settings.tuningRoot.toString()}
              onChange={(e) => updateSetting('tuningRoot', parseInt(e.target.value))}
            >
              {noteNames.map((note, index) => (
                <SelectItem key={index} value={index.toString()} text={note} />
              ))}
            </Select>
          </div>
        </section>

        {/* Amplitude Envelope */}
        <section>
          <h4 style={{ 
            marginBottom: '1rem', 
            color: '#222',
            fontWeight: '500',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '0.5rem'
          }}>
            Amplitude Envelope
          </h4>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <Slider
                labelText={`Attack: ${settings.ampEnvelope.attack}%`}
                min={0}
                max={100}
                step={1}
                value={settings.ampEnvelope.attack}
                onChange={({ value }) => updateEnvelopeSetting('ampEnvelope', 'attack', value)}
              />
            </div>

            <div>
              <Slider
                labelText={`Decay: ${settings.ampEnvelope.decay}%`}
                min={0}
                max={100}
                step={1}
                value={settings.ampEnvelope.decay}
                onChange={({ value }) => updateEnvelopeSetting('ampEnvelope', 'decay', value)}
              />
            </div>

            <div>
              <Slider
                labelText={`Sustain: ${settings.ampEnvelope.sustain}%`}
                min={0}
                max={100}
                step={1}
                value={settings.ampEnvelope.sustain}
                onChange={({ value }) => updateEnvelopeSetting('ampEnvelope', 'sustain', value)}
              />
            </div>

            <div>
              <Slider
                labelText={`Release: ${settings.ampEnvelope.release}%`}
                min={0}
                max={100}
                step={1}
                value={settings.ampEnvelope.release}
                onChange={({ value }) => updateEnvelopeSetting('ampEnvelope', 'release', value)}
              />
            </div>
          </div>
        </section>

        {/* Filter Envelope */}
        <section>
          <h4 style={{ 
            marginBottom: '1rem', 
            color: '#222',
            fontWeight: '500',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '0.5rem'
          }}>
            Filter Envelope
          </h4>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <Slider
                labelText={`Attack: ${settings.filterEnvelope.attack}%`}
                min={0}
                max={100}
                step={1}
                value={settings.filterEnvelope.attack}
                onChange={({ value }) => updateEnvelopeSetting('filterEnvelope', 'attack', value)}
              />
            </div>

            <div>
              <Slider
                labelText={`Decay: ${settings.filterEnvelope.decay}%`}
                min={0}
                max={100}
                step={1}
                value={settings.filterEnvelope.decay}
                onChange={({ value }) => updateEnvelopeSetting('filterEnvelope', 'decay', value)}
              />
            </div>

            <div>
              <Slider
                labelText={`Sustain: ${settings.filterEnvelope.sustain}%`}
                min={0}
                max={100}
                step={1}
                value={settings.filterEnvelope.sustain}
                onChange={({ value }) => updateEnvelopeSetting('filterEnvelope', 'sustain', value)}
              />
            </div>

            <div>
              <Slider
                labelText={`Release: ${settings.filterEnvelope.release}%`}
                min={0}
                max={100}
                step={1}
                value={settings.filterEnvelope.release}
                onChange={({ value }) => updateEnvelopeSetting('filterEnvelope', 'release', value)}
              />
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}