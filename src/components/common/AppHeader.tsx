import { useState, useEffect } from 'react';

export function AppHeader() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const titleFontSize = isMobile ? '2.4rem' : '2.8rem';
  const badgeFontSize = isMobile ? '0.75rem' : '0.9rem';
  const badgeGap = isMobile ? '6px' : '8px';
  const bottomPosition = isMobile ? '47%' : '47%';

  return (
    <div style={{
      marginBottom: '2rem'
    }}>
      <div style={{
        position: 'relative',
        display: 'inline-block',
        fontSize: titleFontSize,
        letterSpacing: '0.05em',
        fontFamily: '"Roboto", "Arial", sans-serif',
        color: 'var(--color-text-primary)'
      }}>
        OP-PatchLab
        <div style={{
          position: 'absolute',
          left: `calc(100% + ${badgeGap})`,
          bottom: bottomPosition,
          
          fontSize: badgeFontSize,
          fontWeight: 400,
          padding: '0.15rem 0.25rem',
          backgroundColor: 'transparent',
          color: 'var(--color-text-primary)',
          borderRadius: '3px',
          border: '1px solid var(--color-text-primary)',
          lineHeight: '1',
          whiteSpace: 'nowrap'
        }}>
          unofficial
        </div>
      </div>
    </div>
  );
}