import { useEffect, useState } from 'react';
import { ProgressBar, InlineLoading } from '@carbon/react';
import { useAppContext } from '../../context/AppContext';
import { calculatePatchSize, formatFileSize, getPatchSizeWarning, isPatchSizeValid } from '../../utils/audio';

interface PatchSizeIndicatorProps {
  type: 'drum' | 'multisample';
  className?: string;
}

export function PatchSizeIndicator({ type, className = '' }: PatchSizeIndicatorProps) {
  const { state } = useAppContext();
  const [patchSize, setPatchSize] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  // Get relevant audio buffers based on type
  const audioBuffers = type === 'drum' 
    ? state.drumSamples.filter(s => s.audioBuffer).map(s => s.audioBuffer!)
    : state.multisampleFiles.filter(f => f.audioBuffer).map(f => f.audioBuffer!);

  // Calculate patch size when samples or settings change
  useEffect(() => {
    const calculateSize = async () => {
      if (audioBuffers.length === 0) {
        setPatchSize(0);
        return;
      }

      setIsCalculating(true);
      try {
        const size = await calculatePatchSize(audioBuffers, {
          sampleRate: state.sampleRate,
          bitDepth: state.bitDepth,
          channels: state.channels,
        });
        setPatchSize(size);
      } catch (error) {
        console.error('Failed to calculate patch size:', error);
        setPatchSize(0);
      } finally {
        setIsCalculating(false);
      }
    };

    calculateSize();
  }, [audioBuffers.length, state.sampleRate, state.bitDepth, state.channels]);

  // Calculate percentage and get warning
  const maxSize = 8 * 1024 * 1024; // 8MB limit
  const percentage = Math.min(100, (patchSize / maxSize) * 100);
  const warning = getPatchSizeWarning(patchSize);
  const isValid = isPatchSizeValid(patchSize);

  // Determine progress bar status
  let progressStatus: 'finished' | 'error' | 'active' = 'finished';
  if (!isValid) {
    progressStatus = 'error';
  } else if (percentage >= 75) {
    progressStatus = 'active';
  }

  if (audioBuffers.length === 0) {
    return null;
  }

  return (
    <div className={`patch-size-indicator ${className}`} style={{ marginBottom: '1rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '0.5rem'
      }}>
        <span style={{ 
          fontSize: '0.9rem', 
          fontWeight: '500',
          color: '#222'
        }}>
          Patch Size
        </span>
        <span style={{ 
          fontSize: '0.9rem',
          color: isValid ? '#666' : '#d32f2f'
        }}>
          {isCalculating ? (
            <InlineLoading description="Calculating..." />
          ) : (
            `${formatFileSize(patchSize)} / 8.0 MB`
          )}
        </span>
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <ProgressBar
          label="Patch size progress"
          value={percentage}
          max={100}
          status={progressStatus}
          size="small"
          hideLabel
        />
      </div>

      {warning && (
        <div style={{
          fontSize: '0.8rem',
          color: isValid ? '#f57f17' : '#d32f2f',
          fontStyle: 'italic',
          marginTop: '0.25rem'
        }}>
          {warning}
        </div>
      )}

      <div style={{
        fontSize: '0.8rem',
        color: '#666',
        marginTop: '0.25rem'
      }}>
        {audioBuffers.length} sample{audioBuffers.length !== 1 ? 's' : ''} • 
        {' '}{state.sampleRate === 44100 ? '44.1' : state.sampleRate / 1000}kHz • 
        {' '}{state.bitDepth}bit • 
        {' '}{state.channels === 1 ? 'mono' : 'stereo'}
      </div>

      {/* Recommendations for optimization */}
      {percentage >= 85 && (
        <div style={{
          fontSize: '0.8rem',
          color: '#666',
          marginTop: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '0.25rem',
          border: '1px solid #e0e0e0'
        }}>
          <strong>Optimization tips:</strong>
          <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
            {state.sampleRate > 22050 && (
              <li>Reduce sample rate to 22kHz for smaller size</li>
            )}
            {state.bitDepth > 16 && (
              <li>Use 16-bit instead of 24-bit</li>
            )}
            {state.channels === 2 && (
              <li>Convert to mono if stereo imaging isn't needed</li>
            )}
            <li>Trim unused portions of samples</li>
          </ul>
        </div>
      )}
    </div>
  );
}