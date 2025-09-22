describe('Dashboard Page', () => {
  beforeEach(() => {
    cy.visit('/dashboard');
  });

  it('should load dashboard with key components', () => {
    cy.get('[data-testid="dashboard-container"], [data-testid="dashboard"]').should('exist');

    // Check for stats cards or key metrics
    cy.get('[data-testid="stats-card"], [data-testid="incident-count"], [data-testid="traffic-stats"]')
      .should('have.length.at.least', 1);
  });

  it('should display incident chart or analytics', () => {
    cy.get('[data-testid="incident-chart"], [data-testid="analytics-chart"], canvas')
      .should('exist');
  });

  it('should have navigation bar visible', () => {
    cy.get('[data-testid="navbar"], nav').should('exist');
    cy.get('[data-testid="nav-link"], nav a').should('have.length.at.least', 3);
  });

  it('should show global alert badge if incidents exist', () => {
    // Global alert badge should be present (though may be empty if no alerts)
    cy.get('[data-testid="global-alert-badge"]').should('exist');
  });

  it('should navigate to map view', () => {
    cy.get('[data-testid="nav-map"], a[href="/map"]').click();
    cy.url().should('include', '/map');
  });

  it('should navigate to incidents page', () => {
    cy.get('[data-testid="nav-incidents"], a[href="/incidents"]').click();
    cy.url().should('include', '/incidents');
  });
});