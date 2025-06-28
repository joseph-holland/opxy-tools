# Testing Guide

This document outlines the testing practices and how to run tests for the OPXY Tools project.

## Overview

The project uses a comprehensive testing approach with:

- **Unit Tests**: Jest for testing individual functions and modules
- **End-to-End Tests**: Playwright for testing complete user workflows
- **CI/CD**: GitHub Actions for automated testing on every push and pull request

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern browser (Chrome, Firefox, or Safari)

### Installation

```bash
# Install all dependencies including test frameworks
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### End-to-End Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run E2E tests with UI (shows browser)
npm run test:e2e:ui

# Run a specific test file
npx playwright test tests/e2e/basic-functionality.spec.js
```

### All Tests

```bash
# Run both unit and E2E tests
npm test && npm run test:e2e
```

## Test Structure

### Unit Tests (`/tests/unit/`)

- **`audio-tools.test.js`**: Tests for audio processing functions
  - Audio buffer to WAV conversion
  - File name parsing and MIDI note conversion
  - Audio resampling functionality
  - Error handling for invalid inputs

- **`session-manager.test.js`**: Tests for session state persistence
  - LocalStorage/SessionStorage operations
  - UI state management
  - Error handling for storage failures

### E2E Tests (`/tests/e2e/`)

- **`basic-functionality.spec.js`**: Core application functionality
  - Page loading and navigation
  - Tab switching between drum and multisample modes
  - UI element visibility and interaction

- **`file-workflows.spec.js`**: File upload and processing workflows
  - Drag and drop functionality
  - File browser interactions
  - Form validation and user input
  - Advanced settings modals

## Writing New Tests

### Unit Tests

Create new test files in `/tests/unit/` following this pattern:

```javascript
/**
 * Unit tests for [module-name]
 */

// Import the module code (see existing tests for examples)

describe('ModuleName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('functionName', () => {
    test('should do something specific', () => {
      // Test implementation
      expect(result).toBe(expected);
    });

    test('should handle error cases', () => {
      // Error handling test
      expect(() => functionCall()).toThrow('Error message');
    });
  });
});
```

### E2E Tests

Create new test files in `/tests/e2e/` following this pattern:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should perform user workflow', async ({ page }) => {
    // User interaction simulation
    await page.click('#button-id');
    await page.fill('#input-id', 'test value');
    
    // Assertions
    await expect(page.locator('#result')).toContainText('expected text');
  });
});
```

## Coverage Requirements

The project aims for:
- **Unit Test Coverage**: 80%+ for core logic functions
- **E2E Coverage**: All critical user workflows
- **Error Handling**: All error paths should be tested

### Viewing Coverage

After running `npm run test:coverage`:
- Open `coverage/lcov-report/index.html` in your browser
- Coverage reports are also generated in CI and uploaded to Codecov

## Testing Best Practices

### Unit Tests

1. **Test Pure Functions**: Focus on functions that have clear inputs/outputs
2. **Mock External Dependencies**: Use Jest mocks for browser APIs, file system, etc.
3. **Test Edge Cases**: Include tests for boundary conditions and error states
4. **Keep Tests Isolated**: Each test should be independent and not rely on others

### E2E Tests

1. **Test User Journeys**: Focus on complete workflows users actually perform
2. **Use Realistic Data**: Test with data similar to what users would provide
3. **Test Cross-Browser**: Run tests on multiple browsers (Chrome, Firefox, Safari)
4. **Handle Async Operations**: Use proper waits for dynamic content

### General

1. **Descriptive Test Names**: Test names should clearly describe what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
3. **Keep Tests Fast**: Avoid unnecessary delays or complex setup
4. **Update Tests with Code**: When changing functionality, update related tests

## Troubleshooting

### Common Issues

#### Unit Tests

- **Mock Setup**: If tests fail due to browser API calls, ensure proper mocks in `tests/setup.js`
- **File Loading**: Tests load source files via `eval()` - check file paths and syntax

#### E2E Tests

- **Browser Installation**: Run `npx playwright install` if browsers are missing
- **Port Conflicts**: E2E tests start a dev server on port 8080 - ensure it's available
- **Timing Issues**: Add proper waits for dynamic content: `await expect(element).toBeVisible()`

#### CI/CD Issues

- **Dependencies**: Ensure `package.json` includes all required test dependencies
- **Permissions**: GitHub Actions may need specific permissions for artifact uploads

### Getting Help

1. Check the [Jest documentation](https://jestjs.io/docs/getting-started) for unit testing questions
2. Check the [Playwright documentation](https://playwright.dev/) for E2E testing questions
3. Review existing tests for patterns and examples
4. Run tests with `--verbose` flag for detailed output

## Contributing

When contributing to the project:

1. **Add Tests for New Features**: All new functionality should include appropriate tests
2. **Update Tests for Changes**: Modify existing tests when changing functionality
3. **Run Tests Before Committing**: Ensure all tests pass before submitting pull requests
4. **Document Testing Changes**: Update this guide when adding new testing patterns

The CI system will automatically run all tests on pull requests and prevent merging if tests fail.