import React, { useState, useCallback, useMemo } from 'react';
import { Toggle } from '@carbon/react';

interface ADSRValues {
  attack: number;   // 0-32767 (time)
  decay: number;    // 0-32767 (time)
  sustain: number;  // 0-32767 (level)
  release: number;  // 0-32767 (time)
}

interface ADSREnvelopeProps {
  ampEnvelope: ADSRValues;
  filterEnvelope: ADSRValues;
  onAmpEnvelopeChange: (envelope: ADSRValues) => void;
  onFilterEnvelopeChange: (envelope: ADSRValues) => void;
  width?: number;
  height?: number;
}

// Convert 0-32767 to 0-100% for display
const valueToPercent = (value: number): number => Math.round((value / 32767) * 100);

// Convert 0-100% to 0-32767 for storage
const percentToValue = (percent: number): number => Math.round((percent / 100) * 32767);

// Generate mathematically accurate exponential curve points
const generateExponentialCurve = (
  startX: number, 
  endX: number, 
  startY: number, 
  endY: number, 
  isRising: boolean, 
  numPoints: number = 20
): Array<{x: number, y: number}> => {
  const points: Array<{x: number, y: number}> = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints; // 0 to 1
    const x = startX + t * (endX - startX);
    
    let y: number;
    if (isRising) {
      // Attack phase: exponential rise (concave) - y = 1 - e^(-4*t)
      const expValue = 1 - Math.exp(-4 * t);
      y = startY + expValue * (endY - startY);
    } else {
      // Decay/Release phase: exponential decay (convex) - y = e^(-4*t)
      const expValue = Math.exp(-4 * t);
      y = startY + (1 - expValue) * (endY - startY);
    }
    
    points.push({ x, y });
  }
  
  return points;
};

const generateExponentialCurveWithFactor = (
  startX: number, 
  endX: number, 
  startY: number, 
  endY: number, 
  factor: number, 
  numPoints: number = 20
): Array<{x: number, y: number}> => {
  const points: Array<{x: number, y: number}> = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const x = startX + (endX - startX) * t;
    
    // Convex curve with custom factor (fast start, slow finish)
    const exponentialT = Math.exp(-factor * t);
    const y = startY + (endY - startY) * (1 - exponentialT);
    
    points.push({ x, y });
  }
  
  return points;
};

const generatePowerCurve = (
  startX: number, 
  endX: number, 
  startY: number, 
  endY: number, 
  power: number, 
  numPoints: number = 20
): Array<{x: number, y: number}> => {
  const points: Array<{x: number, y: number}> = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const x = startX + (endX - startX) * t;
    
    // Power curve: y = t^power (power < 1 = concave, power > 1 = convex)
    const poweredT = Math.pow(t, power);
    const y = startY + (endY - startY) * poweredT;
    
    points.push({ x, y });
  }
  
  return points;
};

