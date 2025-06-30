import React, { useEffect, useState } from 'react';
import { TextInput } from '@carbon/react';
import { PatchSizeIndicator } from './PatchSizeIndicator';
import { AudioFormatControls } from './AudioFormatControls';

interface GeneratePresetSectionProps {
  type: 'drum' | 'multisample';
  hasLoadedSamples: boolean;
  hasPresetName: boolean;
  canGeneratePatch: boolean;
  loadedSamplesCount: number;
  editedSamplesCount: number;
  presetName: string;
  onPresetNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sampleRate: number;
  bitDepth: number;
  channels: number;
  onSampleRateChange: (value: string) => void;
  onBitDepthChange: (value: string) => void;
  onChannelsChange: (value: string) => void;
  samples: any[];
  hasChangesFromDefaults: boolean;
  onResetAll: () => void;
  onGeneratePatch: () => void;
  inputId: string;
}

export function GeneratePresetSection({
  type,
  hasLoadedSamples,
  hasPresetName,
  canGeneratePatch,
  loadedSamplesCount,
  editedSamplesCount,
  presetName,
  onPresetNameChange,
  sampleRate,
  bitDepth,
  channels,
  onSampleRateChange,
  onBitDepthChange,
  onChannelsChange,
  samples,
  hasChangesFromDefaults,
  onResetAll,
  onGeneratePatch,
  inputId
}: GeneratePresetSectionProps) {
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
      background: '#f8f9fa',
      borderTop: '1px solid #e0e0e0',
      padding: '1.5rem 2rem'
    }}>
      {/* Header with Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h3 style={{ 
          margin: '0',
          color: '#222',
          fontSize: '1.25rem',
          fontWeight: '300',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          generate preset
        </h3>
        
        {/* Buttons aligned with header */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={onResetAll}
            disabled={!hasChangesFromDefaults}
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '3px',
              backgroundColor: '#fff',
              color: hasChangesFromDefaults ? '#6b7280' : '#9ca3af',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: hasChangesFromDefaults ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: hasChangesFromDefaults ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (hasChangesFromDefaults) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (hasChangesFromDefaults) {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            <i className="fas fa-undo"></i>
            reset all
          </button>
          <button
            onClick={onGeneratePatch}
            disabled={!canGeneratePatch}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '3px',
              backgroundColor: canGeneratePatch ? '#222' : '#9ca3af',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: canGeneratePatch ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: canGeneratePatch ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (canGeneratePatch) {
                e.currentTarget.style.backgroundColor = '#444';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (canGeneratePatch) {
                e.currentTarget.style.backgroundColor = '#222';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <i className="fas fa-download"></i>
            save preset
          </button>
        </div>
      </div>

      {/* Preset Name and Audio Format Controls */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '1.5rem' : '4rem',
        alignItems: isMobile ? 'stretch' : 'end',
        justifyContent: isMobile ? 'flex-start' : 'space-between',
        marginBottom: '2rem',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid #e0e0e0'
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
      
      {/* Preset Size and Summary */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '1.5rem' : '2rem',
        alignItems: 'flex-start'
      }}>
        {/* Preset Size Indicator - 50% width */}
        <div style={{ 
          width: isMobile ? '100%' : '50%'
        }}>
          <PatchSizeIndicator type={type} />
        </div>
        
        {/* Preset Summary - 50% width */}
        <div style={{
          width: isMobile ? '100%' : '50%',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: '500',
            color: '#222',
            marginBottom: '0.25rem'
          }}>
            preset summary
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            fontSize: '0.8rem',
            color: '#666'
          }}>
            {/* Validation Message - only show when can't generate */}
            {!canGeneratePatch && !hasPresetName && (
              <div style={{
                color: '#666',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.25rem'
              }}>
                <i className="fas fa-exclamation-triangle" style={{ fontSize: '0.7rem', width: '12px', textAlign: 'center' }}></i>
                <span>enter preset name to continue</span>
              </div>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className={`fas ${hasLoadedSamples ? 'fa-check' : 'fa-times'}`} 
                 style={{ color: '#666', fontSize: '0.7rem', width: '12px', textAlign: 'center' }}></i>
              <span>{loadedSamplesCount} {loadedSamplesCount === 1 ? 'sample' : 'samples'} loaded</span>
            </div>
            
            {/* Show load samples message when no samples but have preset name */}
            {!canGeneratePatch && hasPresetName && !hasLoadedSamples && (
              <div style={{
                color: '#666',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.25rem'
              }}>
                <i className="fas fa-exclamation-triangle" style={{ fontSize: '0.7rem', width: '12px', textAlign: 'center' }}></i>
                <span>load samples to continue</span>
              </div>
            )}
            
            {/* Only show custom settings info when samples are loaded and settings have been changed */}
            {hasLoadedSamples && editedSamplesCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fas fa-info-circle" style={{ color: '#666', fontSize: '0.7rem', width: '12px', textAlign: 'center' }}></i>
                <span>{editedSamplesCount} {editedSamplesCount === 1 ? 'sample' : 'samples'} with custom settings</span>
              </div>
            )}
            
            {/* File Format Info - only show when ready to generate */}
            {canGeneratePatch && (
              <div style={{
                color: '#666',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem'
              }}>
                <i className="fas fa-file-archive" style={{ fontSize: '0.7rem', width: '12px', textAlign: 'center' }}></i>
                <span>saves as '{presetName}.preset.zip'</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 