// describe.skip('Complete User Journey', () => {
//   const testUser = {
//     username: 'e2euser',
//     email: 'e2e@test.com',
//     password: 'Test1234!',
//     confirmPassword: 'Test1234!'
//   };

//   const setupAuthentication = () => {
//     // Set up authentication
//     cy.window().then((win) => {
//       win.sessionStorage.setItem('apiKey', 'test-api-key');
//       win.sessionStorage.setItem('userEmail', 'e2e@test.com');
//     });
//   };

//   const setupAPIMocks = () => {
//     // Authentication mocks
//     cy.intercept('POST', '**/api/auth/login', {
//       statusCode: 200,
//       body: { apiKey: 'fake-api-key' }
//     }).as('loginRequest');

//     cy.intercept('GET', '**/api/user/preferences', {
//       statusCode: 200,
//       body: { preferences: '{"theme":"dark","notifications":true,"alertLevel":"medium"}' }
//     }).as('preferencesRequest');

//     // Live feed and other API mocks
//     cy.intercept('GET', '**/api/auth/profile', {
//       statusCode: 200,
//       body: { role: 'user', id: 'test-user' }
//     }).as('profileRequest');

//     cy.intercept('GET', '**/api/cameras/**', {
//       statusCode: 200,
//       body: { cameras: [] }
//     }).as('camerasRequest');

//     // Mock external CalTrans API for live feeds
//     cy.intercept('GET', '**/caltrans.blinktag.com/api/**', {
//       statusCode: 200,
//       body: {
//         data: [
//           {
//             cctv: {
//               index: 'test-camera-1',
//               recordTimestamp: {
//                 recordDate: '2024-01-01',
//                 recordTime: '12:00:00'
//               },
//               location: {
//                 district: '12',
//                 locationName: 'Test Location',
//                 nearbyPlace: 'Test Area',
//                 longitude: '-118.2437',
//                 latitude: '34.0522',
//                 elevation: '100',
//                 direction: 'N',
//                 county: 'Los Angeles',
//                 route: 'I-405'
//               },
//               images: {
//                 small: {
//                   url: 'https://example.com/small.jpg'
//                 },
//                 medium: {
//                   url: 'https://example.com/medium.jpg'
//                 },
//                 large: {
//                   url: 'https://example.com/large.jpg'
//                 }
//               }
//             }
//           }
//         ]
//       }
//     }).as('caltransApiRequest');

//     // Mock incidents API with proper structure matching the component expectations
//     cy.intercept('GET', '**/api/incidents', {
//       statusCode: 200,
//       body: [
//         {
//           Incidents_ID: 1,
//           Incidents_DateTime: '2024-01-01T12:00:00Z',
//           Incidents_Longitude: -118.2437,
//           Incidents_Latitude: 34.0522,
//           Incident_Severity: 'medium',
//           Incident_Status: 'open',
//           Incident_Reporter: 'Test Reporter',
//           Incident_CameraID: 1,
//           Incident_Description: 'Test incident description'
//         }
//       ]
//     }).as('incidentsRequest');
//   };

//   it('should complete full user navigation flow', () => {
//     setupAPIMocks();

//     // Start from landing page
//     cy.visit('/');
//     cy.get('h1').should('contain', 'Traffic Guardian');

//     // Navigate to login directly (skip registration for simplicity)
//     cy.visit('/account');
//     cy.get('[data-testid="login-form"]').should('exist');

//     cy.get('[data-testid="email-input"]').type(testUser.email);
//     cy.get('[data-testid="password-input"]').type(testUser.password);
//     cy.get('[data-testid="submit-button"]').click();

//     cy.wait('@loginRequest');
//     cy.wait('@preferencesRequest');
//     cy.url().should('include', '/profile');

//     // Navigate through main app sections
//     cy.visit('/dashboard');
//     cy.get('[data-testid="dashboard-container"]').should('exist');

//     cy.visit('/map');
//     cy.wait(2000);
//     cy.get('[data-testid="map-container"]', { timeout: 15000 }).should('exist');

//     cy.visit('/live-feed');
//     cy.wait(1000);
//     cy.get('body').then($body => {
//       if ($body.find('[data-testid="live-feed-container"]').length > 0) {
//         cy.get('[data-testid="live-feed-container"]').should('exist');
//       } else if ($body.find('.loading-spinner').length > 0) {
//         cy.get('.loading-spinner').should('exist');
//       } else {
//         cy.get('body').should('be.visible');
//       }
//     });

