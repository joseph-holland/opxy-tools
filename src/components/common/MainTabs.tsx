import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { useAppContext } from '../../context/AppContext';
import { DrumTool } from '../drum/DrumTool';
import { MultisampleTool } from '../multisample/MultisampleTool';

export function MainTabs() {
  const { state, dispatch } = useAppContext();

  const handleTabChange = (event: { selectedIndex: number }) => {
    const tabName = event.selectedIndex === 0 ? 'drum' : 'multisample';
    dispatch({ type: 'SET_TAB', payload: tabName });
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <Tabs 
        selectedIndex={state.currentTab === 'drum' ? 0 : 1}
        onChange={handleTabChange}
      >
        <TabList>
          <Tab>drum</Tab>
          <Tab>multisample</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <DrumTool />
          </TabPanel>
          <TabPanel>
            <MultisampleTool />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}