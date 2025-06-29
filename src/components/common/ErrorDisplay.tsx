import React from 'react';

interface ErrorDisplayProps {
  message: string;
  style?: React.CSSProperties;
}

export function ErrorDisplay({ message, style }: ErrorDisplayProps) {
  if (!message) return null;

  const defaultStyle: React.CSSProperties = {
    background: '#f8f9fa',
    border: '1px solid #e0e0e0',
    borderRadius: '3px',
    padding: '1rem',
    marginBottom: '1rem',
    color: '#666',
    fontSize: '0.9rem',
    ...style
  };

  return (
    <div style={defaultStyle}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem', color: '#666' }}></i>
      {message}
    </div>
  );
} 