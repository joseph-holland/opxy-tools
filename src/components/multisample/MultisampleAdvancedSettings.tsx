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
      velocitySensitivity: 20,
        volume: 69,
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
    <>
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
                  id="advanced-loop-enabled"
                  labelText="Loop Enabled"
                  toggled={settings.loopEnabled}
                  onToggle={(checked) => updateSetting('loopEnabled', checked)}
                />
                <style>{`
                  #advanced-loop-enabled .cds--toggle-input__appearance {
                    background-color: #e5e7eb !important;
                  }
                  #advanced-loop-enabled .cds--toggle-input__appearance:before {
                    background-color: #6b7280 !important;
                  }
                  #advanced-loop-enabled .cds--toggle-input:checked + .cds--toggle-input__appearance {
                    background-color: #374151 !important;
                  }
                  #advanced-loop-enabled .cds--toggle-input:checked + .cds--toggle-input__appearance:before {
                    background-color: #fff !important;
                  }
                  #advanced-loop-enabled .cds--toggle__text--off,
                  #advanced-loop-enabled .cds--toggle__text--on {
                    color: #6b7280 !important;
                  }
                `}</style>
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
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  transpose: {settings.transpose > 0 ? '+' : ''}{settings.transpose}
                </div>
                <Slider
                  id="advanced-transpose"
                  min={-36}
                  max={36}
                  step={1}
                  value={settings.transpose}
                  onChange={({ value }) => updateSetting('transpose', value)}
                  hideTextInput
                />
              </div>

              <div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  velocity sensitivity: {settings.velocitySensitivity}%
                </div>
                <Slider
                  id="advanced-velocity-sensitivity"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.velocitySensitivity}
                  onChange={({ value }) => updateSetting('velocitySensitivity', value)}
                  hideTextInput
                />
              </div>

              <div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  volume: {settings.volume}%
                </div>
                <Slider
                  id="advanced-volume"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.volume}
                  onChange={({ value }) => updateSetting('volume', value)}
                  hideTextInput
                />
              </div>

              <div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  width: {settings.width}%
                </div>
                <Slider
                  id="advanced-width"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.width}
                  onChange={({ value }) => updateSetting('width', value)}
                  hideTextInput
                />
              </div>

              <div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  highpass filter: {settings.highpass}%
                </div>
                <Slider
                  id="advanced-highpass"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.highpass}
                  onChange={({ value }) => updateSetting('highpass', value)}
                  hideTextInput
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
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  amount: {settings.portamentoAmount}%
                </div>
                <Slider
                  id="advanced-portamento-amount"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.portamentoAmount}
                  onChange={({ value }) => updateSetting('portamentoAmount', value)}
                  hideTextInput
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
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  attack: {settings.ampEnvelope.attack}%
                </div>
                <Slider
                  id="advanced-amp-attack"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.ampEnvelope.attack}
                  onChange={({ value }) => updateEnvelopeSetting('ampEnvelope', 'attack', value)}
                  hideTextInput
                />
              </div>

              <div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  decay: {settings.ampEnvelope.decay}%
                </div>
                <Slider
                  id="advanced-amp-decay"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.ampEnvelope.decay}
                  onChange={({ value }) => updateEnvelopeSetting('ampEnvelope', 'decay', value)}
                  hideTextInput
                />
              </div>

              <div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  sustain: {settings.ampEnvelope.sustain}%
                </div>
                <Slider
                  id="advanced-amp-sustain"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.ampEnvelope.sustain}
                  onChange={({ value }) => updateEnvelopeSetting('ampEnvelope', 'sustain', value)}
                  hideTextInput
                />
              </div>

              <div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  release: {settings.ampEnvelope.release}%
                </div>
                <Slider
                  id="advanced-amp-release"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.ampEnvelope.release}
                  onChange={({ value }) => updateEnvelopeSetting('ampEnvelope', 'release', value)}
                  hideTextInput
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
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  attack: {settings.filterEnvelope.attack}%
                </div>
                <Slider
                  id="advanced-filter-attack"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.filterEnvelope.attack}
                  onChange={({ value }) => updateEnvelopeSetting('filterEnvelope', 'attack', value)}
                  hideTextInput
                />
              </div>

              <div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  decay: {settings.filterEnvelope.decay}%
                </div>
                <Slider
                  id="advanced-filter-decay"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.filterEnvelope.decay}
                  onChange={({ value }) => updateEnvelopeSetting('filterEnvelope', 'decay', value)}
                  hideTextInput
                />
              </div>

              <div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  sustain: {settings.filterEnvelope.sustain}%
                </div>
                <Slider
                  id="advanced-filter-sustain"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.filterEnvelope.sustain}
                  onChange={({ value }) => updateEnvelopeSetting('filterEnvelope', 'sustain', value)}
                  hideTextInput
                />
              </div>

              <div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#222',
                  marginBottom: '0.5rem'
                }}>
                  release: {settings.filterEnvelope.release}%
                </div>
                <Slider
                  id="advanced-filter-release"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.filterEnvelope.release}
                  onChange={({ value }) => updateEnvelopeSetting('filterEnvelope', 'release', value)}
                  hideTextInput
                />
              </div>
            </div>
          </section>
        </div>
      </Modal>

      {/* Slider Styling */}
      <style>{`
        #advanced-transpose .cds--slider__track,
        #advanced-velocity-sensitivity .cds--slider__track,
        #advanced-volume .cds--slider__track,
        #advanced-width .cds--slider__track,
        #advanced-highpass .cds--slider__track,
        #advanced-portamento-amount .cds--slider__track,
        #advanced-amp-attack .cds--slider__track,
        #advanced-amp-decay .cds--slider__track,
        #advanced-amp-sustain .cds--slider__track,
        #advanced-amp-release .cds--slider__track,
        #advanced-filter-attack .cds--slider__track,
        #advanced-filter-decay .cds--slider__track,
        #advanced-filter-sustain .cds--slider__track,
        #advanced-filter-release .cds--slider__track {
          background: linear-gradient(to right, #e5e7eb 0%, #6b7280 100%) !important;
        }
        #advanced-transpose .cds--slider__filled-track,
        #advanced-velocity-sensitivity .cds--slider__filled-track,
        #advanced-volume .cds--slider__filled-track,
        #advanced-width .cds--slider__filled-track,
        #advanced-highpass .cds--slider__filled-track,
        #advanced-portamento-amount .cds--slider__filled-track,
        #advanced-amp-attack .cds--slider__filled-track,
        #advanced-amp-decay .cds--slider__filled-track,
        #advanced-amp-sustain .cds--slider__filled-track,
        #advanced-amp-release .cds--slider__filled-track,
        #advanced-filter-attack .cds--slider__filled-track,
        #advanced-filter-decay .cds--slider__filled-track,
        #advanced-filter-sustain .cds--slider__filled-track,
        #advanced-filter-release .cds--slider__filled-track {
          background: #374151 !important;
        }
        #advanced-transpose .cds--slider__thumb,
        #advanced-velocity-sensitivity .cds--slider__thumb,
        #advanced-volume .cds--slider__thumb,
        #advanced-width .cds--slider__thumb,
        #advanced-highpass .cds--slider__thumb,
        #advanced-portamento-amount .cds--slider__thumb,
        #advanced-amp-attack .cds--slider__thumb,
        #advanced-amp-decay .cds--slider__thumb,
        #advanced-amp-sustain .cds--slider__thumb,
        #advanced-amp-release .cds--slider__thumb,
        #advanced-filter-attack .cds--slider__thumb,
        #advanced-filter-decay .cds--slider__thumb,
        #advanced-filter-sustain .cds--slider__thumb,
        #advanced-filter-release .cds--slider__thumb {
          background: #374151 !important;
          border: 2px solid #374151 !important;
        }
        #advanced-transpose .cds--slider__thumb:hover,
        #advanced-velocity-sensitivity .cds--slider__thumb:hover,
        #advanced-volume .cds--slider__thumb:hover,
        #advanced-width .cds--slider__thumb:hover,
        #advanced-highpass .cds--slider__thumb:hover,
        #advanced-portamento-amount .cds--slider__thumb:hover,
        #advanced-amp-attack .cds--slider__thumb:hover,
        #advanced-amp-decay .cds--slider__thumb:hover,
        #advanced-amp-sustain .cds--slider__thumb:hover,
        #advanced-amp-release .cds--slider__thumb:hover,
        #advanced-filter-attack .cds--slider__thumb:hover,
        #advanced-filter-decay .cds--slider__thumb:hover,
        #advanced-filter-sustain .cds--slider__thumb:hover,
        #advanced-filter-release .cds--slider__thumb:hover {
          background: #222 !important;
          border-color: #222 !important;
        }
      `}</style>
    </>
  );
}