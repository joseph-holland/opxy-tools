import React, { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { FileDetailsBadges } from '../common/FileDetailsBadges';
import { WaveformEditor } from '../common/WaveformEditor';

interface MultisampleSampleTableProps {
  onFileUpload: (index: number, file: File) => void;
  onClearSample: (index: number) => void;
  onRecordSample: (index: number) => void;
}

export function MultisampleSampleTable({ 
  onFileUpload, 
  onClearSample,
  onRecordSample 
}: MultisampleSampleTableProps) {
  const { state, dispatch } = useAppContext();
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // MIDI note conversion helpers
  // const midiNoteToString = (midiNote: number): string => {
  //   if (midiNote < 0 || midiNote > 127) return 'N/A';
  //   const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  //   const octave = Math.floor(midiNote / 12) - 1;
  //   const note = noteNames[midiNote % 12];
  //   return `${note}${octave}`;
  // };

  const noteStringToMidi = (noteStr: string): number => {
    const match = noteStr.match(/^([A-G])(#|b)?(\d+)$/i);
    if (!match) return -1;
    
    const noteMap: { [key: string]: number } = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const [, note, accidental, octaveStr] = match;
    const baseNote = noteMap[note.toUpperCase()];
    if (baseNote === undefined) return -1;
    
    const octave = parseInt(octaveStr);
    let midiNote = (octave + 1) * 12 + baseNote;
    
    if (accidental === '#') midiNote += 1;
    else if (accidental === 'b') midiNote -= 1;
    
    return (midiNote >= 0 && midiNote <= 127) ? midiNote : -1;
  };

  const parseNoteInput = (input: string): number => {
    const trimmed = input.trim().toUpperCase();
    
    // Check if it's a MIDI number
    if (/^\d+$/.test(trimmed)) {
      const midiNum = parseInt(trimmed);
      return (midiNum >= 0 && midiNum <= 127) ? midiNum : -1;
    }
    
    // Try to parse as note name
    return noteStringToMidi(trimmed);
  };

  const handleFileInputChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onFileUpload(index, file);
    }
    // Clear the input
    e.target.value = '';
  };

  const handleNoteChange = (index: number, noteStr: string) => {
    const midiNote = parseNoteInput(noteStr);
    if (midiNote !== -1) {
      dispatch({
        type: 'UPDATE_MULTISAMPLE_FILE',
        payload: {
          index,
          updates: { 
            rootNote: midiNote,
            note: noteStr
          }
        }
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveredIndex(index);
  };

  const handleDragLeave = () => {
    setHoveredIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setHoveredIndex(null);
    
    if (draggedItem === null || draggedItem === targetIndex) {
      setDraggedItem(null);
      return;
    }

    // Reorder samples using the dispatch action
    dispatch({
      type: 'REORDER_MULTISAMPLE_FILES',
      payload: { fromIndex: draggedItem, toIndex: targetIndex }
    });

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setHoveredIndex(null);
  };

  const playSample = (index: number) => {
    const sample = state.multisampleFiles[index];
    if (!sample?.audioBuffer) return;

    // Create audio context and play sample
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createBufferSource();
    source.buffer = sample.audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  };

  const toggleRowExpansion = (index: number) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  const renderSampleRow = (sample: typeof state.multisampleFiles[0], index: number) => {
    const isExpanded = expandedRow === index;
    const isDraggedOver = hoveredIndex === index;
    const isDragging = draggedItem === index;

    return (
      <div
        key={index}
        draggable={sample.isLoaded}
        onDragStart={(e) => handleDragStart(e, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, index)}
        onDragEnd={handleDragEnd}
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          marginBottom: '0.5rem',
          backgroundColor: isDraggedOver ? '#f0f9ff' : isDragging ? '#f8f9fa' : '#fff',
          opacity: isDragging ? 0.5 : 1,
          transition: 'all 0.2s ease'
        }}
      >
        {/* Main Sample Row */}
        <div
          style={{
            padding: '1rem',
            display: 'grid',
            gridTemplateColumns: '40px 1fr 140px 100px 80px 200px',
            gap: '1rem',
            alignItems: 'center',
            cursor: sample.isLoaded ? 'move' : 'default'
          }}
        >
          {/* Index */}
          <div style={{ 
            fontWeight: '600', 
            color: '#666',
            fontSize: '0.9rem',
            textAlign: 'center'
          }}>
            {index + 1}
          </div>

          {/* Sample Info */}
          <div>
            {sample.isLoaded ? (
              <div>
                <div style={{ fontWeight: '500', color: '#222', marginBottom: '0.25rem' }}>
                  {sample.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  <FileDetailsBadges
                    duration={sample.duration}
                    fileSize={sample.fileSize}
                    channels={sample.originalChannels}
                    bitDepth={sample.originalBitDepth}
                    sampleRate={sample.originalSampleRate}
                  />
                </div>
              </div>
            ) : (
              <div style={{ color: '#999', fontSize: '0.9rem' }}>
                empty slot
              </div>
            )}
          </div>

          {/* MIDI Note Input */}
          <div>
            {sample.isLoaded ? (
              <input
                type="text"
                value={sample.note || ''}
                onChange={(e) => handleNoteChange(index, e.target.value)}
                placeholder="C4 or 60"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '3px',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace'
                }}
              />
            ) : (
              <div style={{ color: '#999', fontSize: '0.875rem' }}>-</div>
            )}
          </div>

          {/* MIDI Number */}
          <div style={{ 
            fontFamily: 'monospace', 
            fontSize: '0.875rem',
            color: sample.isLoaded ? '#333' : '#999'
          }}>
            {sample.isLoaded ? sample.rootNote : '-'}
          </div>

          {/* Expand Button */}
          <div>
            {sample.isLoaded && (
              <button
                onClick={() => toggleRowExpansion(index)}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '3px',
                  backgroundColor: '#fff',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                edit
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            {!sample.isLoaded ? (
              <>
                <button
                  onClick={() => fileInputRefs.current[index]?.click()}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: 'none',
                    borderRadius: '3px',
                    backgroundColor: '#333',
                    color: '#fff',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#555';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#333';
                  }}
                >
                  <i className="fas fa-upload"></i>
                </button>
                <button
                  onClick={() => onRecordSample(index)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '3px',
                    backgroundColor: '#fff',
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  <i className="fas fa-microphone"></i>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => playSample(index)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '3px',
                    backgroundColor: '#fff',
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  <i className="fas fa-play"></i>
                </button>
                <button
                  onClick={() => onClearSample(index)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '3px',
                    backgroundColor: '#fff',
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  <i className="fas fa-trash"></i>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Expanded Row Content */}
        {isExpanded && sample.isLoaded && sample.audioBuffer && (
          <div style={{
            borderTop: '1px solid #e0e0e0',
            padding: '1rem',
            backgroundColor: '#f9fafb'
          }}>
                         <WaveformEditor
               audioBuffer={sample.audioBuffer}
               inPoint={sample.inPoint}
               outPoint={sample.outPoint}
               onMarkersChange={(markers) => 
                 dispatch({
                   type: 'UPDATE_MULTISAMPLE_FILE',
                   payload: { index, updates: { inPoint: markers.inPoint, outPoint: markers.outPoint } }
                 })
               }
               height={120}
             />
          </div>
        )}

        {/* Hidden file input */}
                 <input
           ref={(el) => { fileInputRefs.current[index] = el; }}
           type="file"
           accept="audio/*,.wav"
           onChange={(e) => handleFileInputChange(index, e)}
           style={{ display: 'none' }}
         />
      </div>
    );
  };

  // Ensure we have at least some empty slots to show
  const displaySamples = [...state.multisampleFiles];
  while (displaySamples.length < 6) {
    displaySamples.push({
      file: null,
      audioBuffer: null,
      name: '',
      isLoaded: false,
      rootNote: 60,
      inPoint: 0,
      outPoint: 0
    });
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Table Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr 140px 100px 80px 200px',
        gap: '1rem',
        padding: '0.75rem 1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px 6px 0 0',
        border: '1px solid #e0e0e0',
        borderBottom: 'none',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#374151'
      }}>
        <div style={{ textAlign: 'center' }}>#</div>
        <div>sample</div>
        <div>note</div>
        <div>midi</div>
        <div></div>
        <div style={{ textAlign: 'right' }}>actions</div>
      </div>

      {/* Sample Rows */}
      <div style={{
        border: '1px solid #e0e0e0',
        borderRadius: '0 0 6px 6px',
        padding: '1rem'
      }}>
        {displaySamples.map((sample, index) => renderSampleRow(sample, index))}
      </div>
    </div>
  );
}