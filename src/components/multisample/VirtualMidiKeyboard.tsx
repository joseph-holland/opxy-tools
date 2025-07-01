import { useState, useCallback, useEffect, useRef } from 'react';

interface VirtualMidiKeyboardProps {
  assignedNotes?: number[]; // MIDI note numbers that have samples assigned
  onKeyClick?: (midiNote: number) => void;
  onUnassignedKeyClick?: (midiNote: number) => void;
  onKeyDrop?: (midiNote: number, files: File[]) => void;
  className?: string;
  loadedSamplesCount?: number; // Number of loaded samples
}

export function VirtualMidiKeyboard({ 
  assignedNotes = [], 
  onKeyClick,
  onUnassignedKeyClick,
  onKeyDrop,
  className = '',
  loadedSamplesCount = 0
}: VirtualMidiKeyboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const keyboardScrollRef = useRef<HTMLDivElement>(null);
  
  const [hoveredKey, setHoveredKey] = useState<number | null>(null);
  const [dragOverKey, setDragOverKey] = useState<number | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [dynamicStyles, setDynamicStyles] = useState({});
  const [placeholderHeight, setPlaceholderHeight] = useState(0);
  
  // Keyboard control state
  const [activeOctave, setActiveOctave] = useState(4); // Default to middle C (C4)
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  
  // Keyboard mapping - white keys (bottom row) and black keys (top row)
  const keyboardMapping = {
    // White keys (C, D, E, F, G, A, B)
    'a': 0,  // C
    's': 2,  // D  
    'd': 4,  // E
    'f': 5,  // F
    'g': 7,  // G
    'h': 9,  // A
    'j': 11, // B
    // Black keys (C#, D#, F#, G#, A#)
    'w': 1,  // C#
    'e': 3,  // D#
    't': 6,  // F#
    'y': 8,  // G#
    'u': 10  // A#
  };

  const togglePin = useCallback(() => {
    setIsPinned(!isPinned);
  }, [isPinned]);

  // Octave control functions
  const changeOctave = useCallback((direction: 'up' | 'down') => {
    setActiveOctave(prev => {
      if (direction === 'up' && prev < 9) return prev + 1;
      if (direction === 'down' && prev > -1) return prev - 1;
      return prev;
    });
  }, []);

  // Center the active octave in the viewport
  const centerActiveOctave = useCallback(() => {
    const scrollContainer = keyboardScrollRef.current;
    if (!scrollContainer) return;

    // Each octave is 7 white keys * 24px = 168px wide
    const octaveWidth = 7 * 24;
    const targetOctave = activeOctave + 1; // +1 because our octaves start from -1
    const targetPosition = targetOctave * octaveWidth;
    
    // Center the target octave in the viewport
    const containerWidth = scrollContainer.clientWidth;
    const scrollPosition = targetPosition - (containerWidth / 2) + (octaveWidth / 2);
    
    scrollContainer.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: 'smooth'
    });
  }, [activeOctave]);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Prevent default for our mapped keys to avoid browser shortcuts
      if (key in keyboardMapping || key === 'z' || key === 'x') {
        e.preventDefault();
      }
      
      // Handle octave switching
      if (key === 'z') {
        changeOctave('down');
        return;
      }
      if (key === 'x') {
        changeOctave('up');
        return;
      }
      
      // Handle note playing - only respond if there's a sample loaded
      if (key in keyboardMapping && !pressedKeys.has(key)) {
        const noteOffset = keyboardMapping[key as keyof typeof keyboardMapping];
        const midiNote = activeOctave * 12 + 12 + noteOffset; // +12 because C0 is MIDI note 12
        
        if (midiNote >= 0 && midiNote <= 127) {
          // Only trigger actions AND visual feedback if there's a sample assigned to this MIDI note
          if (assignedNotes.includes(midiNote)) {
            setPressedKeys(prev => new Set([...prev, key]));
            onKeyClick?.(midiNote);
          }
          // Do nothing if no sample is loaded - no visual feedback, no action calls
          // This prevents any response when there's nothing to play
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keyboardMapping) {
        setPressedKeys(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
     }, [activeOctave, pressedKeys, keyboardMapping, changeOctave, assignedNotes, onKeyClick, onUnassignedKeyClick]);

  // Center the keyboard on the active octave when it changes or on mount
  useEffect(() => {
    // Small delay to ensure the DOM is ready
    const timer = setTimeout(() => {
      centerActiveOctave();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [activeOctave, centerActiveOctave]);

  useEffect(() => {
    const container = containerRef.current;
    const placeholder = placeholderRef.current;

    const handleScroll = () => {
      if (!isPinned || !container || !placeholder) {
        return;
      }

      // The decision to STICK is based on the container's position.
      // The decision to UNSTICK is based on the placeholder's position.
      if (!isStuck) {
        const rect = container.getBoundingClientRect();
        if (rect.top <= 10) {
          // Time to STICK
          const { height, left, width } = rect;
          setPlaceholderHeight(height);
          setDynamicStyles({
            left: `${left}px`,
            width: `${width}px`,
          });
          setIsStuck(true);
        }
      } else {
        const placeholderRect = placeholder.getBoundingClientRect();
        if (placeholderRect.top > 10) {
          // Time to UNSTICK
          setDynamicStyles({});
          setIsStuck(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup on unpin
    if (!isPinned && isStuck) {
      setDynamicStyles({});
      setIsStuck(false);
    }
    
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

  // Helper function to get note name from MIDI number
  const getMidiNoteName = (midiNote: number): string => {
    if (midiNote < 0 || midiNote > 127) return '';
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const note = noteNames[midiNote % 12];
    return `${note}${octave}`;
  };

  // Helper function to get computer key for a MIDI note in the active octave
  const getComputerKeyForNote = (midiNote: number): string | null => {
    const noteOctave = Math.floor((midiNote - 12) / 12); // -12 because C0 is MIDI note 12
    if (noteOctave !== activeOctave) return null;
    
    const noteInOctave = (midiNote - 12) % 12;
    
    // Find the computer key that maps to this note
    for (const [key, offset] of Object.entries(keyboardMapping)) {
      if (offset === noteInOctave) {
        return key.toUpperCase();
      }
    }
    return null;
  };

  const handleKeyClick = useCallback((midiNote: number) => {
    const isAssigned = assignedNotes.includes(midiNote);
    
    if (isAssigned) {
      onKeyClick?.(midiNote);
    } else {
      onUnassignedKeyClick?.(midiNote);
    }
  }, [assignedNotes, onKeyClick, onUnassignedKeyClick]);

  const handleKeyMouseEnter = useCallback((midiNote: number) => {
    setHoveredKey(midiNote);
  }, []);

  const handleKeyMouseLeave = useCallback(() => {
    setHoveredKey(null);
  }, []);

  const handleKeyDragOver = useCallback((e: React.DragEvent, midiNote: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setDragOverKey(midiNote);
    }
  }, []);

  const handleKeyDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverKey(null);
  }, []);

  const handleKeyDrop = useCallback((e: React.DragEvent, midiNote: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverKey(null);
    
    const files = Array.from(e.dataTransfer.files);
    const wavFiles = files.filter(file => 
      file.type === 'audio/wav' || file.name.toLowerCase().endsWith('.wav')
    );
    
    if (wavFiles.length > 0) {
      onKeyDrop?.(midiNote, wavFiles);
    }
  }, [onKeyDrop]);

  // Generate all 128 MIDI keys
  const renderKeys = () => {
    const keys = [];
    
    // Group keys by octave for better layout
    for (let octave = -1; octave <= 9; octave++) {
      const octaveKeys = [];
      
      // White keys for this octave
      const whiteKeyOrder = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
      
      for (let i = 0; i < whiteKeyOrder.length; i++) {
        const noteInOctave = whiteKeyOrder[i];
        const midiNote = (octave + 1) * 12 + noteInOctave;
        
        if (midiNote < 0 || midiNote > 127) continue;
        
        const isAssigned = assignedNotes.includes(midiNote);
        const isHovered = hoveredKey === midiNote;
        const isDragOver = dragOverKey === midiNote;
        const computerKey = getComputerKeyForNote(midiNote);
        const isPressed = computerKey && pressedKeys.has(computerKey.toLowerCase());
        
        octaveKeys.push(
          <div
            key={`white-${midiNote}`}
            className="midi-key white-key"
            style={{
              position: 'relative',
              width: '24px',
              height: '120px',
              backgroundColor: isDragOver ? '#e5e7eb' : isPressed ? '#d1d5db' : isAssigned ? '#6b7280' : isHovered ? '#f3f4f6' : '#ffffff',
              border: isDragOver ? '2px solid #9ca3af' : '1px solid #d1d5db',
              borderRadius: '0 0 4px 4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: '500',
              color: isAssigned ? '#ffffff' : '#6b7280',
              padding: '2px',
              transition: 'all 0.1s ease',
              userSelect: 'none',
              boxShadow: isHovered ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              transform: isHovered ? 'translateY(-1px)' : 'none'
            }}
            onClick={() => handleKeyClick(midiNote)}
            onMouseEnter={() => handleKeyMouseEnter(midiNote)}
            onMouseLeave={handleKeyMouseLeave}
            onDragOver={(e) => handleKeyDragOver(e, midiNote)}
            onDragLeave={handleKeyDragLeave}
            onDrop={(e) => handleKeyDrop(e, midiNote)}
          >
            {/* Octave marker for C notes */}
            {octave >= 0 && octave <= 8 && noteInOctave === 0 && (
              <span style={{ fontSize: '8px', fontWeight: '600' }}>
                C{octave}
              </span>
            )}
          </div>
        );
      }
      
      // Black keys for this octave (positioned absolutely over white keys)
      const blackKeyPositions = [
        { noteInOctave: 1, position: 17 },   // C# - between C and D
        { noteInOctave: 3, position: 41 },   // D# - between D and E
        { noteInOctave: 6, position: 89 },   // F# - between F and G
        { noteInOctave: 8, position: 113 },  // G# - between G and A
        { noteInOctave: 10, position: 137 }  // A# - between A and B
      ];
      
      for (const { noteInOctave, position } of blackKeyPositions) {
        const midiNote = (octave + 1) * 12 + noteInOctave;
        
        if (midiNote < 0 || midiNote > 127) continue;
        
        const isAssigned = assignedNotes.includes(midiNote);
        const isHovered = hoveredKey === midiNote;
        const isDragOver = dragOverKey === midiNote;
        const computerKey = getComputerKeyForNote(midiNote);
        const isPressed = computerKey && pressedKeys.has(computerKey.toLowerCase());
        
        octaveKeys.push(
          <div
            key={`black-${midiNote}`}
            className="midi-key black-key"
            style={{
              position: 'absolute',
              left: `${position}px`,
              top: '0',
              width: '14px',
              height: '75px',
              backgroundColor: isDragOver ? '#9ca3af' : isPressed ? '#6b7280' : isAssigned ? '#374151' : isHovered ? '#374151' : '#1f2937',
              border: isDragOver ? '2px solid #6b7280' : '1px solid #111827',
              borderRadius: '0 0 2px 2px',
              cursor: 'pointer',
              zIndex: 2,
              transition: 'all 0.1s ease',
              userSelect: 'none',
              boxShadow: isHovered ? '0 2px 6px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.2)',
              transform: isHovered ? 'translateY(-1px)' : 'none'
            }}
            onClick={() => handleKeyClick(midiNote)}
            onMouseEnter={() => handleKeyMouseEnter(midiNote)}
            onMouseLeave={handleKeyMouseLeave}
            onDragOver={(e) => handleKeyDragOver(e, midiNote)}
            onDragLeave={handleKeyDragLeave}
            onDrop={(e) => handleKeyDrop(e, midiNote)}
          />
        );
      }
      
      keys.push(
        <div
          key={`octave-${octave}`}
          style={{
            position: 'relative',
            display: 'flex'
          }}
        >
          {octaveKeys}
        </div>
      );
    }
    
    return keys;
  };

  return (
    <>
      <div 
        ref={placeholderRef}
        style={{
          display: isStuck ? 'block' : 'none',
          height: `${placeholderHeight}px`,
          background: '#fff'
        }}
      />
      <div
        ref={containerRef}
        className={`virtual-midi-keyboard ${className} ${isPinned ? 'pinned' : ''}`}
        style={combinedStyles}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1rem 0.5rem 1rem',
          borderBottom: '1px solid #dee2e6',
          backgroundColor: '#fff'
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
            load and demo samples
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.875rem',
            color: '#666'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontWeight: '500'
            }}>
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
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={isPinned ? 'Unpin keyboard' : 'Pin keyboard to top'}
            >
              <i className="fas fa-thumbtack" style={{ fontSize: '14px' }}></i>
            </button>
          </div>
        </div>

        {/* Keyboard Container */}
        <div 
          ref={keyboardScrollRef}
          style={{
            backgroundColor: '#fff',
            border: 'none',
            borderRadius: '0',
            padding: '1rem',
            overflowX: 'auto',
            overflowY: 'hidden'
          }}>
          
          {/* Compact Indicator Strip Above Keyboard */}
          <div style={{
            position: 'relative',
            height: '18px', // Increased height to accommodate raised black key letters
            marginBottom: '0.5rem'
          }}>
            {/* Indicator strip positioned over active octave */}
            <div style={{
              position: 'absolute',
              left: `${(activeOctave + 1) * 168}px`, // Each octave is 7 keys * 24px = 168px
              width: '168px', // One octave width
              height: '18px', // Increased height to accommodate raised letters
              backgroundColor: '#666',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              zIndex: 3
            }}>
              {/* Position letters exactly centered on their corresponding keys */}
              
              {/* C key - A (white key 0-24px, center at 12px) */}
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '9px',
                fontWeight: '600',
                color: pressedKeys.has('a') ? '#ffd700' : '#fff',
                textShadow: pressedKeys.has('a') ? '0 0 2px rgba(255, 215, 0, 0.8)' : 'none',
                transition: 'all 0.1s ease'
              }}>
                A
              </div>
              
              {/* C# key - W (black key at 17px, width 14px, center at 17+7=24px) */}
              <div style={{
                position: 'absolute',
                left: '24px',
                top: '25%', // Raise black key indicators above white key indicators
                transform: 'translateY(-50%)',
                fontSize: '9px',
                fontWeight: '600',
                color: pressedKeys.has('w') ? '#ffd700' : '#fff',
                textShadow: pressedKeys.has('w') ? '0 0 2px rgba(255, 215, 0, 0.8)' : 'none',
                transition: 'all 0.1s ease'
              }}>
                W
              </div>
              
              {/* D key - S (white key 24-48px, center at 36px) */}
              <div style={{
                position: 'absolute',
                left: '36px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '9px',
                fontWeight: '600',
                color: pressedKeys.has('s') ? '#ffd700' : '#fff',
                textShadow: pressedKeys.has('s') ? '0 0 2px rgba(255, 215, 0, 0.8)' : 'none',
                transition: 'all 0.1s ease'
              }}>
                S
              </div>
              
              {/* D# key - E (black key at 41px, width 14px, center at 41+7=48px) */}
              <div style={{
                position: 'absolute',
                left: '48px',
                top: '25%', // Raise black key indicators above white key indicators
                transform: 'translateY(-50%)',
                fontSize: '9px',
                fontWeight: '600',
                color: pressedKeys.has('e') ? '#ffd700' : '#fff',
                textShadow: pressedKeys.has('e') ? '0 0 2px rgba(255, 215, 0, 0.8)' : 'none',
                transition: 'all 0.1s ease'
              }}>
                E
              </div>
              
              {/* E key - D (white key 48-72px, center at 60px) */}
              <div style={{
                position: 'absolute',
                left: '60px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '9px',
                fontWeight: '600',
                color: pressedKeys.has('d') ? '#ffd700' : '#fff',
                textShadow: pressedKeys.has('d') ? '0 0 2px rgba(255, 215, 0, 0.8)' : 'none',
                transition: 'all 0.1s ease'
              }}>
                D
              </div>
              
              {/* F key - F (white key 72-96px, center at 84px) */}
              <div style={{
                position: 'absolute',
                left: '84px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '9px',
                fontWeight: '600',
                color: pressedKeys.has('f') ? '#ffd700' : '#fff',
                textShadow: pressedKeys.has('f') ? '0 0 2px rgba(255, 215, 0, 0.8)' : 'none',
                transition: 'all 0.1s ease'
              }}>
                F
              </div>
              
              {/* F# key - T (black key at 89px, width 14px, center at 89+7=96px) */}
              <div style={{
                position: 'absolute',
                left: '96px',
                top: '25%', // Raise black key indicators above white key indicators
                transform: 'translateY(-50%)',
                fontSize: '9px',
                fontWeight: '600',
                color: pressedKeys.has('t') ? '#ffd700' : '#fff',
                textShadow: pressedKeys.has('t') ? '0 0 2px rgba(255, 215, 0, 0.8)' : 'none',
                transition: 'all 0.1s ease'
              }}>
                T
              </div>
              
              {/* G key - G (white key 96-120px, center at 108px) */}
              <div style={{
                position: 'absolute',
                left: '108px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '9px',
                fontWeight: '600',
                color: pressedKeys.has('g') ? '#ffd700' : '#fff',
                textShadow: pressedKeys.has('g') ? '0 0 2px rgba(255, 215, 0, 0.8)' : 'none',
                transition: 'all 0.1s ease'
              }}>
                G
              </div>
              
              {/* G# key - Y (black key at 113px, width 14px, center at 113+7=120px) */}
              <div style={{
                position: 'absolute',
                left: '120px',
                top: '25%', // Raise black key indicators above white key indicators
                transform: 'translateY(-50%)',
                fontSize: '9px',
                fontWeight: '600',
                color: pressedKeys.has('y') ? '#ffd700' : '#fff',
                textShadow: pressedKeys.has('y') ? '0 0 2px rgba(255, 215, 0, 0.8)' : 'none',
                transition: 'all 0.1s ease'
              }}>
                Y
              </div>
              
              {/* A key - H (white key 120-144px, center at 132px) */}
              <div style={{
                position: 'absolute',
                left: '132px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '9px',
                fontWeight: '600',
                color: pressedKeys.has('h') ? '#ffd700' : '#fff',
                textShadow: pressedKeys.has('h') ? '0 0 2px rgba(255, 215, 0, 0.8)' : 'none',
                transition: 'all 0.1s ease'
              }}>
                H
              </div>
              
              {/* A# key - U (black key at 137px, width 14px, center at 137+7=144px) */}
              <div style={{
                position: 'absolute',
                left: '144px',
                top: '25%', // Raise black key indicators above white key indicators
                transform: 'translateY(-50%)',
                fontSize: '9px',
                fontWeight: '600',
                color: pressedKeys.has('u') ? '#ffd700' : '#fff',
                textShadow: pressedKeys.has('u') ? '0 0 2px rgba(255, 215, 0, 0.8)' : 'none',
                transition: 'all 0.1s ease'
              }}>
                U
              </div>
              
              {/* B key - J (white key 144-168px, center at 156px) */}
              <div style={{
                position: 'absolute',
                left: '156px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '9px',
                fontWeight: '600',
                color: pressedKeys.has('j') ? '#ffd700' : '#fff',
                textShadow: pressedKeys.has('j') ? '0 0 2px rgba(255, 215, 0, 0.8)' : 'none',
                transition: 'all 0.1s ease'
              }}>
                J
              </div>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            minWidth: '1400px', // Ensure enough space for all keys
            height: '120px'
          }}>
            {renderKeys()}
          </div>
        </div>
      </div>
    </>
  );
} 