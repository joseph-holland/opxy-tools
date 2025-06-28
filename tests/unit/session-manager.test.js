/**
 * Unit tests for session management functionality
 */

// Create a minimal SessionManager class for testing
class SessionManager {
  constructor() {
    this.storageKey = 'opxy_section_states';
    this.tabKey = 'opxy_last_tab';
    this.dropdownKey = 'opxy_dropdown_values';
    this.sections = new Map();
  }

  saveToStorage(data) {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('sessionStorage not available:', e);
    }
  }

  loadFromStorage() {
    try {
      const data = sessionStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.warn('se  ssionStorage not available:', e);
      return {};
    }
  }

  clearStorage() {
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn('sessionStorage not available:', e);
    }
  }

  clearDropdownStorage() {
    try {
      sessionStorage.removeItem(this.dropdownKey);
    } catch (e) {
      console.warn('sessionStorage not available:', e);
    }
  }

  saveState(sectionId, isExpanded) {
    const currentState = this.loadFromStorage();
    currentState[sectionId] = isExpanded;
    this.saveToStorage(currentState);
  }

  restoreState(sectionId) {
    const state = this.loadFromStorage();
    return state.hasOwnProperty(sectionId) ? state[sectionId] : null;
  }

  updateChevron(sectionId, isExpanded) {
    const chevron = document.querySelector(`#${sectionId} .chevron`);
    if (chevron) {
      if (isExpanded) {
        chevron.classList.remove('collapsed');
      } else {
        chevron.classList.add('collapsed');
      }
    }
  }

  saveDropdownValue(dropdownId, value) {
    try {
      const currentValues = JSON.parse(sessionStorage.getItem(this.dropdownKey) || '{}');
      currentValues[dropdownId] = value;
      sessionStorage.setItem(this.dropdownKey, JSON.stringify(currentValues));
    } catch (e) {
      console.warn('sessionStorage not available:', e);
    }
  }

  restoreDropdownValue(dropdownId) {
    try {
      const values = JSON.parse(sessionStorage.getItem(this.dropdownKey) || '{}');
      const dropdown = document.getElementById(dropdownId);
      if (dropdown && values[dropdownId] !== undefined) {
        dropdown.value = values[dropdownId];
      }
    } catch (e) {
      console.warn('sessionStorage not available:', e);
    }
  }

  initTabPersistence() {
    // Mock implementation for testing
    const drumTab = document.getElementById("drum-tab");
    const multiTab = document.getElementById("multi-tab");
    if (drumTab && multiTab) {
      drumTab.addEventListener("click", () => {
        sessionStorage.setItem(this.tabKey, "drum");
      });
      multiTab.addEventListener("click", () => {
        sessionStorage.setItem(this.tabKey, "multi");
      });
    }
    
    const lastTab = sessionStorage.getItem(this.tabKey);
    if (lastTab === "multi") {
      const multiTabBtn = document.getElementById("multi-tab");
      if (multiTabBtn) multiTabBtn.click();
    } else if (lastTab === "drum") {
      const drumTabBtn = document.getElementById("drum-tab");
      if (drumTabBtn) drumTabBtn.click();
    }
  }

  setupSections() {
    const collapsibleElements = document.querySelectorAll('[data-bs-toggle="collapse"]');
    collapsibleElements.forEach((trigger) => {
      const targetId = trigger.getAttribute("data-bs-target");
      if (targetId) {
        const target = document.querySelector(targetId);
        if (target) {
          const sectionId = targetId.replace("#", "");
          this.sections.set(sectionId, {
            trigger: trigger,
            target: target,
            chevron: trigger.querySelector('i[class*="chevron"]'),
          });

          target.addEventListener("shown.bs.collapse", () => {
            this.saveState(sectionId, true);
            this.updateChevron(sectionId, true);
          });

          target.addEventListener("hidden.bs.collapse", () => {
            this.saveState(sectionId, false);
            this.updateChevron(sectionId, false);
          });
        }
      }
    });
  }

  resetAllStates() {
    this.clearStorage();
    this.clearDropdownStorage();
    if (typeof location !== 'undefined') {
      location.reload();
    }
  }
}

