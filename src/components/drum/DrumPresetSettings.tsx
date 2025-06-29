import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { Select, SelectItem, Slider, NumberInput } from '@carbon/react';

export function DrumPresetSettings() {
  const { state, dispatch } = useAppContext();

  const handlePlaymodeChange = (value: string) => {
    dispatch({ type: 'SET_DRUM_PRESET_PLAYMODE', payload: value as 'poly' | 'mono' | 'legato' });
  };

  const handleTransposeChange = (value: number) => {
    dispatch({ type: 'SET_DRUM_PRESET_TRANSPOSE', payload: value });
  };

  const handleVelocityChange = (value: number) => {
    dispatch({ type: 'SET_DRUM_PRESET_VELOCITY', payload: value });
  };

  const handleVolumeChange = (value: number) => {
    dispatch({ type: 'SET_DRUM_PRESET_VOLUME', payload: value });
  };

  const handleWidthChange = (value: number) => {
    dispatch({ type: 'SET_DRUM_PRESET_WIDTH', payload: value });
  };

  return (
    <div style={{
      marginBottom: '2rem',
      paddingBottom: '1.5rem',
      borderBottom: '1px solid #f0f0f0'
    }}>
      <h3 style={{ 
        margin: '0',
        marginBottom: '1.5rem',
        color: '#222',
        fontSize: '1.25rem',
        fontWeight: '300',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        preset settings
      </h3>

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
            labelText="playmode"
            value={state.drumSettings.presetSettings.playmode}
            onChange={(e) => handlePlaymodeChange(e.target.value)}
          >
            <SelectItem value="poly" text="poly" />
            <SelectItem value="mono" text="mono" />
            <SelectItem value="legato" text="legato" />
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
              fontSize: '0.9rem',
              fontWeight: '500',
              color: '#222',
              minWidth: '80px'
            }}>
              transpose
            </label>
            <div style={{ flex: 1 }}>
              <Slider
                id="preset-transpose"
                min={-36}
                max={36}
                step={1}
                value={state.drumSettings.presetSettings.transpose}
                onChange={({ value }) => handleTransposeChange(value)}
                hideTextInput
              />
            </div>
            <NumberInput
              id="preset-transpose-number"
              min={-36}
              max={36}
              step={1}
              value={state.drumSettings.presetSettings.transpose}
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
              fontSize: '0.9rem',
              fontWeight: '500',
              color: '#222',
              minWidth: '80px'
            }}>
              velocity
            </label>
            <div style={{ flex: 1 }}>
              <Slider
                id="preset-velocity-sensitivity"
                min={0}
                max={100}
                step={1}
                value={state.drumSettings.presetSettings.velocity}
                onChange={({ value }) => handleVelocityChange(value)}
                hideTextInput
              />
            </div>
            <NumberInput
              id="preset-velocity-sensitivity-number"
              min={0}
              max={100}
              step={1}
              value={state.drumSettings.presetSettings.velocity}
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
              fontSize: '0.9rem',
              fontWeight: '500',
              color: '#222',
              minWidth: '80px'
            }}>
              volume
            </label>
            <div style={{ flex: 1 }}>
              <Slider
                id="preset-volume"
                min={0}
                max={100}
                step={1}
                value={state.drumSettings.presetSettings.volume}
                onChange={({ value }) => handleVolumeChange(value)}
                hideTextInput
              />
            </div>
            <NumberInput
              id="preset-volume-number"
              min={0}
              max={100}
              step={1}
              value={state.drumSettings.presetSettings.volume}
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
              fontSize: '0.9rem',
              fontWeight: '500',
              color: '#222',
              minWidth: '80px'
            }}>
              width
            </label>
            <div style={{ flex: 1 }}>
              <Slider
                id="preset-width"
                min={0}
                max={100}
                step={1}
                value={state.drumSettings.presetSettings.width}
                onChange={({ value }) => handleWidthChange(value)}
                hideTextInput
              />
            </div>
            <NumberInput
              id="preset-width-number"
              min={0}
              max={100}
              step={1}
              value={state.drumSettings.presetSettings.width}
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
        <strong>transpose:</strong> pitch adjustment in semitones (-36 to +36)<br />
        <strong>velocity:</strong> velocity sensitivity (0-100%)<br />
        <strong>volume:</strong> overall preset volume (0-100%)<br />
        <strong>width:</strong> stereo width (0-100%)
      </div>
    </div>
  );
} 