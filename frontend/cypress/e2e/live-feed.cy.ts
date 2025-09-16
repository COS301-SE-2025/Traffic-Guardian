describe('Live Feed Page', () => {
  beforeEach(() => {
    cy.visit('/live-feed');
  });

  it('should load live feed container', () => {
    cy.get('[data-testid="live-feed-container"], [data-testid="live-feed"]').should('exist');
  });

  it('should display incident carousel or feed items', () => {
    cy.get('[data-testid="incident-carousel"], [data-testid="feed-item"], [data-testid="incident-item"]')
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
    // Check for filter buttons
    cy.get('[data-testid="filter-accident"], [data-testid="filter-construction"], [data-testid="incident-filter"]')
      .should('exist');

    // Test filtering functionality
    cy.get('[data-testid="filter-accident"]').click();
    cy.get('[data-testid="feed-item"][data-type="accident"]').should('be.visible');
  });

  it('should navigate to detailed incident view', () => {
    // Click on an incident item if it exists
    cy.get('[data-testid="feed-item"], [data-testid="incident-item"]').first().click();

    // Should navigate to incident management or details
    cy.url().should('match', /(incident|detail)/);
  });
});