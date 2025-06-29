import { useAppContext } from '../../context/AppContext';
import { DrumTool } from '../drum/DrumTool';
import { MultisampleTool } from '../multisample/MultisampleTool';

export function MainTabs() {
  const { state, dispatch } = useAppContext();

  const handleTabChange = (tabName: 'drum' | 'multisample') => {
    dispatch({ type: 'SET_TAB', payload: tabName });
  };

  const tabStyle = {
    padding: '0.75rem 1.5rem',
    border: '1px solid #dee2e6',
    borderBottom: 'none',
    borderRadius: '15px 15px 0 0',
    background: '#f8f9fa',
    color: '#888',
    fontWeight: '500',
    fontFamily: '"Montserrat", "Arial", sans-serif',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginRight: '2px',
    position: 'relative' as const,
    zIndex: 1
  };

  const activeTabStyle = {
    ...tabStyle,
    background: '#fff',
    color: '#222',
    borderColor: '#dee2e6 #dee2e6 #fff',
    zIndex: 2,
    marginBottom: '-1px'
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Custom Tab Navigation */}
      <div style={{ 
        display: 'flex',
        marginBottom: '0',
        borderBottom: '1px solid #dee2e6'
      }}>
        <div
          style={state.currentTab === 'drum' ? activeTabStyle : tabStyle}
          onClick={() => handleTabChange('drum')}
          onMouseEnter={(e) => {
            if (state.currentTab !== 'drum') {
              e.currentTarget.style.background = '#e9ecef';
              e.currentTarget.style.color = '#495057';
            }
          }}
          onMouseLeave={(e) => {
            if (state.currentTab !== 'drum') {
              e.currentTarget.style.background = '#f8f9fa';
              e.currentTarget.style.color = '#888';
            }
          }}
        >
          drum
        </div>
        <div
          style={state.currentTab === 'multisample' ? activeTabStyle : tabStyle}
          onClick={() => handleTabChange('multisample')}
          onMouseEnter={(e) => {
            if (state.currentTab !== 'multisample') {
              e.currentTarget.style.background = '#e9ecef';
              e.currentTarget.style.color = '#495057';
            }
          }}
          onMouseLeave={(e) => {
            if (state.currentTab !== 'multisample') {
              e.currentTarget.style.background = '#f8f9fa';
              e.currentTarget.style.color = '#888';
            }
          }}
        >
          multisample
        </div>
      </div>
      
      {/* Tab Content */}
      <div style={{
        background: '#fff',
        borderRadius: state.currentTab === 'drum' ? '0 15px 15px 15px' : '15px 0 15px 15px',
        border: '1px solid #dee2e6',
        borderTop: 'none',
        minHeight: '500px',
        overflow: 'hidden'
      }}>
        {state.currentTab === 'drum' ? <DrumTool /> : <MultisampleTool />}
      </div>
    </div>
  );
}