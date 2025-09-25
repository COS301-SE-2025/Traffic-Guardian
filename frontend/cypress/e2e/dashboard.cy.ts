describe('Dashboard Page', () => {
  beforeEach(() => {
    // Set up authentication for RBAC
    cy.window().then((win) => {
      win.sessionStorage.setItem('apiKey', 'test-api-key');
      win.sessionStorage.setItem('userEmail', 'test@example.com');
    });

    // Mock RBAC API calls
    cy.intercept('GET', '**/api/auth/profile', {
      statusCode: 200,
      body: { role: 'user', id: 'test-user', email: 'test@example.com' }
    }).as('profileRequest');

    cy.intercept('GET', '**/api/user/preferences', {
      statusCode: 200,
      body: { preferences: '{"theme":"light","notifications":true,"alertLevel":"medium"}' }
    }).as('preferencesRequest');

    // Mock dashboard data APIs
    cy.intercept('GET', '**/api/incidents', {
      statusCode: 200,
      body: []
    }).as('incidentsRequest');

    cy.intercept('GET', '**/api/traffic/public', {
      statusCode: 200,
      body: { regions: [] }
    }).as('trafficRequest');

    cy.visit('/dashboard');
  });

  // it('should load dashboard with key components', () => {
  //   cy.get('[data-testid="dashboard-container"], [data-testid="dashboard"]').should('exist');

  //   // Check for stats cards or key metrics
  //   cy.get('[data-testid="stats-card"], [data-testid="incident-count"], [data-testid="traffic-stats"]')
  //     .should('have.length.at.least', 1);
  // });

  // it('should display incident chart or analytics', () => {
  //   cy.get('[data-testid="incident-chart"], [data-testid="analytics-chart"], canvas')
  //     .should('exist');
  // });

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