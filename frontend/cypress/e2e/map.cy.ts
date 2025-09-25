describe('Map Page', () => {
  beforeEach(() => {
    // Set up authentication with a real API key for E2E testing
    cy.window().then((win) => {
      win.sessionStorage.setItem('apiKey', 'test-api-key');
    });

    cy.visit('/map');
  });

  it('should load the map container', () => {
    // Wait for camera data to load and map container to render
    cy.get('[data-testid="map-container"]', { timeout: 15000 }).should('exist');

    // Wait for leaflet to initialize with real camera data
    cy.get('.leaflet-container', { timeout: 15000 }).should('exist');
  });

  it('should display map controls', () => {
    // Wait for camera data to load first
    cy.get('[data-testid="map-controls"]', { timeout: 15000 }).should('exist');

    // Check for leaflet zoom controls after map loads
    cy.get('.leaflet-control-zoom', { timeout: 15000 }).should('exist');
  });

  // it('should show traffic heatmap toggle', () => {
  //   // Wait for map controls to load with real data
  //   cy.get('[data-testid="heatmap-toggle"]', { timeout: 15000 }).should('exist');

  //   // Heatmap should start as active (enabled by default)
  //   cy.get('[data-testid="heatmap-toggle"]').should('have.class', 'active');

  //   // Test toggle functionality - clicking should remove active class
  //   cy.get('[data-testid="heatmap-toggle"]').click();
  //   cy.get('[data-testid="heatmap-toggle"]').should('not.have.class', 'active');

  //   // Click again to re-enable
  //   cy.get('[data-testid="heatmap-toggle"]').click();
  //   cy.get('[data-testid="heatmap-toggle"]').should('have.class', 'active');
  // });

  it('should display route planner placeholder', () => {
    // The route planner is currently just a placeholder
    cy.get('[data-testid="route-planner"]', { timeout: 15000 }).should('exist');
  });

  // it('should handle map interactions with camera markers', () => {
  //   // Wait for map and camera data to load
  //   cy.get('.leaflet-container', { timeout: 15000 }).should('be.visible');

  //   // Wait for camera markers to appear (may take time for real API data)
  //   cy.get('.leaflet-marker-icon', { timeout: 15000 }).should('exist');

  //   // Click on the first camera marker
  //   cy.get('.leaflet-marker-icon').first().click();

  //   // Check for various possible popup/modal selectors
  //   cy.get('body').then($body => {
  //     if ($body.find('.leaflet-popup').length > 0) {
  //       cy.get('.leaflet-popup').should('exist');
  //     } else if ($body.find('.camera-modal').length > 0) {
  //       cy.get('.camera-modal').should('exist');
  //     } else if ($body.find('[data-testid="camera-popup"]').length > 0) {
  //       cy.get('[data-testid="camera-popup"]').should('exist');
  //     } else {
  //       // Fallback: just verify marker was clicked (marker should have focus or change state)
  //       cy.get('.leaflet-marker-icon').first().should('be.visible');
  //       cy.log('Camera marker clicked, popup may not be implemented yet');
  //     }
  //   });
  // });

  // it('should have working navigation back to dashboard', () => {
  //   cy.get('[data-testid="nav-dashboard"], a[href="/dashboard"]').click();
  //   cy.url().should('include', '/dashboard');
  // });
});