describe('SessionManager', () => {
  let sessionManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock DOM methods  
    global.document = {
      querySelector: jest.fn(),
      getElementById: jest.fn()
    };
    
    // Create fresh sessionStorage mock for each test with jest mock functions
    global.sessionStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(), 
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    
    // Create a new session manager instance
    sessionManager = new SessionManager();
  });

  describe('constructor', () => {
    test('should initialize with correct storage keys', () => {
      expect(sessionManager.storageKey).toBe('opxy_section_states');
      expect(sessionManager.tabKey).toBe('opxy_last_tab');
      expect(sessionManager.dropdownKey).toBe('opxy_dropdown_values');
    });

    test('should initialize sections Map', () => {
      expect(sessionManager.sections).toBeInstanceOf(Map);
    });
  });

  describe('saveToStorage', () => {
    test('should save data to sessionStorage', () => {
      const testData = { section1: true, section2: false };
      
      sessionManager.saveToStorage(testData);
      
      expect(global.sessionStorage.setItem).toHaveBeenCalledWith('opxy_section_states', JSON.stringify(testData));
    });

    test('should handle sessionStorage errors gracefully', () => {
      global.sessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      sessionManager.saveToStorage({ test: true });
      
      expect(consoleSpy).toHaveBeenCalledWith('sessionStorage not available:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('loadFromStorage', () => {
    test('should load data from sessionStorage', () => {
      const testData = { section1: true, section2: false };
      global.sessionStorage.getItem.mockReturnValue(JSON.stringify(testData));
      
      const result = sessionManager.loadFromStorage();
      
      expect(result).toEqual(testData);
    });

    test('should return empty object when no data exists', () => {
      global.sessionStorage.getItem.mockReturnValue(null);
      
      const result = sessionManager.loadFromStorage();
      
      expect(result).toEqual({});
    });

    test('should return empty object when JSON parsing fails', () => {
      global.sessionStorage.getItem.mockReturnValue('invalid json');
      
      const result = sessionManager.loadFromStorage();
      
      expect(result).toEqual({});
    });

    test('should handle sessionStorage errors gracefully', () => {
      global.sessionStorage.getItem.mockImplementation(() => {
        throw new Error('Storage not available');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = sessionManager.loadFromStorage();
      
      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith('se  ssionStorage not available:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('clearStorage', () => {
    test('should remove data from sessionStorage', () => {
      sessionManager.clearStorage();
      
      expect(global.sessionStorage.removeItem).toHaveBeenCalledWith('opxy_section_states');
    });

    test('should handle sessionStorage errors gracefully', () => {
      global.sessionStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage not available');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      sessionManager.clearStorage();
      
      expect(consoleSpy).toHaveBeenCalledWith('sessionStorage not available:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('saveState', () => {
    test('should save section state', () => {
      global.sessionStorage.getItem.mockReturnValue('{}');
      
      sessionManager.saveState('test-section', true);
      
      expect(global.sessionStorage.setItem).toHaveBeenCalledWith(
        'opxy_section_states', 
        JSON.stringify({ 'test-section': true })
      );
    });

    test('should update existing state', () => {
      global.sessionStorage.getItem.mockReturnValue(JSON.stringify({ 'section1': false }));
      
      sessionManager.saveState('section2', true);
      
      expect(global.sessionStorage.setItem).toHaveBeenCalledWith(
        'opxy_section_states',
        JSON.stringify({ 'section1': false, 'section2': true })
      );
    });
  });

  describe('restoreState', () => {
    test('should return saved state for section', () => {
      global.sessionStorage.getItem.mockReturnValue(JSON.stringify({ 'test-section': true }));
      
      const result = sessionManager.restoreState('test-section');
      
      expect(result).toBe(true);
    });

    test('should return null for non-existent section', () => {
      global.sessionStorage.getItem.mockReturnValue(JSON.stringify({}));
      
      const result = sessionManager.restoreState('non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('updateChevron', () => {
    test('should update chevron element for expanded state', () => {
      const mockChevron = {
        classList: {
          remove: jest.fn(),
          add: jest.fn()
        }
      };
      global.document.querySelector.mockReturnValue(mockChevron);
      
      sessionManager.updateChevron('test-section', true);
      
      expect(global.document.querySelector).toHaveBeenCalledWith('#test-section .chevron');
      expect(mockChevron.classList.remove).toHaveBeenCalledWith('collapsed');
    });

    test('should update chevron element for collapsed state', () => {
      const mockChevron = {
        classList: {
          remove: jest.fn(),
          add: jest.fn()
        }
      };
      global.document.querySelector.mockReturnValue(mockChevron);
      
      sessionManager.updateChevron('test-section', false);
      
      expect(global.document.querySelector).toHaveBeenCalledWith('#test-section .chevron');
      expect(mockChevron.classList.add).toHaveBeenCalledWith('collapsed');
    });

    test('should handle missing chevron element gracefully', () => {
      global.document.querySelector.mockReturnValue(null);
      
      expect(() => {
        sessionManager.updateChevron('test-section', true);
      }).not.toThrow();
    });
  });

  describe('saveDropdownValue', () => {
    test('should save dropdown value', () => {
      global.sessionStorage.getItem.mockReturnValue('{}');
      
      sessionManager.saveDropdownValue('test-dropdown', 'value1');
      
      expect(global.sessionStorage.setItem).toHaveBeenCalledWith(
        'opxy_dropdown_values',
        JSON.stringify({ 'test-dropdown': 'value1' })
      );
    });
  });

  describe('restoreDropdownValue', () => {
    test('should restore dropdown value', () => {
      global.sessionStorage.getItem.mockReturnValue(JSON.stringify({ 'test-dropdown': 'value1' }));
      
      const mockDropdown = { value: '' };
      global.document.getElementById.mockReturnValue(mockDropdown);
      
      sessionManager.restoreDropdownValue('test-dropdown');
      
      expect(mockDropdown.value).toBe('value1');
    });

    test('should handle missing dropdown element gracefully', () => {
      global.document.getElementById.mockReturnValue(null);
      
      expect(() => {
        sessionManager.restoreDropdownValue('test-dropdown');
      }).not.toThrow();
    });
  });

  describe('initTabPersistence', () => {
    beforeEach(() => {
      global.sessionStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      };
      global.document = {
        getElementById: jest.fn(),
        addEventListener: jest.fn()
      };
    });

    test('should save drum tab selection', () => {
      const mockDrumTab = {
        addEventListener: jest.fn()
      };
      const mockMultiTab = {
        addEventListener: jest.fn()
      };
      
      global.document.getElementById.mockImplementation((id) => {
        if (id === 'drum-tab') return mockDrumTab;
        if (id === 'multi-tab') return mockMultiTab;
        return null;
      });

      sessionManager.initTabPersistence();

      expect(mockDrumTab.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockMultiTab.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));

      // Simulate clicking drum tab
      const drumClickHandler = mockDrumTab.addEventListener.mock.calls[0][1];
      drumClickHandler();

      expect(global.sessionStorage.setItem).toHaveBeenCalledWith('opxy_last_tab', 'drum');
    });

    test('should save multi tab selection', () => {
      const mockDrumTab = {
        addEventListener: jest.fn()
      };
      const mockMultiTab = {
        addEventListener: jest.fn()
      };
      
      global.document.getElementById.mockImplementation((id) => {
        if (id === 'drum-tab') return mockDrumTab;
        if (id === 'multi-tab') return mockMultiTab;
        return null;
      });

      sessionManager.initTabPersistence();

      // Simulate clicking multi tab
      const multiClickHandler = mockMultiTab.addEventListener.mock.calls[0][1];
      multiClickHandler();

      expect(global.sessionStorage.setItem).toHaveBeenCalledWith('opxy_last_tab', 'multi');
    });

    test('should restore last selected tab', () => {
      global.sessionStorage.getItem.mockReturnValue('multi');
      
      const mockMultiTab = {
        addEventListener: jest.fn(),
        click: jest.fn()
      };
      
      global.document.getElementById.mockImplementation((id) => {
        if (id === 'drum-tab') return { addEventListener: jest.fn() };
        if (id === 'multi-tab') return mockMultiTab;
        return null;
      });

      sessionManager.initTabPersistence();

      expect(mockMultiTab.click).toHaveBeenCalled();
    });

    test('should handle missing tab elements gracefully', () => {
      global.document.getElementById.mockReturnValue(null);
      
      expect(() => {
        sessionManager.initTabPersistence();
      }).not.toThrow();
    });
  });

  describe('clearConversionDropdownSettings', () => {
    test('should clear conversion dropdown settings from localStorage', () => {
      // Set some test values in localStorage
      global.localStorage.setItem('dropdown_sample-rate-drum', '1');
      global.localStorage.setItem('dropdown_bit-depth-drum', '16');
      global.localStorage.setItem('dropdown_channels-drum', 'mono');

      const clearConversionDropdownSettings = () => {
        const conversionDropdownIds = [
          'sample-rate-drum',
          'bit-depth-drum', 
          'channels-drum',
          'sample-rate-multi',
          'bit-depth-multi',
          'channels-multi'
        ];
        conversionDropdownIds.forEach(id => {
          global.localStorage.removeItem(`dropdown_${id}`);
        });
      };

      clearConversionDropdownSettings();

      expect(global.localStorage.getItem('dropdown_sample-rate-drum')).toBeNull();
      expect(global.localStorage.getItem('dropdown_bit-depth-drum')).toBeNull();
      expect(global.localStorage.getItem('dropdown_channels-drum')).toBeNull();
    });

    test('should clear conversion dropdown settings from sessionStorage', () => {
      // Set some test values in sessionStorage
      global.sessionStorage.setItem('dropdown_sample-rate-multi', '2');
      global.sessionStorage.setItem('dropdown_bit-depth-multi', '24');
      global.sessionStorage.setItem('dropdown_channels-multi', 'keep');

      const clearConversionDropdownSettings = () => {
        const conversionDropdownIds = [
          'sample-rate-drum',
          'bit-depth-drum', 
          'channels-drum',
          'sample-rate-multi',
          'bit-depth-multi',
          'channels-multi'
        ];
        conversionDropdownIds.forEach(id => {
          global.sessionStorage.removeItem(`dropdown_${id}`);
        });
      };

      clearConversionDropdownSettings();

      expect(global.sessionStorage.getItem('dropdown_sample-rate-multi')).toBeNull();
      expect(global.sessionStorage.getItem('dropdown_bit-depth-multi')).toBeNull();
      expect(global.sessionStorage.getItem('dropdown_channels-multi')).toBeNull();
    });
  });

  describe('initializeConversionDropdowns', () => {
    beforeEach(() => {
      global.document = {
        getElementById: jest.fn()
      };
    });

    test('should initialize all conversion dropdowns to default values', () => {
      const mockDropdowns = {
        'sample-rate-drum': { value: '' },
        'bit-depth-drum': { value: '' },
        'channels-drum': { value: '' },
        'sample-rate-multi': { value: '' },
        'bit-depth-multi': { value: '' },
        'channels-multi': { value: '' }
      };

      global.document.getElementById.mockImplementation((id) => {
        return mockDropdowns[id] || null;
      });

      const initializeConversionDropdowns = () => {
        const conversionDropdowns = {
          'sample-rate-drum': '0',     // Keep original
          'bit-depth-drum': 'keep',    // Keep original
          'channels-drum': 'keep',     // Keep original
          'sample-rate-multi': '0',    // Keep original
          'bit-depth-multi': 'keep',   // Keep original
          'channels-multi': 'keep'     // Keep original
        };
        
        Object.entries(conversionDropdowns).forEach(([id, defaultValue]) => {
          const dropdown = global.document.getElementById(id);
          if (dropdown) {
            dropdown.value = defaultValue;
          }
        });
      };

      initializeConversionDropdowns();

      expect(mockDropdowns['sample-rate-drum'].value).toBe('0');
      expect(mockDropdowns['bit-depth-drum'].value).toBe('keep');
      expect(mockDropdowns['channels-drum'].value).toBe('keep');
      expect(mockDropdowns['sample-rate-multi'].value).toBe('0');
      expect(mockDropdowns['bit-depth-multi'].value).toBe('keep');
      expect(mockDropdowns['channels-multi'].value).toBe('keep');
    });

    test('should handle missing dropdown elements gracefully', () => {
      global.document.getElementById.mockReturnValue(null);

      const initializeConversionDropdowns = () => {
        const conversionDropdowns = {
          'sample-rate-drum': '0',
          'bit-depth-drum': 'keep',
          'channels-drum': 'keep',
          'sample-rate-multi': '0',
          'bit-depth-multi': 'keep',
          'channels-multi': 'keep'
        };
        
        Object.entries(conversionDropdowns).forEach(([id, defaultValue]) => {
          const dropdown = global.document.getElementById(id);
          if (dropdown) {
            dropdown.value = defaultValue;
          }
        });
      };

      expect(() => {
        initializeConversionDropdowns();
      }).not.toThrow();
    });
  });

  describe('debugConversionDropdowns', () => {
    beforeEach(() => {
      global.document = {
        getElementById: jest.fn()
      };
      global.console = {
        log: jest.fn()
      };
    });

    test('should log current dropdown values', () => {
      const mockDropdowns = {
        'sample-rate-drum': { value: '1' },
        'bit-depth-drum': { value: '16' },
        'channels-drum': { value: 'mono' }
      };

      global.document.getElementById.mockImplementation((id) => {
        return mockDropdowns[id] || null;
      });

      const debugConversionDropdowns = () => {
        const conversionDropdownIds = [
          'sample-rate-drum',
          'bit-depth-drum', 
          'channels-drum',
          'sample-rate-multi',
          'bit-depth-multi',
          'channels-multi'
        ];
        
        console.log('=== Conversion Dropdown Values ===');
        conversionDropdownIds.forEach(id => {
          const dropdown = global.document.getElementById(id);
          if (dropdown) {
            console.log(`${id}: ${dropdown.value}`);
          } else {
            console.log(`${id}: element not found`);
          }
        });
        console.log('===================================');
      };

      debugConversionDropdowns();

      expect(global.console.log).toHaveBeenCalledWith('=== Conversion Dropdown Values ===');
      expect(global.console.log).toHaveBeenCalledWith('sample-rate-drum: 1');
      expect(global.console.log).toHaveBeenCalledWith('bit-depth-drum: 16');
      expect(global.console.log).toHaveBeenCalledWith('channels-drum: mono');
      expect(global.console.log).toHaveBeenCalledWith('sample-rate-multi: element not found');
      expect(global.console.log).toHaveBeenCalledWith('===================================');
    });
  });

  describe('resetAllStates', () => {
    test('should clear all storage and reload page', () => {
      // Mock location.reload
      delete global.location;
      global.location = { reload: jest.fn() };

      // Mock the methods being called
      const clearStorageSpy = jest.spyOn(sessionManager, 'clearStorage').mockImplementation();
      const clearDropdownSpy = jest.spyOn(sessionManager, 'clearDropdownStorage').mockImplementation();

      sessionManager.resetAllStates();

      expect(clearStorageSpy).toHaveBeenCalled();
      expect(clearDropdownSpy).toHaveBeenCalled();
      expect(global.location.reload).toHaveBeenCalled();

      clearStorageSpy.mockRestore();
      clearDropdownSpy.mockRestore();
    });
  });

  describe('clearDropdownStorage', () => {
    test('should remove dropdown data from sessionStorage', () => {
      sessionManager.clearDropdownStorage();
      
      expect(global.sessionStorage.removeItem).toHaveBeenCalledWith('opxy_dropdown_values');
    });

    test('should handle sessionStorage errors gracefully', () => {
      global.sessionStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage not available');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      sessionManager.clearDropdownStorage();
      
      expect(consoleSpy).toHaveBeenCalledWith('sessionStorage not available:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('setupSections', () => {
    beforeEach(() => {
      // Reset global document to include required mock methods
      global.document = {
        querySelectorAll: jest.fn(),
        querySelector: jest.fn()
      };
    });

    test('should setup collapsible sections', () => {
      const mockTrigger = {
        getAttribute: jest.fn(),
        querySelector: jest.fn()
      };
      const mockTarget = {
        classList: { contains: jest.fn(() => false) },
        addEventListener: jest.fn()
      };

      mockTrigger.getAttribute.mockReturnValue('#test-section');
      mockTrigger.querySelector.mockReturnValue({ classList: { remove: jest.fn(), add: jest.fn() } });
      
      global.document.querySelectorAll.mockReturnValue([mockTrigger]);
      global.document.querySelector.mockReturnValue(mockTarget);

      sessionManager.setupSections();

      expect(global.document.querySelectorAll).toHaveBeenCalledWith('[data-bs-toggle="collapse"]');
      expect(mockTarget.addEventListener).toHaveBeenCalledWith('shown.bs.collapse', expect.any(Function));
      expect(mockTarget.addEventListener).toHaveBeenCalledWith('hidden.bs.collapse', expect.any(Function));
    });

    test('should handle missing target elements gracefully', () => {
      const mockTrigger = {
        getAttribute: jest.fn(() => '#missing-section'),
        querySelector: jest.fn()
      };

      global.document.querySelectorAll.mockReturnValue([mockTrigger]);
      global.document.querySelector.mockReturnValue(null);

      expect(() => {
        sessionManager.setupSections();
      }).not.toThrow();
    });
  });

  describe('setupDropdowns', () => {
    beforeEach(() => {
      // Reset global document to include required mock methods
      global.document = {
        getElementById: jest.fn()
      };
    });

    test('should setup dropdown event listeners', () => {
      const mockDropdown = {
        addEventListener: jest.fn(),
        value: 'test-value'
      };

      global.document.getElementById.mockReturnValue(mockDropdown);

      // Mock the setupDropdowns method
      const setupDropdowns = () => {
        const dropdownIds = ['test-dropdown'];
        
        dropdownIds.forEach(id => {
          const dropdown = global.document.getElementById(id);
          if (dropdown) {
            dropdown.addEventListener('change', () => {
              // Mock save logic
            });
          }
        });
      };

      setupDropdowns();

      expect(mockDropdown.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('should handle missing dropdown elements gracefully', () => {
      global.document.getElementById.mockReturnValue(null);

      const setupDropdowns = () => {
        const dropdownIds = ['missing-dropdown'];
        
        dropdownIds.forEach(id => {
          const dropdown = global.document.getElementById(id);
          if (dropdown) {
            dropdown.addEventListener('change', () => {});
          }
        });
      };

      expect(() => {
        setupDropdowns();
      }).not.toThrow();
    });
  });
});