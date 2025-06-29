import { Content, Theme } from '@carbon/react';
import { AppHeader } from './components/common/AppHeader';
import { MainTabs } from './components/common/MainTabs';
import { AppContextProvider } from './context/AppContext';
import './theme/opxy-theme.scss';
import { useState, useEffect } from 'react';

function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <AppContextProvider>
      <Theme theme="white" className="opxy-theme">
        <div style={{ minHeight: '100vh', backgroundColor: '#fff' }}>
          <Content style={{ padding: isMobile ? '0.5rem' : '2rem' }}>
            <AppHeader />
            <MainTabs />
            
            {/* Footer - matching legacy */}
            <footer style={{ 
              textAlign: 'center', 
              marginTop: '3rem', 
              padding: '20px',
              fontSize: '0.9rem',
              color: '#aaa'
            }}>
              <div style={{ marginBottom: '1rem', color: '#999', fontSize: '0.85rem' }}>
                OP-XY is a trademark of teenage engineering. this is an unofficial tool and is not affiliated with or endorsed by teenage engineering. 
                this software is provided "as is" without warranty of any kind. use at your own risk. 
                for educational and personal use only.
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.2em',
                fontSize: '0.98em'
              }}>
                <span style={{ color: '#999' }}>v0.4.0</span>
                <a 
                  href="https://github.com/joseph-holland/opxy-tools" 
                  target="_blank" 
                  rel="noopener"
                  style={{ color: '#666' }}
                >
                  github
                </a>
                <a 
                  href="/CHANGELOG.txt" 
                  target="_blank" 
                  rel="noopener"
                  style={{ color: '#666' }}
                >
                  changelog
                </a>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                based on the awesome{' '}
                <a 
                  href="https://buba447.github.io/opxy-drum-tool/" 
                  target="_blank" 
                  rel="noopener"
                  style={{ color: '#666' }}
                >
                  opxy-drum-tool
                </a>
                {' '}created by zeitgeese
              </div>
            </footer>
          </Content>
        </div>
      </Theme>
    </AppContextProvider>
  );
}

export default App;
