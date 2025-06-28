import { Button } from '@carbon/react';
import { useAppContext } from '../../context/AppContext';

export function DrumTool() {
  const { state } = useAppContext();

  return (
    <div>
      <div style={{
        marginBottom: '2.5rem',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <h3 style={{ 
          marginBottom: '1rem',
          color: '#222',
          fontFamily: '"Montserrat", "Arial", sans-serif'
        }}>
          Drum Sample Tool
        </h3>
        
        <p style={{ 
          color: '#666',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          Create custom drum presets for the OP-XY. Drag and drop up to 16 samples onto the drum grid below.
        </p>

        {/* Drum grid placeholder */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {Array.from({ length: 16 }, (_, index) => (
            <div
              key={index}
              style={{
                background: '#f8f9fa',
                border: '1px solid #ced4da',
                borderRadius: '0.375rem',
                padding: '2rem 1rem',
                textAlign: 'center',
                color: '#666',
                fontSize: '0.9rem',
                minHeight: '100px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <div>Pad {index + 1}</div>
              {state.drumSamples[index]?.isLoaded ? (
                <div style={{ color: '#222', fontWeight: '500', marginTop: '0.5rem' }}>
                  {state.drumSamples[index].name}
                </div>
              ) : (
                <div style={{ marginTop: '0.5rem' }}>
                  Drop sample here
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Button kind="primary" disabled>
            Generate Patch
          </Button>
          <Button kind="secondary" disabled>
            Clear All
          </Button>
        </div>
      </div>
    </div>
  );
}