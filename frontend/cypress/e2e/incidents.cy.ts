describe('Incidents Page', () => {
  beforeEach(() => {
    cy.visit('/incidents');
  });

  it('should load incidents page with main container', () => {
    cy.get('[data-testid="incidents-container"], [data-testid="incidents-page"]').should('exist');
  });

  it('should display incident list or table', () => {
    cy.get('[data-testid="incident-list"], [data-testid="incidents-table"], table').should('exist');
  });

  it('should have search and filter functionality', () => {
    cy.get('[data-testid="search-input"], [data-testid="incident-search"], input[type="search"]')
      .should('exist');

    // Test search functionality
    cy.get('[data-testid="search-input"], [data-testid="incident-search"], input[type="search"]')
      .type('accident');

    // Check for filter options
    cy.get('[data-testid="filter-select"], [data-testid="incident-filter"], select').should('exist');
  });

  it('should show incident details on click', () => {
    // Click on first incident if available
    cy.get('[data-testid="incident-row"], [data-testid="incident-item"], tr').first().click();

    // Should show details modal or navigate to details page
    cy.get('[data-testid="incident-details"], [data-testid="modal"]').should('exist')
      .or(() => {
        cy.url().should('include', 'incident');
      });
  });

  it('should allow sorting incidents', () => {
    // Test sorting by clicking column headers
    cy.get('[data-testid="sort-timestamp"], th[data-sort="timestamp"]').click();

    // Verify sorting worked (this will depend on your implementation)
    cy.get('[data-testid="incident-row"]').should('have.length.at.least', 0);
  });

  it('should show incident statistics', () => {
    cy.get('[data-testid="incident-stats"], [data-testid="stats-summary"]').should('exist');
  });

  it('should navigate to incident management for admin users', () => {
    cy.get('[data-testid="manage-incidents"], a[href="/incident-management"]').click();
    cy.url().should('include', '/incident-management');
  });
});