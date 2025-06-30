import { useEffect, useState } from 'react';
import { TextInput } from '@carbon/react';
import { AudioFormatControls } from './AudioFormatControls';

interface PresetNameSectionProps {
  presetName: string;
  onPresetNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  onSampleRateChange: (value: string) => void;
  onBitDepthChange: (value: string) => void;
  onChannelsChange: (value: string) => void;
  samples: any[]; // Array of sample data for AudioFormatControls
  inputId: string; // Unique ID for the input
}

export function PresetNameSection({
  presetName,
  onPresetNameChange,
  sampleRate,
  bitDepth,
  channels,
  onSampleRateChange,
  onBitDepthChange,
  onChannelsChange,
  samples,
  inputId
}: PresetNameSectionProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{
      background: 'transparent',
      borderBottom: '1px solid #e0e0e0',
      padding: isMobile ? '1rem 0.5rem' : '1.5rem 2rem',
      margin: '0'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '1.5rem' : '8rem',
        alignItems: isMobile ? 'stretch' : 'end',
        justifyContent: isMobile ? 'flex-start' : 'space-between',
        maxWidth: '100%'
      }}>
        {/* Preset Name */}
        <div style={{ 
          flex: isMobile ? 'none' : '1',
          minWidth: isMobile ? '100%' : '300px',
          maxWidth: isMobile ? '100%' : '60%'
        }}>
          <div style={{ width: '100%' }}>
            <TextInput
              id={inputId}
              labelText="preset name"
              placeholder="enter preset name..."
              value={presetName}
              onChange={onPresetNameChange}
            />
            <style>{`
              #${inputId} {
                width: 100% !important;
                min-width: 100% !important;
              }
              #${inputId} .cds--text-input {
                width: 100% !important;
                min-width: 100% !important;
              }
            `}</style>
          </div>
        </div>

        {/* Audio Format Controls */}
        <div style={{ 
          display: 'flex',
          justifyContent: isMobile ? 'flex-start' : 'flex-end',
          flexShrink: 0
        }}>
          <AudioFormatControls
            sampleRate={sampleRate}
            bitDepth={bitDepth}
            channels={channels}
            onSampleRateChange={onSampleRateChange}
            onBitDepthChange={onBitDepthChange}
            onChannelsChange={onChannelsChange}
            samples={samples}
            size="sm"
            isMobile={isMobile}
          />
        </div>
      </div>
    </div>
  );
} 