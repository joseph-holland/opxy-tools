// Test setup for Jest
// Mock Web APIs that are not available in jsdom

// Mock AudioContext and related APIs
class MockAudioContext {
  constructor() {
    this.sampleRate = 44100;
    this.state = 'running';
    this.destination = {
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers'
    };
  }

  async decodeAudioData(audioData) {
    // Return a mock AudioBuffer
    return new MockAudioBuffer({
      numberOfChannels: 2,
      length: 1024,
      sampleRate: 44100
    });
  }

  createBuffer(numberOfChannels, length, sampleRate) {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }

  createBufferSource() {
    return new MockAudioBufferSourceNode();
  }

  createGain() {
    return new MockGainNode();
  }

  close() {
    return Promise.resolve();
  }
}

class MockOfflineAudioContext extends MockAudioContext {
  constructor(numberOfChannels, length, sampleRate) {
    super();
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
  }

  createBuffer(numberOfChannels, length, sampleRate) {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }

  async startRendering() {
    return new MockAudioBuffer({
      numberOfChannels: this.numberOfChannels,
      length: this.length,
      sampleRate: this.sampleRate
    });
  }
}

class MockAudioBuffer {
  constructor({ numberOfChannels = 2, length = 1024, sampleRate = 44100 } = {}) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    
    // Create mock channel data
    this._channelData = [];
    for (let i = 0; i < numberOfChannels; i++) {
      this._channelData[i] = new Float32Array(length);
      // Fill with test data (sine wave)
      for (let j = 0; j < length; j++) {
        this._channelData[i][j] = Math.sin(2 * Math.PI * 440 * j / sampleRate) * 0.5;
      }
    }
  }

  getChannelData(channel) {
    return this._channelData[channel] || new Float32Array(this.length);
  }
}

class MockAudioBufferSourceNode {
  constructor() {
    this.buffer = null;
    this.onended = null;
  }

  connect(destination) {
    return destination;
  }

  disconnect() {}

  start(when = 0, offset = 0, duration) {
    setTimeout(() => {
      if (this.onended) this.onended();
    }, 0);
  }

  stop(when = 0) {}
}

class MockGainNode {
  constructor() {
    this.gain = { value: 1 };
  }

  connect(destination) {
    return destination;
  }

  disconnect() {}
}

// Mock File API
class MockFile {
  constructor(parts, filename, options = {}) {
    this.name = filename;
    this.size = parts.reduce((size, part) => size + (part.length || part.byteLength || 0), 0);
    this.type = options.type || '';
    this.lastModified = Date.now();
    this._parts = parts;
  }

  async arrayBuffer() {
    // Return a simple ArrayBuffer for testing
    const buffer = new ArrayBuffer(1024);
    const view = new Uint8Array(buffer);
    // Fill with test WAV header data
    view.set([0x52, 0x49, 0x46, 0x46]); // "RIFF"
    return buffer;
  }

  async text() {
    return JSON.stringify({ test: 'data' });
  }
}

// Mock Blob
class MockBlob {
  constructor(parts = [], options = {}) {
    this.size = parts.reduce((size, part) => size + (part.length || part.byteLength || 0), 0);
    this.type = options.type || '';
    this._parts = parts;
  }

  async arrayBuffer() {
    const buffer = new ArrayBuffer(this.size);
    return buffer;
  }

  async text() {
    return '';
  }
}

// Mock URL.createObjectURL
global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
};

// Set up global mocks
global.AudioContext = MockAudioContext;
global.OfflineAudioContext = MockOfflineAudioContext;
global.File = MockFile;
global.Blob = MockBlob;

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
global.sessionStorage = sessionStorageMock;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock document methods that might be used
global.document.createElement = jest.fn((tagName) => {
  const element = {
    tagName: tagName.toUpperCase(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    appendChild: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    click: jest.fn(),
    style: {},
    href: '',
    src: '',
    onload: null,
    onerror: null
  };
  
  if (tagName === 'a') {
    element.download = '';
  }
  
  return element;
});

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  sessionStorageMock.clear();
  
  // Reset document to provide mock functions for each test
  global.document.getElementById = jest.fn();
  global.document.querySelector = jest.fn();
  global.document.querySelectorAll = jest.fn();
});