export const ADSREnvelope: React.FC<ADSREnvelopeProps> = ({
  ampEnvelope,
  filterEnvelope,
  onAmpEnvelopeChange,
  onFilterEnvelopeChange,
  width = 600,
  height = 250
}) => {
  const [activeEnvelope, setActiveEnvelope] = useState<'amp' | 'filter'>('amp');
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentEnvelope = activeEnvelope === 'amp' ? ampEnvelope : filterEnvelope;
  const inactiveEnvelope = activeEnvelope === 'amp' ? filterEnvelope : ampEnvelope;

  // Calculate fixed positions based on OP-XY style constraints
  const getPhasePositions = useCallback((envelope: ADSRValues) => {
    const padding = 3;
    const maxY = 10;
    const minY = height - 10;
    const sustainLevel = valueToPercent(envelope.sustain);
    const sustainY = minY - (sustainLevel / 100) * (minY - maxY);
    
    // Attack: constrained to left 28% of canvas, moves along top edge only
    const attackTimePercent = valueToPercent(envelope.attack);
    const maxAttackX = padding + (width - padding * 2) * 0.28; // 28% of canvas width
    const attackX = padding + (attackTimePercent / 100) * (maxAttackX - padding);
    
    // Decay: 26% max width, starting from attack position
    // Allow decay to be 0 for instant drop to sustain level
    const decayTimePercent = valueToPercent(envelope.decay);
    const maxDecayWidth = (width - padding * 2) * 0.26; // 26% of canvas width max
    const decayX = decayTimePercent === 0 ? attackX : attackX + (decayTimePercent / 100) * maxDecayWidth;
    
    // Release: constrained to right 28% of canvas, controls both sustain level and release time
    const releaseTimePercent = valueToPercent(envelope.release);
    const minReleaseX = (width - padding) - (width - padding * 2) * 0.28; // 28% from right edge
    // Reverse the positioning: 100% = left side, 0% = right side
    const releaseX = minReleaseX + ((100 - releaseTimePercent) / 100) * ((width - padding) - minReleaseX);
    
    // Sustain: extends from decay to release start
    const sustainStartX = Math.max(decayX, attackX + (decayTimePercent === 0 ? 0 : 20)); // No minimum distance if decay is 0
    const sustainEndX = releaseX;
    
    return {
      start: { x: padding, y: minY },
      attack: { x: attackX, y: maxY },
      decay: { x: decayX, y: sustainY },
      sustainStart: { x: sustainStartX, y: sustainY },
      sustainEnd: { x: sustainEndX, y: sustainY },
      release: { x: releaseX, y: sustainY }, // Release handle at sustain level
      releaseEnd: { x: width - padding, y: minY } // Release curve ends at bottom right edge
    };
  }, [width, height]);

  // Generate SVG path using fixed positions
  const generateEnvelopePath = useCallback((envelope: ADSRValues, isActive: boolean) => {
    const positions = getPhasePositions(envelope);
    
    // Start at bottom left
    const pathPoints: Array<{x: number, y: number}> = [positions.start];
    
    // Attack phase - simulate curve that would go 21% higher, but cut off at attack peak
    const attackHeight = positions.start.y - positions.attack.y;
    const fullCurveHeight = attackHeight / 0.79; // What the full curve height would be (100% - 21% = 79%)
    const virtualEndY = positions.start.y - fullCurveHeight; // Where full curve would end (above canvas)
    
    // Generate the full exponential curve to the virtual end point
    const fullAttackCurve = generateExponentialCurveWithFactor(
      positions.start.x, 
      positions.attack.x, 
      positions.start.y, 
      virtualEndY, // This goes beyond the visible area
      1.5 // Gentle exponential factor
    );
    
    // Now map each point to only show the first 76% of the curve progression
    const attackCurve = fullAttackCurve.map(point => {
      // If this point would be above our attack handle, clamp it
      const clampedY = Math.max(positions.attack.y, point.y);
      return { x: point.x, y: clampedY };
    });
    
    // Add all attack curve points except the first (which is the start point)
    pathPoints.push(...attackCurve.slice(1));
    
    // Decay phase - exponential decay: starts quickly, eases into sustain (convex)
    const decayTimePercent = valueToPercent(envelope.decay);
    if (decayTimePercent === 0) {
      // Instant drop - straight vertical line to sustain level
      pathPoints.push({ x: positions.attack.x, y: positions.sustainStart.y });
    } else {
      // Normal exponential decay curve: fast start, slow finish
      const decayCurve = generateExponentialCurve(
        positions.attack.x, 
        positions.decay.x, 
        positions.attack.y, 
        positions.sustainStart.y, // Ensure we end at sustain level
        false // Convex curve: fast start, slow finish
      );
      pathPoints.push(...decayCurve.slice(1));
    }
    
    // Sustain phase - linear (constant level) - start from where decay ended
    pathPoints.push(positions.sustainEnd);
    
    // Release phase - exponential fade: faster at first, then tapering (convex)
    const releaseCurve = generateExponentialCurve(
      positions.sustainEnd.x, 
      positions.releaseEnd.x, 
      positions.sustainEnd.y, 
      positions.releaseEnd.y, 
      false // Convex curve: fast start, slow finish
    );
    pathPoints.push(...releaseCurve.slice(1));
    
    // Convert points to SVG path
    let pathCommands = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 1; i < pathPoints.length; i++) {
      pathCommands += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
    }
    
    return pathCommands;
  }, [getPhasePositions]);

  // Get handle positions for interactive dragging
  const getHandlePositions = useCallback((envelope: ADSRValues) => {
    const positions = getPhasePositions(envelope);
    
    return {
      attack: positions.attack,     // Moves along top edge only
      decay: positions.decay,       // Controls both decay time (horizontal) and sustain level (vertical)
      release: positions.release    // Controls both sustain level (vertical) and release time (horizontal)
    };
  }, [getPhasePositions]);

  // Handle mouse interactions
  const handleMouseDown = useCallback((event: React.MouseEvent<SVGElement>) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    
    // Convert screen coordinates to SVG coordinates
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    
    // Scale coordinates from screen space to SVG viewBox space
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const x = screenX * scaleX;
    const y = screenY * scaleY;
    
    const positions = getHandlePositions(currentEnvelope);
    const handleSize = 20; // Increased hit area for easier grabbing
    
    // Check which handle was clicked
    for (const [handleName, pos] of Object.entries(positions)) {
      if (Math.abs(x - pos.x) <= handleSize && Math.abs(y - pos.y) <= handleSize) {
        setIsDragging(handleName);
        setDragStart({ x, y });
        
        // Store the SVG rect for global mouse events
        const svgRect = svg.getBoundingClientRect();
        
        // Add global mouse event listeners to prevent losing drag when leaving canvas
        const handleGlobalMouseMove = (e: MouseEvent) => {
          // Convert screen coordinates to SVG coordinates
          const screenX = e.clientX - svgRect.left;
          const screenY = e.clientY - svgRect.top;
          
          // Scale coordinates from screen space to SVG viewBox space
          const scaleX = width / svgRect.width;
          const scaleY = height / svgRect.height;
          const globalX = screenX * scaleX;
          const globalY = screenY * scaleY;
          
          const newEnvelope = { ...currentEnvelope };
          const padding = 3;
          const maxY = 10;
          const minY = height - 10;
          
          if (handleName === 'attack') {
            // Attack: constrained to move horizontally along top edge, max 28% of canvas width
            const maxAttackX = padding + (width - padding * 2) * 0.28;
            const constrainedX = Math.max(padding, Math.min(maxAttackX, globalX));
            const attackPercent = ((constrainedX - padding) / (maxAttackX - padding)) * 100;
            newEnvelope.attack = percentToValue(attackPercent);
            
                     } else if (handleName === 'decay') {
             // Decay: controls both decay time (horizontal) and sustain level (vertical)
             const positions = getPhasePositions(currentEnvelope);
             
             // Horizontal movement for decay time - 26% max width from attack position
             const maxDecayWidth = (width - padding * 2) * 0.26;
             const maxDecayX = positions.attack.x + maxDecayWidth;
             const constrainedX = Math.max(positions.attack.x, Math.min(maxDecayX, globalX));
             
             // Calculate decay percentage based on distance from attack
             const decayPercent = constrainedX === positions.attack.x ? 0 : ((constrainedX - positions.attack.x) / maxDecayWidth) * 100;
             newEnvelope.decay = percentToValue(decayPercent);
            
            // Vertical movement for sustain level
            const levelPercent = Math.max(0, Math.min(100, (1 - (globalY - maxY) / (minY - maxY)) * 100));
            newEnvelope.sustain = percentToValue(levelPercent);
            
                     } else if (handleName === 'release') {
             // Release: controls both sustain level (vertical) and release time (horizontal)
             // Horizontal movement for release time - constrained to right 28% of canvas
             const minReleaseX = (width - padding) - (width - padding * 2) * 0.28;
             const maxReleaseX = width - padding;
             const constrainedX = Math.max(minReleaseX, Math.min(maxReleaseX, globalX));
             // Reverse the percentage calculation: left = 100%, right = 0%
             const releasePercent = 100 - ((constrainedX - minReleaseX) / (maxReleaseX - minReleaseX)) * 100;
             newEnvelope.release = percentToValue(releasePercent);
            
            // Vertical movement for sustain level
            const levelPercent = Math.max(0, Math.min(100, (1 - (globalY - maxY) / (minY - maxY)) * 100));
            newEnvelope.sustain = percentToValue(levelPercent);
          }
          
          // Update the appropriate envelope
          if (activeEnvelope === 'amp') {
            onAmpEnvelopeChange(newEnvelope);
          } else {
            onFilterEnvelopeChange(newEnvelope);
          }
        };
        
        const handleGlobalMouseUp = () => {
          setIsDragging(null);
          document.removeEventListener('mousemove', handleGlobalMouseMove);
          document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
        
        // Add global listeners
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
        
        break;
      }
    }
  }, [currentEnvelope, getHandlePositions, activeEnvelope, height, width, onAmpEnvelopeChange, onFilterEnvelopeChange, getPhasePositions]);

  // Simplified mouse move handler for when dragging inside SVG
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGElement>) => {
    // This is now only for hover effects or other non-drag interactions
    // Actual dragging is handled by global listeners
  }, []);

  const handleMouseUp = useCallback(() => {
    // This is now handled by global listeners, but keep for safety
    setIsDragging(null);
  }, []);

  // Render handles for the active envelope
  const renderHandles = useCallback((envelope: ADSRValues) => {
    const positions = getHandlePositions(envelope);
    const handleSize = 6;
    const hitAreaSize = 15; // Larger invisible hit area
    
    return Object.entries(positions).map(([name, pos]) => (
      <g key={name}>
        {/* Larger invisible hit area for easier clicking */}
        <circle
          cx={Math.round(pos.x)}
          cy={Math.round(pos.y)}
          r={hitAreaSize}
          fill="transparent"
          style={{ cursor: 'grab' }}
        />
        {/* Visible handle - using circle to prevent stretching */}
        <rect
          x={Math.round(pos.x - handleSize)}
          y={Math.round(pos.y - handleSize)}
          width={handleSize * 2}
          height={handleSize * 2}
          rx="3"
          ry="3"
          fill="#333333"
          stroke="#ffffff"
          strokeWidth="0.5"
          style={{ cursor: 'grab', pointerEvents: 'none' }}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    ));
  }, [getHandlePositions]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1rem',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '1rem',
      backgroundColor: '#fafafa',
      width: '50%'
    }}>
      {/* Header with envelope selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '500' }}>adsr envelopes</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Toggle
            id="envelope-toggle"
            labelA="amp"
            labelB="filter"
            toggled={activeEnvelope === 'filter'}
            onToggle={(checked) => setActiveEnvelope(checked ? 'filter' : 'amp')}
            size="sm"
          />
        </div>
      </div>
      
      {/* SVG envelope display */}
      <svg 
        width="100%" 
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ 
          border: '1px solid #ccc',
          borderRadius: '3px',
          backgroundColor: '#ffffff',
          cursor: isDragging ? 'grabbing' : 'crosshair'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background */}
        <rect width={width} height={height} fill="#ffffff" />
        
        {/* Inactive envelope (background) */}
        <path
          d={generateEnvelopePath(inactiveEnvelope, false)}
          fill="none"
          stroke="#cccccc"
          strokeWidth="3"
          opacity="0.5"
        />
        
        {/* Active envelope (foreground) */}
        <path
          d={generateEnvelopePath(currentEnvelope, true)}
          fill="none"
          stroke="#333333"
          strokeWidth="3"
        />
        
        {/* Interactive handles for active envelope */}
        {renderHandles(currentEnvelope)}
      </svg>
      
      {/* Value display */}
              <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '1rem',
          fontSize: '0.875rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>attack</div>
            <div style={{ color: '#666' }}>{valueToPercent(currentEnvelope.attack)}%</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>decay</div>
            <div style={{ color: '#666' }}>{valueToPercent(currentEnvelope.decay)}%</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>sustain</div>
            <div style={{ color: '#666' }}>{valueToPercent(currentEnvelope.sustain)}%</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>release</div>
            <div style={{ color: '#666' }}>{valueToPercent(currentEnvelope.release)}%</div>
          </div>
        </div>
    </div>
  );
}; 