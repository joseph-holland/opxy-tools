import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

// Drum key mapping for two octaves (matching legacy)
const drumKeyMap = [
  // Lower octave (octave 0)
  {
    // top row (offset like a real keyboard)
    W: { label: "KD2", idx: 1 }, // index 1 = sample 2
    E: { label: "SD2", idx: 3 }, // index 3 = sample 4
    R: { label: "CLP", idx: 5 }, // index 5 = sample 6
    Y: { label: "CH", idx: 8 },  // index 8 = sample 9
    U: { label: "OH", idx: 10 }, // index 10 = sample 11
    // bottom row
    A: { label: "KD1", idx: 0 },  // index 0 = sample 1
    S: { label: "SD1", idx: 2 },  // index 2 = sample 3
    D: { label: "RIM", idx: 4 },  // index 4 = sample 5
    F: { label: "TB", idx: 6 },   // index 6 = sample 7
    G: { label: "SH", idx: 7 },   // index 7 = sample 8
    H: { label: "CL", idx: 9 },   // index 9 = sample 10
    J: { label: "CAB", idx: 11 }, // index 11 = sample 12
  },
  // Upper octave (octave 1)
  {
    // top row (offset like a real keyboard)
    W: { label: "RC", idx: 12 },  // index 12 = sample 13
    E: { label: "CC", idx: 13 },  // index 13 = sample 14
    R: { label: "COW", idx: 15 }, // index 15 = sample 16
    Y: { label: "LC", idx: 18 },  // index 18 = sample 19
    U: { label: "HC", idx: 19 },  // index 19 = sample 20
    // bottom row
    A: { label: "LT", idx: 14 },  // index 14 = sample 15
    S: { label: "MT", idx: 16 },  // index 16 = sample 17
    D: { label: "HT", idx: 17 },  // index 17 = sample 18
    F: { label: "TRI", idx: 20 }, // index 20 = sample 21
    G: { label: "LT", idx: 21 },  // index 21 = sample 22
    H: { label: "WS", idx: 22 },  // index 22 = sample 23
    J: { label: "GUI", idx: 23 }, // index 23 = sample 24
  },
];

