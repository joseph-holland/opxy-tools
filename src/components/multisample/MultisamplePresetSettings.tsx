import { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Select, SelectItem, Slider, Toggle } from '@carbon/react';
import { importPresetFromFile, type MultisamplePresetJson } from '../../utils/presetImport';

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

export function MultisamplePresetSettings() {
  const { dispatch } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState<MultisampleAdvancedSettings>(defaultSettings);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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

  const handleSave = () => {
    // Store advanced settings in the imported preset which gets used during patch generation
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

  // Check if any settings have changed from defaults
  const hasPresetChanges = (
    settings.playmode !== defaultSettings.playmode ||
    settings.loopEnabled !== defaultSettings.loopEnabled ||
    settings.transpose !== defaultSettings.transpose ||
    settings.velocitySensitivity !== defaultSettings.velocitySensitivity ||
    settings.volume !== defaultSettings.volume ||
    settings.width !== defaultSettings.width ||
    settings.highpass !== defaultSettings.highpass ||
    settings.portamentoType !== defaultSettings.portamentoType ||
    settings.portamentoAmount !== defaultSettings.portamentoAmount ||
    settings.tuningRoot !== defaultSettings.tuningRoot ||
    settings.ampEnvelope.attack !== defaultSettings.ampEnvelope.attack ||
    settings.ampEnvelope.decay !== defaultSettings.ampEnvelope.decay ||
    settings.ampEnvelope.sustain !== defaultSettings.ampEnvelope.sustain ||
    settings.ampEnvelope.release !== defaultSettings.ampEnvelope.release ||
    settings.filterEnvelope.attack !== defaultSettings.filterEnvelope.attack ||
    settings.filterEnvelope.decay !== defaultSettings.filterEnvelope.decay ||
    settings.filterEnvelope.sustain !== defaultSettings.filterEnvelope.sustain ||
    settings.filterEnvelope.release !== defaultSettings.filterEnvelope.release
  );

  return (
    <div style={{
      marginBottom: '2rem',
      paddingBottom: '1.5rem',
      borderBottom: '1px solid #e5e7eb'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '1rem' : '0',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ 
          margin: '0',
          color: '#222',
          fontSize: '1.25rem',
          fontWeight: '300'
        }}>
          preset settings
        </h3>
        
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem',
          alignSelf: isMobile ? 'stretch' : 'auto'
        }}>
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
              justifyContent: 'center',
              gap: '0.5rem',
              flex: isMobile ? '1' : 'none'
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



          <button
            onClick={handleReset}
            disabled={!hasPresetChanges}
            style={{
              padding: '0.625rem 1.25rem',
              border: '1px solid #d1d5db',
              borderRadius: '3px',
              backgroundColor: '#fff',
              color: hasPresetChanges ? '#6b7280' : '#9ca3af',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: hasPresetChanges ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              flex: isMobile ? '1' : 'none',
              opacity: hasPresetChanges ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (hasPresetChanges) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (hasPresetChanges) {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            <i className="fas fa-undo" style={{ fontSize: '0.8rem' }} />
            reset
          </button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileImport}
          style={{ display: 'none' }}
        />
      </div>

      {/* Settings Grid */}
      <div style={{ display: 'grid', gap: '2rem' }}>
        
        {/* Playback Settings */}
        <section>
          <h4 style={{ 
            marginBottom: '1rem', 
            color: '#222',
            fontWeight: '500',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '0.5rem'
          }}>
            playback
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
            <div>
              <label style={{ 
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                playmode
              </label>
              <Select
                id="playmode"
                labelText=""
                value={settings.playmode}
                onChange={(e) => updateSetting('playmode', e.target.value as any)}
                size="sm"
              >
                <SelectItem value="poly" text="poly" />
                <SelectItem value="mono" text="mono" />
                <SelectItem value="legato" text="legato" />
              </Select>
            </div>

            <div>
              <label style={{ 
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                loop enabled
              </label>
              <Toggle
                id="loop-enabled"
                labelText=""
                toggled={settings.loopEnabled}
                onToggle={(checked) => updateSetting('loopEnabled', checked)}
                size="sm"
              />
            </div>
          </div>
        </section>

        {/* Sound Settings */}
        <section>
          <h4 style={{ 
            marginBottom: '1rem', 
            color: '#222',
            fontWeight: '500',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '0.5rem'
          }}>
            sound
          </h4>
          
          <div className="drum-preset-grid">
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <Slider
                  labelText={`transpose (${settings.transpose})`}
                  id="transpose"
                  min={-36}
                  max={36}
                  step={1}
                  value={settings.transpose}
                  onChange={({ value }) => updateSetting('transpose', value)}
                />
              </div>

              <div>
                <Slider
                  labelText={`velocity sensitivity (${settings.velocitySensitivity}%)`}
                  id="velocity-sensitivity"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.velocitySensitivity}
                  onChange={({ value }) => updateSetting('velocitySensitivity', value)}
                />
              </div>

              <div>
                <Slider
                  labelText={`volume (${settings.volume}%)`}
                  id="volume"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.volume}
                  onChange={({ value }) => updateSetting('volume', value)}
                />
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <Slider
                  labelText={`width (${settings.width}%)`}
                  id="width"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.width}
                  onChange={({ value }) => updateSetting('width', value)}
                />
              </div>

              <div>
                <Slider
                  labelText={`highpass (${settings.highpass}%)`}
                  id="highpass"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.highpass}
                  onChange={({ value }) => updateSetting('highpass', value)}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  color: '#374151'
                }}>
                  tuning root
                </label>
                <div style={{ maxWidth: '200px' }}>
                  <Select
                    id="tuning-root"
                    labelText=""
                    value={settings.tuningRoot.toString()}
                    onChange={(e) => updateSetting('tuningRoot', parseInt(e.target.value))}
                    size="sm"
                  >
                    {noteNames.map((note, index) => (
                      <SelectItem key={index} value={index.toString()} text={note} />
                    ))}
                  </Select>
                </div>
              </div>
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
            portamento
          </h4>
          
          <div className="drum-preset-grid">
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                type
              </label>
              <div style={{ maxWidth: '200px' }}>
                <Select
                  id="portamento-type"
                  labelText=""
                  value={settings.portamentoType}
                  onChange={(e) => updateSetting('portamentoType', e.target.value as any)}
                  size="sm"
                >
                  <SelectItem value="linear" text="linear" />
                  <SelectItem value="exponential" text="exponential" />
                </Select>
              </div>
            </div>

            <div>
              <Slider
                labelText={`amount (${settings.portamentoAmount}%)`}
                id="portamento-amount"
                min={0}
                max={100}
                step={1}
                value={settings.portamentoAmount}
                onChange={({ value }) => updateSetting('portamentoAmount', value)}
              />
            </div>
          </div>
        </section>

        {/* Amp Envelope */}
        <section>
          <h4 style={{ 
            marginBottom: '1rem', 
            color: '#222',
            fontWeight: '500',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '0.5rem'
          }}>
            amp envelope
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                attack ({settings.ampEnvelope.attack}%)
              </label>
              <Slider
                id="amp-attack"
                min={0}
                max={100}
                step={1}
                value={settings.ampEnvelope.attack}
                onChange={({ value }) => updateEnvelopeSetting('ampEnvelope', 'attack', value)}
                labelText=""
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                decay ({settings.ampEnvelope.decay}%)
              </label>
              <Slider
                id="amp-decay"
                min={0}
                max={100}
                step={1}
                value={settings.ampEnvelope.decay}
                onChange={({ value }) => updateEnvelopeSetting('ampEnvelope', 'decay', value)}
                labelText=""
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                sustain ({settings.ampEnvelope.sustain}%)
              </label>
              <Slider
                id="amp-sustain"
                min={0}
                max={100}
                step={1}
                value={settings.ampEnvelope.sustain}
                onChange={({ value }) => updateEnvelopeSetting('ampEnvelope', 'sustain', value)}
                labelText=""
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                release ({settings.ampEnvelope.release}%)
              </label>
              <Slider
                id="amp-release"
                min={0}
                max={100}
                step={1}
                value={settings.ampEnvelope.release}
                onChange={({ value }) => updateEnvelopeSetting('ampEnvelope', 'release', value)}
                labelText=""
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
            filter envelope
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                attack ({settings.filterEnvelope.attack}%)
              </label>
              <Slider
                id="filter-attack"
                min={0}
                max={100}
                step={1}
                value={settings.filterEnvelope.attack}
                onChange={({ value }) => updateEnvelopeSetting('filterEnvelope', 'attack', value)}
                labelText=""
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                decay ({settings.filterEnvelope.decay}%)
              </label>
              <Slider
                id="filter-decay"
                min={0}
                max={100}
                step={1}
                value={settings.filterEnvelope.decay}
                onChange={({ value }) => updateEnvelopeSetting('filterEnvelope', 'decay', value)}
                labelText=""
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                sustain ({settings.filterEnvelope.sustain}%)
              </label>
              <Slider
                id="filter-sustain"
                min={0}
                max={100}
                step={1}
                value={settings.filterEnvelope.sustain}
                onChange={({ value }) => updateEnvelopeSetting('filterEnvelope', 'sustain', value)}
                labelText=""
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                release ({settings.filterEnvelope.release}%)
              </label>
              <Slider
                id="filter-release"
                min={0}
                max={100}
                step={1}
                value={settings.filterEnvelope.release}
                onChange={({ value }) => updateEnvelopeSetting('filterEnvelope', 'release', value)}
                labelText=""
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
} 