import { useState, useCallback } from 'react';

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
  const [hoveredKey, setHoveredKey] = useState<number | null>(null);
  const [dragOverKey, setDragOverKey] = useState<number | null>(null);

  // Helper function to get note name from MIDI number
  const getMidiNoteName = (midiNote: number): string => {
    if (midiNote < 0 || midiNote > 127) return '';
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const note = noteNames[midiNote % 12];
    return `${note}${octave}`;
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
        
        octaveKeys.push(
          <div
            key={`white-${midiNote}`}
            className="midi-key white-key"
            style={{
              position: 'relative',
              width: '20px',
              height: '80px',
              backgroundColor: isDragOver ? '#e5e7eb' : isAssigned ? '#6b7280' : isHovered ? '#f3f4f6' : '#ffffff',
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
        { noteInOctave: 1, position: 15 },   // C#
        { noteInOctave: 3, position: 35 },   // D#
        { noteInOctave: 6, position: 75 },   // F#
        { noteInOctave: 8, position: 95 },   // G#
        { noteInOctave: 10, position: 115 }  // A#
      ];
      
      for (const { noteInOctave, position } of blackKeyPositions) {
        const midiNote = (octave + 1) * 12 + noteInOctave;
        
        if (midiNote < 0 || midiNote > 127) continue;
        
        const isAssigned = assignedNotes.includes(midiNote);
        const isHovered = hoveredKey === midiNote;
        const isDragOver = dragOverKey === midiNote;
        
        octaveKeys.push(
          <div
            key={`black-${midiNote}`}
            className="midi-key black-key"
            style={{
              position: 'absolute',
              left: `${position}px`,
              top: '0',
              width: '12px',
              height: '50px',
              backgroundColor: isDragOver ? '#9ca3af' : isAssigned ? '#374151' : isHovered ? '#374151' : '#1f2937',
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
            display: 'flex',
            marginRight: '1px'
          }}
        >
          {octaveKeys}
        </div>
      );
    }
    
    return keys;
  };

  return (
    <div className={`virtual-midi-keyboard ${className}`}>
      {/* Keyboard Container */}
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1rem',
        overflowX: 'auto',
        overflowY: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          minWidth: '1400px', // Ensure enough space for all keys
          height: '90px'
        }}>
          {renderKeys()}
        </div>
      </div>
    </div>
  );
} 