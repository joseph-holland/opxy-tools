// Session Manager for collapsible sections state persistence
// Uses sessionStorage to persist state during browser session only

class SessionManager {
  constructor() {
    this.storageKey = 'opxy_section_states';
    this.sections = new Map();
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupSections());
    } else {
      this.setupSections();
    }
  }

  // Storage utility functions
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
      console.warn('sessionStorage not available:', e);
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

  setupSections() {
    // Find all collapsible sections
    const collapsibleElements = document.querySelectorAll('[data-bs-toggle="collapse"]');
    
    collapsibleElements.forEach(trigger => {
      const targetId = trigger.getAttribute('data-bs-target');
      if (targetId) {
        const target = document.querySelector(targetId);
        if (target) {
          const sectionId = targetId.replace('#', '');
          this.sections.set(sectionId, {
            trigger: trigger,
            target: target,
            chevron: trigger.querySelector('i[class*="chevron"]')
          });

          // Restore saved state first
          this.restoreState(sectionId);

          // Add event listeners
          target.addEventListener('shown.bs.collapse', () => {
            this.saveState(sectionId, true);
            this.updateChevron(sectionId, true);
          });

          target.addEventListener('hidden.bs.collapse', () => {
            this.saveState(sectionId, false);
            this.updateChevron(sectionId, false);
          });

          // Set initial chevron state based on current visibility
          const isCurrentlyVisible = target.classList.contains('show');
          this.updateChevron(sectionId, isCurrentlyVisible);
        }
      }
    });
  }

  saveState(sectionId, isExpanded) {
    const currentStates = this.loadFromStorage();
    currentStates[sectionId] = isExpanded ? 'expanded' : 'collapsed';
    this.saveToStorage(currentStates);
  }

  restoreState(sectionId) {
    const savedStates = this.loadFromStorage();
    const savedState = savedStates[sectionId];
    const section = this.sections.get(sectionId);
    
    if (!section || !savedState) return;

    if (savedState === 'collapsed') {
      // Close the section
      section.target.classList.remove('show');
      section.trigger.setAttribute('aria-expanded', 'false');
      this.updateChevron(sectionId, false);
    } else if (savedState === 'expanded') {
      // Open the section
      section.target.classList.add('show');
      section.trigger.setAttribute('aria-expanded', 'true');
      this.updateChevron(sectionId, true);
    }
  }

  updateChevron(sectionId, isExpanded) {
    const section = this.sections.get(sectionId);
    if (section && section.chevron) {
      if (isExpanded) {
        section.chevron.classList.remove('fa-chevron-right');
        section.chevron.classList.add('fa-chevron-down');
      } else {
        section.chevron.classList.remove('fa-chevron-down');
        section.chevron.classList.add('fa-chevron-right');
      }
    }
  }

  // Public methods for manual control
  expandSection(sectionId) {
    const section = this.sections.get(sectionId);
    if (section && typeof bootstrap !== 'undefined') {
      const collapse = new bootstrap.Collapse(section.target, { show: true });
    }
  }

  collapseSection(sectionId) {
    const section = this.sections.get(sectionId);
    if (section && typeof bootstrap !== 'undefined') {
      const collapse = new bootstrap.Collapse(section.target, { hide: true });
    }
  }

  resetAllStates() {
    this.clearStorage();
    location.reload(); // Reload to see default states
  }

  // Get current state of a section
  getSectionState(sectionId) {
    const savedStates = this.loadFromStorage();
    return savedStates[sectionId] || null;
  }

  // Get all section states
  getAllStates() {
    return this.loadFromStorage();
  }
}

// Initialize the session manager
let sessionManager;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    sessionManager = new SessionManager();
    // Make it globally accessible for debugging
    window.sessionManager = sessionManager;
  });
} else {
  sessionManager = new SessionManager();
  // Make it globally accessible for debugging
  window.sessionManager = sessionManager;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionManager;
}
