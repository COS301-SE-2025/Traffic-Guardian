# Component Testing with Cypress

This document explains how to use Cypress component testing in the Traffic Guardian frontend application.

## Overview

Cypress component testing allows you to test React components in isolation, providing fast feedback and reliable test results. This setup includes:

- ✅ Component testing configuration for React/TypeScript
- ✅ Mock utilities for API services and contexts
- ✅ Test utilities for common testing patterns
- ✅ Integration with existing Cypress reporting

## Setup

The component testing is already configured and working. Key files:

- `cypress.config.ts` - Main Cypress configuration with component testing enabled
- `cypress/support/component.ts` - Component testing support file
- `src/test-utils/componentTestUtils.ts` - Utilities and mocks for testing
- `COMPONENT_TESTING.md` - This documentation file

## Current Test Status

✅ **35 tests passing across 5 component files:**
- `Button.cy.tsx` - 10 tests (button interactions, props, styling)
- `IncidentChart.cy.tsx` - 4 tests (basic rendering and structure)
- `LoadingSpinner.cy.tsx` - 9 tests (loading states, sizes, text)
- `NavBarSimple.cy.tsx` - 2 tests (basic component loading)
- `StatsCard.cy.tsx` - 10 tests (data display, values, formatting)

## Running Tests

### Run All Component Tests
```bash
npm run cypress:component
```

### Run Specific Component Test
```bash
npx cypress run --component --spec "src/components/ComponentName.cy.tsx"
```

### Open Cypress Test Runner (Interactive Mode)
```bash
npx cypress open --component
```

## Writing Component Tests

### Basic Test Structure

Create a test file with the `.cy.tsx` extension in the same directory as your component:

```typescript
// src/components/MyComponent.cy.tsx
import React from 'react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    cy.mount(<MyComponent />);

    cy.get('[data-cy="my-component"]').should('be.visible');
    cy.contains('Expected Text').should('be.visible');
  });
});
```

### Using Test Utilities

Import and use the provided test utilities:

```typescript
import { setupComponentTestMocks, mockUsers } from '../test-utils/componentTestUtils';

// Setup common mocks
setupComponentTestMocks();

describe('MyComponent', () => {
  it('works with authenticated user', () => {
    // Use pre-configured mock users
    cy.mount(
      <MockUserProvider {...mockUsers.admin}>
        <MyComponent />
      </MockUserProvider>
    );

    // Your test assertions
  });
});
```

### Testing with Context Providers

Many components require context providers. Use the mock providers:

```typescript
import { MockUserProvider, mockUsers } from '../test-utils/componentTestUtils';

describe('ComponentWithAuth', () => {
  it('displays admin features for admin users', () => {
    cy.mount(
      <MockUserProvider {...mockUsers.admin}>
        <ComponentWithAuth />
      </MockUserProvider>
    );

    cy.contains('Admin Panel').should('be.visible');
  });

  it('hides admin features for regular users', () => {
    cy.mount(
      <MockUserProvider {...mockUsers.trafficController}>
        <ComponentWithAuth />
      </MockUserProvider>
    );

    cy.contains('Admin Panel').should('not.exist');
  });
});
```

### Mocking API Calls

Use the provided API mocking utilities:

```typescript
import { createMockApiService } from '../test-utils/componentTestUtils';

beforeEach(() => {
  cy.window().then((win) => {
    win.ApiService = createMockApiService({
      // Override specific API responses
      incidents: [
        { id: '1', type: 'accident', location: 'Test Location' }
      ]
    });
  });
});
```

## Available Mock Data

The test utilities provide pre-configured mock data:

### Mock Users
- `mockUsers.public` - Unauthenticated user
- `mockUsers.trafficController` - Basic authenticated user
- `mockUsers.admin` - Admin user with all permissions

### Mock API Responses
- `mockApiResponses.pemsAnalytics` - PEMS analytics data
- `mockApiResponses.incidents` - Incident data
- `mockApiResponses.alerts` - Alert data
- `mockApiResponses.districtData` - District data

## Best Practices

### 1. Use Data Attributes for Testing
Add `data-cy` attributes to elements you want to test:

```jsx
// In your component
<button data-cy="submit-button" onClick={handleSubmit}>
  Submit
</button>

// In your test
cy.get('[data-cy="submit-button"]').click();
```

### 2. Test User Interactions
Test how users actually interact with your components:

```typescript
it('submits form when button is clicked', () => {
  const onSubmit = cy.stub();

  cy.mount(<MyForm onSubmit={onSubmit} />);

  cy.get('[data-cy="name-input"]').type('John Doe');
  cy.get('[data-cy="submit-button"]').click();

  cy.then(() => {
    expect(onSubmit).to.have.been.calledOnce;
  });
});
```

### 3. Test Different States
Test loading, error, and success states:

```typescript
it('displays loading state', () => {
  cy.mount(<MyComponent loading={true} />);
  cy.contains('Loading...').should('be.visible');
});

it('displays error state', () => {
  cy.mount(<MyComponent error="Something went wrong" />);
  cy.contains('Something went wrong').should('be.visible');
});
```

### 4. Test Responsive Behavior
Test how components look on different screen sizes:

```typescript
it('displays mobile layout on small screens', () => {
  cy.viewport(375, 667); // iPhone size
  cy.mount(<ResponsiveComponent />);

  cy.get('[data-cy="mobile-menu"]').should('be.visible');
  cy.get('[data-cy="desktop-menu"]').should('not.be.visible');
});
```

## Example Tests

### Complete Component Test Example

```typescript
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import NavBar from './NavBar';
import { MockThemeProvider, setupComponentTestMocks } from '../test-utils/componentTestUtils';

setupComponentTestMocks();

describe('NavBar Component', () => {
  it('renders all navigation items', () => {
    cy.mount(
      <MemoryRouter>
        <MockThemeProvider>
          <NavBar />
        </MockThemeProvider>
      </MemoryRouter>
    );

    cy.contains('Dashboard').should('be.visible');
    cy.contains('Live Feed').should('be.visible');
    cy.contains('Map').should('be.visible');
    cy.contains('Incidents').should('be.visible');
  });

  it('highlights active navigation item', () => {
    cy.mount(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MockThemeProvider>
          <NavBar />
        </MockThemeProvider>
      </MemoryRouter>
    );

    cy.get('.nav-item.active').should('contain', 'Dashboard');
  });
});
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure all imports in your test files are correct
2. **Context Provider Errors**: Wrap components in appropriate mock providers
3. **API Call Errors**: Use the mock API service setup in beforeEach hooks
4. **CSS Loading Issues**: Ensure CSS files are properly imported

### Debug Tips

1. Use `cy.pause()` to pause test execution for debugging
2. Use `cy.debug()` to log information to the browser console
3. Check the Cypress Test Runner for detailed error messages
4. Use browser DevTools to inspect the component during test execution

## Integration with CI/CD

The component tests are integrated with the existing test pipeline:

- Tests run automatically on `npm run cypress:component`
- Results are reported using the mochawesome reporter
- Coverage information is collected when available

## Future Enhancements

- Visual regression testing with cypress-image-diff
- Accessibility testing with cypress-axe
- Performance testing for component rendering
- Storybook integration for component documentation

## Resources

- [Cypress Component Testing Documentation](https://docs.cypress.io/guides/component-testing/introduction)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Library Queries](https://testing-library.com/docs/queries/about/)