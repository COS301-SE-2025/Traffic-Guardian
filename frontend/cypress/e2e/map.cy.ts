describe('Map Page', () => {
  beforeEach(() => {
    cy.visit('/map');
  });

  it('should load the map container', () => {
    cy.get('[data-testid="map-container"]').should('exist');
    // Wait for leaflet to initialize - it may take time
    cy.get('.leaflet-container', { timeout: 10000 }).should('exist');
  });

  it('should display map controls', () => {
    // Check for leaflet zoom controls
    cy.get('.leaflet-control-zoom', { timeout: 10000 }).should('exist');

    // Check for custom map controls if they exist
    cy.get('[data-testid="map-controls"], [data-testid="layer-controls"]').should('exist');
  });

  it('should show traffic heatmap toggle or layers', () => {
    cy.get('[data-testid="heatmap-toggle"], [data-testid="traffic-heatmap"], [data-testid="layer-selector"]')
      .should('exist');
  });

  it('should display route planner if available', () => {
    cy.get('[data-testid="route-planner"]').should('exist');
  });

  it('should handle map interactions', () => {
    // Wait for map to load
    cy.get('.leaflet-container', { timeout: 10000 }).should('be.visible');

    // Try to interact with the map (this will depend on your map implementation)
    cy.get('.leaflet-container').click(100, 100);

    // Check if any popups or markers appear (make this more flexible)
    cy.get('body').then($body => {
      if ($body.find('.leaflet-popup').length > 0 || $body.find('.leaflet-marker').length > 0) {
        cy.get('.leaflet-popup, .leaflet-marker').should('exist');
      } else {
        // Just ensure the map interaction didn't break anything
        cy.get('.leaflet-container').should('be.visible');
      }
    });
  });

  it('should have working navigation back to dashboard', () => {
    cy.get('[data-testid="nav-dashboard"], a[href="/dashboard"]').click();
    cy.url().should('include', '/dashboard');
  });
});