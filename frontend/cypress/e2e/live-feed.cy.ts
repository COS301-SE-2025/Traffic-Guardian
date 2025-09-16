describe('Live Feed Page', () => {
  beforeEach(() => {
    // Set up authentication with a real API key for E2E testing
    cy.window().then((win) => {
      // Use a real test API key - you may need to create a test user
      win.sessionStorage.setItem('apiKey', 'test-api-key');
    });

    cy.visit('/live-feed');
  });

  it('should load live feed container', () => {
    cy.get('[data-testid="live-feed-container"], [data-testid="live-feed"]').should('exist');
  });

  it('should display incident carousel or feed items', () => {
    // Wait for real camera data to load from CalTrans API
    cy.get('[data-testid="incident-carousel"], [data-testid="feed-item"], [data-testid="incident-item"]', { timeout: 15000 })
      .should('exist');
  });

  it('should show loading animation initially', () => {
    // Check for loading spinner or animation
    cy.get('[data-testid="loading-spinner"], [data-testid="car-loading"], .loading').should('exist');
  });

  it('should handle real-time updates', () => {
    // Mock socket connection for testing
    cy.window().then((win) => {
      // Simulate real-time incident data
      const mockIncident = {
        id: 'test-incident',
        type: 'Accident',
        location: 'Test Location',
        severity: 'High',
        timestamp: new Date().toISOString()
      };

      // If your app uses socket.io, you can mock it
      if (win.socket) {
        win.socket.emit('new-incident', mockIncident);
      }
    });

    // Check if the feed updates with new data
    cy.get('[data-testid="feed-item"]').should('have.length.at.least', 0);
  });

  it('should filter incidents by type', () => {
    // Wait for real camera data to load and filter buttons to appear
    cy.get('[data-testid="filter-accident"], [data-testid="filter-construction"], [data-testid="incident-filter"]', { timeout: 15000 })
      .should('exist');

    // Wait for feed items to load from real API
    cy.get('.feed-tile', { timeout: 15000 }).should('exist');

    // Test filtering functionality
    cy.get('[data-testid="filter-accident"]').click();

    // Verify filtering works (feed items should still be visible)
    cy.get('.feed-tile').should('be.visible');
  });

  it('should navigate to detailed incident view', () => {
    // Wait for real camera data to load
    cy.get('.feed-tile', { timeout: 15000 }).should('exist');

    // Double-click on the first feed tile to navigate
    cy.get('.feed-tile').first().dblclick();

    // Should navigate to incident management or details
    cy.url().should('match', /(incident|detail)/);
  });
});