export function DrumKeyboard() {
  const { state } = useAppContext();
  const [currentOctave, setCurrentOctave] = useState(0);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  const playSample = (index: number) => {
    const sample = state.drumSamples[index];
    if (!sample?.isLoaded || !sample.audioBuffer) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createBufferSource();
      source.buffer = sample.audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error('Error playing sample:', error);
    }
  };

  const getDrumIdxForKey = (key: string) => {
    const mapping = drumKeyMap[currentOctave][key as keyof typeof drumKeyMap[0]];
    return mapping ? mapping.idx : null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      );
      
      if (isTyping) return;

      const key = e.key.toUpperCase();
      
      // Handle octave switching
      if (key === 'Z') {
        setCurrentOctave(0);
        return;
      }
      if (key === 'X') {
        setCurrentOctave(1);
        return;
      }

      // Handle sample playback
      const idx = getDrumIdxForKey(key);
      if (idx !== null && state.drumSamples[idx]) {
        playSample(idx);
        setPressedKeys(prev => new Set(prev).add(key));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      setPressedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentOctave, state.drumSamples]);

  const currentMap = drumKeyMap[currentOctave];

  // OP-XY key component with exact 1:1 and 1:1.5 ratios
  const OPXYKey = ({ 
    keyChar, 
    mapping, 
    isPressed, 
    isLarge = false,
    circleOffset = 'center' // 'left', 'right', or 'center'
  }: { 
    keyChar: string; 
    mapping?: { label: string; idx: number }; 
    isPressed: boolean;
    isLarge?: boolean;
    circleOffset?: 'left' | 'right' | 'center';
  }) => {
    const hasContent = mapping && state.drumSamples[mapping.idx]?.isLoaded;
    const isTopRow = ['W', 'E', 'R', 'Y', 'U'].includes(keyChar);
    const isActive = hasContent; // Key is only active when it has content
    
    // Key dimensions - exact 1:1 and 1:1.5 ratios
    const baseSize = 56; // Increased base size for more prominence
    const keyWidth = isLarge ? `${Math.round(baseSize * 1.5)}px` : `${baseSize}px`; // 84px vs 56px
    const keyHeight = `${baseSize}px`; // Always 56px for proper proportions
    
    // Circle positioning based on offset
    let circleStyle: React.CSSProperties = {
      position: 'absolute',
      width: '35px', // Scaled up proportionally
      height: '35px',
      borderRadius: '50%',
      background: !isActive ? '#333' : (isPressed ? '#666' : '#111'),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
      top: '50%',
      transform: 'translateY(-50%)',
      left: '50%',
      marginLeft: '-17.5px' // Half of width to center
    };

    let letterStyle: React.CSSProperties = {
      color: '#fff',
      fontSize: '21px', // Scaled up proportionally
      fontWeight: 'normal',
      pointerEvents: 'none',
      textTransform: 'lowercase'
    };

    // Apply offsets for large keys
    if (isLarge && circleOffset !== 'center') {
      if (circleOffset === 'right') {
        // W and U keys - right aligned
        circleStyle = {
          ...circleStyle,
          left: 'auto',
          right: '2px', // Account for outer ring size
          marginLeft: '0',
          transform: 'translateY(-50%)' // Keep vertical centering
        };
      } else if (circleOffset === 'left') {
        // R and Y keys - left aligned  
        circleStyle = {
          ...circleStyle,
          left: '2px', // Account for outer ring size
          marginLeft: '0',
          transform: 'translateY(-50%)' // Keep vertical centering
        };
      }
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: isTopRow ? 'column' : 'column-reverse',
        alignItems: 'center',
        gap: '4px'
      }}>
        {/* Drum label - above for top row, below for bottom row */}
        {mapping && (
          <div style={{
            fontSize: '11px',
            color: '#999',
            fontWeight: '500',
            textAlign: 'center',
            minHeight: '14px'
          }}>
            {mapping.label}
          </div>
        )}
        
        {/* Key button */}
        <button
          onClick={() => {
            if (!isActive) return; // Don't respond if inactive
            const idx = getDrumIdxForKey(keyChar);
            if (idx !== null) playSample(idx);
          }}
          onMouseDown={() => {
            if (!isActive) return; // Don't respond if inactive
            const idx = getDrumIdxForKey(keyChar);
            if (idx !== null) {
              // Simulate key press for mouse clicks
              const syntheticEvent = new KeyboardEvent('keydown', { key: keyChar });
              document.dispatchEvent(syntheticEvent);
            }
          }}
          onMouseUp={() => {
            if (!isActive) return; // Don't respond if inactive
            // Simulate key release for mouse clicks
            const syntheticEvent = new KeyboardEvent('keyup', { key: keyChar });
            document.dispatchEvent(syntheticEvent);
          }}
          style={{
            width: keyWidth,
            height: keyHeight,
            border: !isActive ? '1px solid #666' : '1px solid #000',
            borderRadius: '3px', // Reduced corner radius
            background: !isActive ? '#999' : (isPressed ? '#bdbdbd' : '#444444'),
            cursor: isActive ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isLarge && circleOffset === 'left' ? 'flex-start' : 
                           isLarge && circleOffset === 'right' ? 'flex-end' : 'center',
            transition: 'all 0.1s ease',
            position: 'relative',
            fontFamily: '"Montserrat", "Arial", sans-serif',
            boxShadow: isActive ? '0 4px 12px rgba(0, 0, 0, 0.18)' : '0 2px 6px rgba(0, 0, 0, 0.1)',
            opacity: isActive ? 1 : 0.6,
            padding: '0'
          }}
          onMouseEnter={(e) => {
            if (!isActive || isPressed) return;
            e.currentTarget.style.background = '#555';
          }}
          onMouseLeave={(e) => {
            if (!isActive || isPressed) return;
            e.currentTarget.style.background = '#444444';
          }}
        >
          {/* Outer ring around black circle */}
          <div style={{
            ...circleStyle,
            width: '52px', // Larger outer ring that touches key border
            height: '52px',
            background: 'transparent',
            border: !isActive ? '1px solid #666' : '1px solid #000',
            marginLeft: circleStyle.marginLeft === '0' ? '0' : '-26px' // Conditional centering
          }}>
            {/* Inner black circle */}
            <div style={{
              width: '35px',
              height: '35px',
              borderRadius: '50%',
              background: !isActive ? '#555' : '#222',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              {/* Computer key label */}
              <div style={{
                ...letterStyle,
                color: !isActive ? '#999' : '#fff'
              }}>
                {keyChar.toLowerCase()}
              </div>
            </div>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div style={{ 
      fontFamily: '"Montserrat", "Arial", sans-serif',
      userSelect: 'none'
    }}>
      {/* OP-XY Keyboard Layout - authentic hardware positioning */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0px',
        padding: '20px',
        background: '#f8f8f8',
        borderRadius: '8px',
        boxShadow: 'inset 0 0 5px rgba(0, 0, 0, 0.1)',
        maxWidth: '600px',
        margin: '0 auto 2rem'
      }}>
        {/* Top row - proper OP-XY spacing and sizing */}
        <div style={{ 
          display: 'flex', 
          gap: '0px', 
          alignItems: 'flex-end'
        }}>
          {/* W - Large key, right-aligned circle */}
          <OPXYKey
            keyChar="W"
            mapping={currentMap.W}
            isPressed={pressedKeys.has('W')}
            isLarge={true}
            circleOffset="right"
          />
          
          {/* E - Standard key */}
          <OPXYKey
            keyChar="E"
            mapping={currentMap.E}
            isPressed={pressedKeys.has('E')}
          />
          
          {/* R - Large key, left-aligned circle */}
          <OPXYKey
            keyChar="R"
            mapping={currentMap.R}
            isPressed={pressedKeys.has('R')}
            isLarge={true}
            circleOffset="left"
          />
          
          {/* Gap adjusted for alignment:
               With 0px gap: 4 + W(72) + E(48) + R(72) = R ends at 196px
               Need Y to start at: A(48) + S(48) + D(48) + F(48) = 192px, so Y should start at 192px
               Current position: 4 + W(72) + E(48) + R(72) = 196px, need 4px less
               Removing gap div to align perfectly with 0px spacing */}
          
          {/* Y - Large key, left-aligned circle - should align with G */}
          <OPXYKey
            keyChar="Y"
            mapping={currentMap.Y}
            isPressed={pressedKeys.has('Y')}
            isLarge={true}
            circleOffset="left"
          />
          
          {/* U - Large key, right-aligned circle */}
          <OPXYKey
            keyChar="U"
            mapping={currentMap.U}
            isPressed={pressedKeys.has('U')}
            isLarge={true}
            circleOffset="right"
          />
        </div>

        {/* Bottom row - full width, standard keys */}
        <div style={{ 
          display: 'flex', 
          gap: '0px',
          alignItems: 'flex-start'
        }}>
          {['A', 'S', 'D', 'F', 'G', 'H', 'J'].map(key => (
            <OPXYKey
              key={`bottom-${key}`}
              keyChar={key}
              mapping={currentMap[key as keyof typeof currentMap]}
              isPressed={pressedKeys.has(key)}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#666',
        lineHeight: '1.4'
      }}>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Current Octave: {currentOctave + 1}</strong>
        </div>
        Use keyboard keys to trigger samples<br />
        <strong>Z</strong> / <strong>X</strong> to switch octaves • <strong>A-J, W, E, R, Y, U</strong> to play samples
      </div>
    </div>
  );
} 