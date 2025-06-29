import { useEffect } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // in milliseconds, default 5000
}

interface NotificationSystemProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function NotificationSystem({ notifications, onDismiss }: NotificationSystemProps) {
  // Auto-dismiss notifications after their duration
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    notifications.forEach(notification => {
      const duration = notification.duration || 5000;
      const timer = setTimeout(() => {
        onDismiss(notification.id);
      }, duration);
      timers.push(timer);
    });
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, onDismiss]);

  if (notifications.length === 0) return null;

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'fa-check-circle';
      case 'error': return 'fa-exclamation-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'info': return 'fa-info-circle';
      default: return 'fa-info-circle';
    }
  };

  const getColors = (type: NotificationType) => {
    switch (type) {
      case 'success': return { bg: '#d4edda', border: '#c3e6cb', text: '#155724', icon: '#28a745' };
      case 'error': return { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24', icon: '#dc3545' };
      case 'warning': return { bg: '#fff3cd', border: '#ffeaa7', text: '#856404', icon: '#ffc107' };
      case 'info': return { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460', icon: '#17a2b8' };
      default: return { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460', icon: '#17a2b8' };
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '400px',
      fontFamily: '"Montserrat", "Arial", sans-serif'
    }}>
      {notifications.map(notification => {
        const colors = getColors(notification.type);
        const icon = getIcon(notification.type);
        
        return (
          <div
            key={notification.id}
            style={{
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              padding: '12px 16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              color: colors.text,
              position: 'relative',
              animation: 'slideInRight 0.3s ease-out'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <i 
                className={`fas ${icon}`} 
                style={{ 
                  color: colors.icon, 
                  fontSize: '16px',
                  marginTop: '2px',
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '600',
                  fontSize: '14px',
                  marginBottom: '4px'
                }}>
                  {notification.title}
                </div>
                <div style={{
                  fontSize: '13px',
                  lineHeight: '1.4',
                  opacity: 0.9
                }}>
                  {notification.message}
                </div>
              </div>
              <button
                onClick={() => onDismiss(notification.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.text,
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0',
                  opacity: 0.7,
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                }}
              >
                <i className="fas fa-times" />
              </button>
            </div>
          </div>
        );
      })}
      
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
} 