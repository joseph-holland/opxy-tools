import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { DrumKeyboard } from './DrumKeyboard';

interface DrumKeyboardContainerProps {
  onFileUpload?: (index: number, file: File) => void;
}

/**
 * DrumKeyboardContainer – visually matches the VirtualMidiKeyboard container and
 * provides identical pin / sticky behaviour while keeping the existing
 * DrumKeyboard component unchanged.
 */
export const DrumKeyboardContainer: React.FC<DrumKeyboardContainerProps> = ({ onFileUpload }) => {
  const { state } = useAppContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  const [isPinned, setIsPinned] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [dynamicStyles, setDynamicStyles] = useState<React.CSSProperties>({});
  const [placeholderHeight, setPlaceholderHeight] = useState(0);

  const loadedSamplesCount = state.drumSamples.filter(s => s.isLoaded).length;

  const togglePin = useCallback(() => {
    setIsPinned(prev => !prev);
  }, []);

  // Scroll handling for stick / unstick
  useEffect(() => {
    const container = containerRef.current;
    const placeholder = placeholderRef.current;

    const handleScroll = () => {
      if (!isPinned || !container || !placeholder) return;

      if (!isStuck) {
        const rect = container.getBoundingClientRect();
        if (rect.top <= 10) {
          // Stick
          setPlaceholderHeight(rect.height);
          setDynamicStyles({ left: `${rect.left}px`, width: `${rect.width}px` });
          setIsStuck(true);
        }
      } else {
        const rect = placeholder.getBoundingClientRect();
        if (rect.top > 10) {
          // Unstick
          setDynamicStyles({});
          setIsStuck(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isPinned, isStuck]);

  const combinedStyles: React.CSSProperties = {
    border: '1px solid #f0f0f0',
    borderRadius: '15px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    position: isStuck ? 'fixed' : 'relative',
    top: isStuck ? '10px' : undefined,
    zIndex: isStuck ? 1000 : undefined,
    ...dynamicStyles,
  };

  return (
    <>
      {/* Placeholder to avoid layout shift */}
      <div
        ref={placeholderRef}
        style={{ display: isStuck ? 'block' : 'none', height: `${placeholderHeight}px`, background: '#fff' }}
      />

      {/* Actual Keyboard Container */}
      <div
        ref={containerRef}
        className={`virtual-midi-keyboard ${isPinned ? 'pinned' : ''}`}
        style={combinedStyles}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1rem 0.5rem 1rem',
            borderBottom: '1px solid #dee2e6',
            backgroundColor: '#fff',
          }}
        >
          <h3
            style={{
              margin: 0,
              color: '#222',
              fontSize: '1.25rem',
              fontWeight: 300,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            demo samples
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              fontSize: '0.875rem',
              color: '#666',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 500,
              }}
            >
              <i className="fas fa-check-circle" style={{ color: '#666' }}></i>
              {loadedSamplesCount} / 24 loaded
            </div>
            <button
              onClick={togglePin}
              className="pin-button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              title={isPinned ? 'Unpin keyboard' : 'Pin keyboard to top'}
            >
              <i className="fas fa-thumbtack" style={{ fontSize: 14 }}></i>
            </button>
          </div>
        </div>

        {/* Drum Keyboard */}
        <div style={{ padding: '1rem' }}>
          <DrumKeyboard onFileUpload={onFileUpload} />
        </div>
      </div>
    </>
  );
}; 