import { useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Select, SelectItem, Slider } from '@carbon/react';
import { importPresetFromFile, extractDrumSettings, type DrumPresetJson } from '../../utils/presetImport';

export function DrumPresetSettings() {
  const { state, dispatch } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be selected again
    event.target.value = '';

    try {
      const result = await importPresetFromFile(file, 'drum');
      
      if (result.success && result.data) {
        const importedPreset = result.data as DrumPresetJson;
        const drumSettings = extractDrumSettings(importedPreset);
        
        // Store the complete imported preset for patch generation
        dispatch({ type: 'SET_IMPORTED_DRUM_PRESET', payload: importedPreset });
        
        // Update all preset settings (no name field in actual patch JSON)
        dispatch({ type: 'SET_DRUM_PRESET_PLAYMODE', payload: drumSettings.presetSettings.playmode });
        dispatch({ type: 'SET_DRUM_PRESET_TRANSPOSE', payload: drumSettings.presetSettings.transpose });
        dispatch({ type: 'SET_DRUM_PRESET_VELOCITY', payload: drumSettings.presetSettings.velocity });
        dispatch({ type: 'SET_DRUM_PRESET_VOLUME', payload: drumSettings.presetSettings.volume });
        dispatch({ type: 'SET_DRUM_PRESET_WIDTH', payload: drumSettings.presetSettings.width });

        // Show success notification
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            id: Date.now().toString(),
            type: 'success',
            title: 'Settings Imported',
            message: 'Successfully imported drum preset settings'
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

  return (
    <div style={{
      marginBottom: '2rem',
      paddingBottom: '1.5rem',
      borderBottom: '1px solid #e5e7eb'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ 
          margin: '0',
          color: '#374151',
          fontSize: '1.125rem',
          fontWeight: '600'
        }}>
          preset settings
        </h3>
        
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
            gap: '0.5rem'
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
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileImport}
          style={{ display: 'none' }}
        />
      </div>

      {/* Settings Grid */}
      <div style={{
        display: 'grid',
        gap: '1.5rem'
      }}>
        {/* Playmode - Full Width */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <label style={{
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151'
          }}>
            playmode
          </label>
          <div style={{ maxWidth: '200px' }}>
            <Select
              id="preset-playmode"
              labelText=""
              value={state.drumSettings.presetSettings.playmode}
              onChange={(e) => handlePlaymodeChange(e.target.value)}
              size="sm"
            >
              <SelectItem value="poly" text="poly" />
              <SelectItem value="mono" text="mono" />
              <SelectItem value="legato" text="legato" />
            </Select>
          </div>
        </div>

        {/* Responsive Grid for Sliders */}
        <div className="drum-preset-grid">
          {/* Transpose */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <label style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}>
              transpose
            </label>
            <Slider
              id="preset-transpose"
              labelText=""
              min={-36}
              max={36}
              step={1}
              value={state.drumSettings.presetSettings.transpose}
              onChange={({ value }) => handleTransposeChange(value)}
            />
          </div>

          {/* Velocity */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <label style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}>
              velocity
            </label>
            <Slider
              id="preset-velocity-sensitivity"
              labelText=""
              min={0}
              max={100}
              step={1}
              value={state.drumSettings.presetSettings.velocity}
              onChange={({ value }) => handleVelocityChange(value)}
            />
          </div>

          {/* Width */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <label style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}>
              width
            </label>
            <Slider
              id="preset-width"
              labelText=""
              min={0}
              max={100}
              step={1}
              value={state.drumSettings.presetSettings.width}
              onChange={({ value }) => handleWidthChange(value)}
            />
          </div>

          {/* Volume */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <label style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}>
              volume
            </label>
            <Slider
              id="preset-volume"
              labelText=""
              min={0}
              max={100}
              step={1}
              value={state.drumSettings.presetSettings.volume}
              onChange={({ value }) => handleVolumeChange(value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 