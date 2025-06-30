import React from 'react';
import { PatchSizeIndicator } from './PatchSizeIndicator';

interface GeneratePresetSectionProps {
  type: 'drum' | 'multisample';
  hasLoadedSamples: boolean;
  hasPresetName: boolean;
  canGeneratePatch: boolean;
  loadedSamplesCount: number;
  editedSamplesCount: number;
  presetName: string;
  onClearAll: () => void;
  onGeneratePatch: () => void;
  isMobile?: boolean;
}

export function GeneratePresetSection({
  type,
  hasLoadedSamples,
  hasPresetName,
  canGeneratePatch,
  loadedSamplesCount,
  editedSamplesCount,
  presetName,
  onClearAll,
  onGeneratePatch,
  isMobile = false
}: GeneratePresetSectionProps) {
  return (
    <div style={{
      background: '#f8f9fa',
      borderTop: '1px solid #e0e0e0',
      padding: '1.5rem 2rem'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
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
            onClick={onClearAll}
            disabled={!hasLoadedSamples}
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '3px',
              backgroundColor: '#fff',
              color: hasLoadedSamples ? '#6b7280' : '#9ca3af',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: hasLoadedSamples ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: hasLoadedSamples ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (hasLoadedSamples) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (hasLoadedSamples) {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            <i className="fas fa-trash"></i>
            clear all
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className={`fas ${hasLoadedSamples ? 'fa-check' : 'fa-times'}`} 
                 style={{ color: '#666', fontSize: '0.7rem', width: '12px', textAlign: 'center' }}></i>
              <span>{loadedSamplesCount} samples loaded</span>
            </div>
            
            {/* Only show custom settings info when samples are loaded and settings have been changed */}
            {hasLoadedSamples && editedSamplesCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fas fa-info-circle" style={{ color: '#666', fontSize: '0.7rem', width: '12px', textAlign: 'center' }}></i>
                <span>{editedSamplesCount} samples with custom settings</span>
              </div>
            )}
            
            {/* Validation Message - only show when can't generate */}
            {!canGeneratePatch && (
              <div style={{
                color: '#666',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem'
              }}>
                <i className="fas fa-exclamation-triangle" style={{ fontSize: '0.7rem', width: '12px', textAlign: 'center' }}></i>
                <span>
                  {!hasPresetName ? 'enter preset name to continue' : 'load samples to continue'}
                </span>
              </div>
            )}
            
            {/* File Format Info - only show when ready to generate */}
            {canGeneratePatch && (
              <div style={{
                color: '#666',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem'
              }}>
                <i className="fas fa-file-archive" style={{ fontSize: '0.7rem', width: '12px', textAlign: 'center' }}></i>
                <span>saves as '{presetName}.preset.zip' for op-xy</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 