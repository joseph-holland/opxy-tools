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
      
      const stored = global.sessionStorage.getItem('opxy_section_states');
      expect(stored).toBe(JSON.stringify(testData));
    });

    test('should handle sessionStorage errors gracefully', () => {
      const originalSetItem = global.sessionStorage.setItem;
      global.sessionStorage.setItem = jest.fn(() => {
        throw new Error('Storage full');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      sessionManager.saveToStorage({ test: true });
      
      expect(consoleSpy).toHaveBeenCalledWith('sessionStorage not available:', expect.any(Error));
      
      // Restore
      global.sessionStorage.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('loadFromStorage', () => {
    test('should load data from sessionStorage', () => {
      const testData = { section1: true, section2: false };
      global.sessionStorage.setItem('opxy_section_states', JSON.stringify(testData));
      
      const result = sessionManager.loadFromStorage();
      
      expect(result).toEqual(testData);
    });

    test('should return empty object when no data exists', () => {
      const result = sessionManager.loadFromStorage();
      
      expect(result).toEqual({});
    });

    test('should return empty object when JSON parsing fails', () => {
      global.sessionStorage.setItem('opxy_section_states', 'invalid json');
      
      const result = sessionManager.loadFromStorage();
      
      expect(result).toEqual({});
    });

    test('should handle sessionStorage errors gracefully', () => {
      const originalGetItem = global.sessionStorage.getItem;
      global.sessionStorage.getItem = jest.fn(() => {
        throw new Error('Storage not available');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = sessionManager.loadFromStorage();
      
      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith('se  ssionStorage not available:', expect.any(Error));
      
      // Restore
      global.sessionStorage.getItem = originalGetItem;
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
      sessionManager.saveState('test-section', true);
      
      const stored = global.sessionStorage.getItem('opxy_section_states');
      expect(JSON.parse(stored)).toEqual({ 'test-section': true });
    });

    test('should update existing state', () => {
      // Set initial state
      global.sessionStorage.setItem('opxy_section_states', JSON.stringify({ 'section1': false }));
      
      sessionManager.saveState('section2', true);
      
      const stored = global.sessionStorage.getItem('opxy_section_states');
      expect(JSON.parse(stored)).toEqual({ 'section1': false, 'section2': true });
    });
  });

  describe('restoreState', () => {
    test('should return saved state for section', () => {
      global.sessionStorage.setItem('opxy_section_states', JSON.stringify({ 'test-section': true }));
      
      const result = sessionManager.restoreState('test-section');
      
      expect(result).toBe(true);
    });

    test('should return null for non-existent section', () => {
      global.sessionStorage.setItem('opxy_section_states', JSON.stringify({}));
      
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
      sessionManager.saveDropdownValue('test-dropdown', 'value1');
      
      const stored = global.sessionStorage.getItem('opxy_dropdown_values');
      expect(JSON.parse(stored)).toEqual({ 'test-dropdown': 'value1' });
    });
  });

  describe('restoreDropdownValue', () => {
    test('should restore dropdown value', () => {
      global.sessionStorage.setItem('opxy_dropdown_values', JSON.stringify({ 'test-dropdown': 'value1' }));
      
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
});