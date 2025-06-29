import React from 'react';
import { Select, SelectItem } from '@carbon/react';

interface AudioFormatControlsProps {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  onSampleRateChange: (value: string) => void;
  onBitDepthChange: (value: string) => void;
  onChannelsChange: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function AudioFormatControls({
  sampleRate,
  bitDepth,
  channels,
  onSampleRateChange,
  onBitDepthChange,
  onChannelsChange,
  size = 'sm',
  disabled = false
}: AudioFormatControlsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      alignItems: 'end'
    }}>
      <Select
        id="sample-rate"
        labelText="sample rate"
        value={sampleRate.toString()}
        onChange={(e) => onSampleRateChange(e.target.value)}
        size={size}
        disabled={disabled}
      >
        <SelectItem value="44100" text="44.1 kHz" />
        <SelectItem value="48000" text="48 kHz" />
        <SelectItem value="96000" text="96 kHz" />
      </Select>

      <Select
        id="bit-depth"
        labelText="bit depth"
        value={bitDepth.toString()}
        onChange={(e) => onBitDepthChange(e.target.value)}
        size={size}
        disabled={disabled}
      >
        <SelectItem value="16" text="16-bit" />
        <SelectItem value="24" text="24-bit" />
      </Select>

      <Select
        id="channels"
        labelText="channels"
        value={channels.toString()}
        onChange={(e) => onChannelsChange(e.target.value)}
        size={size}
        disabled={disabled}
      >
        <SelectItem value="1" text="mono" />
        <SelectItem value="2" text="stereo" />
      </Select>
    </div>
  );
} 