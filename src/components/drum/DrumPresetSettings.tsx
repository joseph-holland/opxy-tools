import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Select, SelectItem, Slider, NumberInput } from '@carbon/react';

export function DrumPresetSettings() {
  const { state, dispatch } = useAppContext();

  const handlePlaymodeChange = (value: string) => {
    dispatch({ type: 'SET_PRESET_PLAYMODE', payload: value as 'poly' | 'mono' | 'legato' });
  };

  const handleTransposeChange = (value: number) => {
    dispatch({ type: 'SET_PRESET_TRANSPOSE', payload: value });
  };

  const handleVelocityChange = (value: number) => {
    dispatch({ type: 'SET_PRESET_VELOCITY', payload: value });
  };

  const handleVolumeChange = (value: number) => {
    dispatch({ type: 'SET_PRESET_VOLUME', payload: value });
  };

  const handleWidthChange = (value: number) => {
    dispatch({ type: 'SET_PRESET_WIDTH', payload: value });
  };

  return (
    <div style={{
      marginBottom: '2rem',
      paddingBottom: '1.5rem',
      borderBottom: '1px solid #f0f0f0'
    }}>
      <h4 style={{ 
        marginBottom: '1rem',
        color: '#888',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        Preset Settings
      </h4>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        {/* Playmode */}
        <div>
          <Select
            id="preset-playmode"
            labelText="Playmode"
            value={state.presetSettings.playmode}
            onChange={(e) => handlePlaymodeChange(e.target.value)}
          >
            <SelectItem value="poly" text="Poly" />
            <SelectItem value="mono" text="Mono" />
            <SelectItem value="legato" text="Legato" />
          </Select>
        </div>
      </div>

      {/* Sliders */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Transpose */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '0.5rem'
          }}>
            <label style={{
              fontSize: '0.8rem',
              fontWeight: '500',
              color: '#222',
              minWidth: '80px'
            }}>
              Transpose
            </label>
            <div style={{ flex: 1 }}>
              <Slider
                id="preset-transpose"
                min={-36}
                max={36}
                step={1}
                value={state.presetSettings.transpose}
                onChange={({ value }) => handleTransposeChange(value)}
                hideTextInput
              />
            </div>
            <NumberInput
              id="preset-transpose-number"
              min={-36}
              max={36}
              step={1}
              value={state.presetSettings.transpose}
              onChange={(e, { value }) => handleTransposeChange(typeof value === 'number' ? value : 0)}
              size="sm"
              style={{ width: '80px' }}
            />
          </div>
        </div>

        {/* Velocity Sensitivity */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '0.5rem'
          }}>
            <label style={{
              fontSize: '0.8rem',
              fontWeight: '500',
              color: '#222',
              minWidth: '80px'
            }}>
              Velocity
            </label>
            <div style={{ flex: 1 }}>
              <Slider
                id="preset-velocity-sensitivity"
                min={0}
                max={100}
                step={1}
                value={state.presetSettings.velocity}
                onChange={({ value }) => handleVelocityChange(value)}
                hideTextInput
              />
            </div>
            <NumberInput
              id="preset-velocity-sensitivity-number"
              min={0}
              max={100}
              step={1}
              value={state.presetSettings.velocity}
              onChange={(e, { value }) => handleVelocityChange(typeof value === 'number' ? value : 0)}
              size="sm"
              style={{ width: '80px' }}
            />
          </div>
        </div>

        {/* Volume */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '0.5rem'
          }}>
            <label style={{
              fontSize: '0.8rem',
              fontWeight: '500',
              color: '#222',
              minWidth: '80px'
            }}>
              Volume
            </label>
            <div style={{ flex: 1 }}>
              <Slider
                id="preset-volume"
                min={0}
                max={100}
                step={1}
                value={state.presetSettings.volume}
                onChange={({ value }) => handleVolumeChange(value)}
                hideTextInput
              />
            </div>
            <NumberInput
              id="preset-volume-number"
              min={0}
              max={100}
              step={1}
              value={state.presetSettings.volume}
              onChange={(e, { value }) => handleVolumeChange(typeof value === 'number' ? value : 0)}
              size="sm"
              style={{ width: '80px' }}
            />
          </div>
        </div>

        {/* Stereo Width */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '0.5rem'
          }}>
            <label style={{
              fontSize: '0.8rem',
              fontWeight: '500',
              color: '#222',
              minWidth: '80px'
            }}>
              Width
            </label>
            <div style={{ flex: 1 }}>
              <Slider
                id="preset-width"
                min={0}
                max={100}
                step={1}
                value={state.presetSettings.width}
                onChange={({ value }) => handleWidthChange(value)}
                hideTextInput
              />
            </div>
            <NumberInput
              id="preset-width-number"
              min={0}
              max={100}
              step={1}
              value={state.presetSettings.width}
              onChange={(e, { value }) => handleWidthChange(typeof value === 'number' ? value : 0)}
              size="sm"
              style={{ width: '80px' }}
            />
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '1rem',
        fontSize: '0.7rem',
        color: '#666',
        lineHeight: '1.4'
      }}>
        <strong>Transpose:</strong> Pitch adjustment in semitones (-36 to +36)<br />
        <strong>Velocity:</strong> Velocity sensitivity (0-100%)<br />
        <strong>Volume:</strong> Overall preset volume (0-100%)<br />
        <strong>Width:</strong> Stereo width (0-100%)
      </div>
    </div>
  );
} 