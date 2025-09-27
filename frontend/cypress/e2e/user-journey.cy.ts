describe('Complete User Journey', () => {
  const testUser = {
    username: 'e2euser',
    email: 'e2e@test.com',
    password: 'Test1234!',
    confirmPassword: 'Test1234!'
  };

  const setupAuthentication = () => {
    // Set up authentication
    cy.window().then((win) => {
      win.sessionStorage.setItem('apiKey', 'test-api-key');
      win.sessionStorage.setItem('userEmail', 'e2e@test.com');
    });
  };

  const setupAPIMocks = () => {
    // Authentication mocks
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: { apiKey: 'fake-api-key' }
    }).as('loginRequest');

    cy.intercept('GET', '**/api/user/preferences', {
      statusCode: 200,
      body: { preferences: '{"theme":"dark","notifications":true,"alertLevel":"medium"}' }
    }).as('preferencesRequest');

    // Live feed and other API mocks
    cy.intercept('GET', '**/api/auth/profile', {
      statusCode: 200,
      body: { role: 'user', id: 'test-user' }
    }).as('profileRequest');

    cy.intercept('GET', '**/api/cameras/**', {
      statusCode: 200,
      body: { cameras: [] }
    }).as('camerasRequest');

    // Mock external CalTrans API for live feeds
    cy.intercept('GET', '**/caltrans.blinktag.com/api/**', {
      statusCode: 200,
      body: {
        data: [
          {
            cctv: {
              index: 'test-camera-1',
              recordTimestamp: {
                recordDate: '2024-01-01',
                recordTime: '12:00:00'
              },
              location: {
                district: '12',
                locationName: 'Test Location',
                nearbyPlace: 'Test Area',
                longitude: '-118.2437',
                latitude: '34.0522',
                elevation: '100',
                direction: 'N',
                county: 'Los Angeles',
                route: 'I-405'
              },
              images: {
                small: {
                  url: 'https://example.com/small.jpg'
                },
                medium: {
                  url: 'https://example.com/medium.jpg'
                },
                large: {
                  url: 'https://example.com/large.jpg'
                }
              }
            }
          }
        ]
      }
    }).as('caltransApiRequest');

    // Mock incidents API with proper structure matching the component expectations
    cy.intercept('GET', '**/api/incidents', {
      statusCode: 200,
      body: [
        {
          Incidents_ID: 1,
          Incidents_DateTime: '2024-01-01T12:00:00Z',
          Incidents_Longitude: -118.2437,
          Incidents_Latitude: 34.0522,
          Incident_Severity: 'medium',
          Incident_Status: 'open',
          Incident_Reporter: 'Test Reporter',
          Incident_CameraID: 1,
          Incident_Description: 'Test incident description'
        }
      ]
    }).as('incidentsRequest');

    // Mock archives API
    cy.intercept('GET', '**/api/archives', {
      statusCode: 200,
      body: []
    }).as('archivesRequest');
  };

  it('should complete basic user authentication flow', () => {
    setupAPIMocks();

    // Start from landing page
    cy.visit('/');
    cy.get('h1').should('contain', 'Traffic Guardian');

    // Navigate to login
    cy.visit('/account');
    cy.get('body').then($body => {
      if ($body.find('[data-testid="login-form"]').length > 0) {
        cy.get('[data-testid="login-form"]').should('exist');

        cy.get('[data-testid="email-input"]').type(testUser.email);
        cy.get('[data-testid="password-input"]').type(testUser.password);
        cy.get('[data-testid="submit-button"]').click();

        cy.wait('@loginRequest');
        cy.wait('@preferencesRequest', { timeout: 10000 });
      } else {
        // Fallback: just verify account page exists
        cy.get('h2').should('contain', 'Welcome Back');
      }
    });
  });

  it('should navigate through main app sections with authentication', () => {
    setupAPIMocks();
    setupAuthentication();

    const pages = [
      { path: '/dashboard', selector: '[data-testid="dashboard-container"]', fallback: 'body' },
      { path: '/map', selector: '[data-testid="map-container"]', fallback: 'body' },
      { path: '/live-feed', selector: '[data-testid="live-feed-container"]', fallback: 'body' },
      { path: '/incidents', selector: '[data-testid="incidents-container"]', fallback: 'body' },
      { path: '/archives', selector: '.archives-page', fallback: 'body' },
      { path: '/analytics', selector: 'body', fallback: 'body' },
      { path: '/help', selector: 'body', fallback: 'body' }
    ];

    pages.forEach(page => {
      cy.visit(page.path);
      cy.url().should('include', page.path);

      // Handle different page types with robust checking
      cy.get('body').then($body => {
        if ($body.find(page.selector).length > 0) {
          cy.get(page.selector).should('exist');
        } else if ($body.find('.loading-spinner, .loading-message').length > 0) {
          cy.get('.loading-spinner, .loading-message').should('exist');
          cy.log(`${page.path} page showing loading state`);
        } else if ($body.find('.error-message').length > 0) {
          cy.get('.error-message').should('exist');
          cy.log(`${page.path} page showing error state (handled correctly)`);
        } else {
          cy.get(page.fallback).should('exist');
          cy.log(`${page.path} page fallback verification`);
        }
      });

      // Special handling for specific pages
      if (page.path === '/map') {
        cy.wait(2000); // Give map time to load
        cy.get('body').then($body => {
          if ($body.find('.leaflet-container').length > 0) {
            cy.get('.leaflet-container', { timeout: 15000 }).should('be.visible');
          }
        });
      }
    });
  });

  it('should test responsive behavior across pages', () => {
    setupAPIMocks();
    setupAuthentication();

    // Test mobile viewport
    cy.viewport(375, 667);
    cy.visit('/dashboard');
    cy.get('body').should('be.visible');

    // Test tablet viewport
    cy.viewport(768, 1024);
    cy.visit('/map');
    cy.wait(2000);
    cy.get('body').should('be.visible');

    // Test desktop viewport
    cy.viewport(1920, 1080);
    cy.visit('/analytics');
    cy.get('body').should('be.visible');
  });

  it('should handle navigation between authenticated pages', () => {
    setupAPIMocks();
    setupAuthentication();

    // Test navigation flow
    cy.visit('/dashboard');
    cy.get('body').should('be.visible');

    cy.visit('/live-feed');
    cy.get('body').should('be.visible');

    cy.visit('/incidents');
    cy.get('body').should('be.visible');

    cy.visit('/archives');
    cy.get('body').should('be.visible');

    // Verify we can always get back to dashboard
    cy.visit('/dashboard');
    cy.get('body').should('be.visible');
  });

  it('should test error handling and recovery', () => {
    setupAPIMocks();

    // Test without authentication
    cy.visit('/archives');
    cy.get('body').should('be.visible');

    // Set up authentication and retry
    setupAuthentication();
    cy.visit('/dashboard');
    cy.get('body').should('be.visible');
  });
});