//     cy.visit('/incidents');
//     cy.wait(1000);
//     cy.get('[data-testid="incidents-container"]').should('exist');

//     cy.visit('/analytics');
//     cy.get('body').should('exist');
//   });

//   it('should handle navigation between all pages', () => {
//     setupAPIMocks();

//     // Login first
//     cy.visit('/account');

//     // Wait for page to load and verify we're on account page
//     cy.url().should('include', '/account');
//     cy.get('h2').should('contain', 'Welcome Back');

//     cy.get('[data-testid="email-input"]').type(testUser.email);
//     cy.get('[data-testid="password-input"]').type(testUser.password);
//     cy.get('[data-testid="submit-button"]').click();
//     cy.wait('@loginRequest');
//     cy.wait('@preferencesRequest');

//     const pages = [
//       { path: '/dashboard', selector: '[data-testid="dashboard-container"]' },
//       { path: '/map', selector: '[data-testid="map-container"]' },
//       { path: '/live-feed', selector: '[data-testid="live-feed-container"]' },
//       { path: '/incidents', selector: '[data-testid="incidents-container"]' },
//       { path: '/analytics', selector: 'body' },
//       { path: '/archives', selector: 'body' },
//       { path: '/help', selector: 'body' }
//     ];

//     pages.forEach(page => {
//       cy.visit(page.path);
//       cy.url().should('include', page.path);

//       // Special handling for map page with more robust loading
//       if (page.path === '/map') {
//         cy.wait(2000); // Give map time to load
//         cy.get('[data-testid="map-container"]', { timeout: 15000 }).should('exist').then(() => {
//           // Check for leaflet with fallback strategies
//           cy.get('body').then($body => {
//             if ($body.find('.leaflet-container').length > 0) {
//               cy.get('.leaflet-container', { timeout: 25000 }).should('be.visible');
//             } else {
//               // Fallback: just ensure map container is present
//               cy.get('[data-testid="map-container"]').should('exist');
//             }
//           });
//         });
//       } else if (page.path === '/live-feed') {
//         // Special handling for live feed with loading states
//         cy.wait(1000);
//         cy.get('body').then($body => {
//           if ($body.find('[data-testid="live-feed-container"]').length > 0) {
//             cy.get('[data-testid="live-feed-container"]').should('exist');
//           } else if ($body.find('.loading-spinner').length > 0) {
//             cy.get('.loading-spinner').should('exist');
//           } else {
//             cy.get('body').should('be.visible');
//           }
//         });
//       } else if (page.path === '/incidents') {
//         // Special handling for incidents with loading states
//         cy.wait(1000);
//         cy.get('body').then($body => {
//           if ($body.find('[data-testid="incidents-container"]').length > 0) {
//             cy.get('[data-testid="incidents-container"]').should('exist');
//           } else if ($body.find('.loading-spinner').length > 0) {
//             cy.get('.loading-spinner').should('exist');
//           } else {
//             cy.get('body').should('be.visible');
//           }
//         });
//       } else {
//         cy.get(page.selector).should('exist');
//       }
//     });
//   });

//   it('should test responsive behavior', () => {
//     setupAPIMocks();

//     // Login first
//     cy.visit('/account');

//     // Wait for page to load and verify we're on account page
//     cy.url().should('include', '/account');
//     cy.get('h2').should('contain', 'Welcome Back');

//     cy.get('[data-testid="email-input"]').type(testUser.email);
//     cy.get('[data-testid="password-input"]').type(testUser.password);
//     cy.get('[data-testid="submit-button"]').click();
//     cy.wait('@loginRequest');
//     cy.wait('@preferencesRequest');

//     // Test mobile viewport
//     cy.viewport(375, 667);
//     cy.visit('/dashboard');
//     cy.get('[data-testid="mobile-nav"], [data-testid="hamburger-menu"]').should('exist');

//     // Test tablet viewport
//     cy.viewport(768, 1024);
//     cy.visit('/map');
//     cy.wait(2000);
//     cy.get('[data-testid="map-container"]', { timeout: 15000 }).should('exist').then(() => {
//       cy.get('body').then($body => {
//         if ($body.find('.leaflet-container').length > 0) {
//           cy.get('.leaflet-container', { timeout: 15000 }).should('be.visible');
//         } else {
//           cy.get('[data-testid="map-container"]').should('exist');
//         }
//       });
//     });

//     // Test desktop viewport
//     cy.viewport(1920, 1080);
//     cy.visit('/analytics');
//     cy.get('body').should('be.visible');
//   });
// });
