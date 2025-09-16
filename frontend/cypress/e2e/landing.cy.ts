describe('Landing Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the main landing page elements', () => {
    cy.get('h1').should('contain', 'Traffic Guardian');
    cy.get('[data-testid="get-started-button"], [data-testid="hero-cta"]').should('exist');
  });

  it('should navigate to dashboard from CTA button', () => {
    cy.get('[data-testid="get-started-button"], [data-testid="hero-cta"]').first().click();
    cy.url().should('include', '/dashboard');
  });

  it('should have working navigation to account page', () => {
    cy.get('[data-testid="login-link"], a[href="/account"]').should('exist').click();
    cy.url().should('include', '/account');
  });

  it('should redirect unknown routes to landing page', () => {
    cy.visit('/unknown-route');
    cy.url().should('not.include', '/unknown-route');
    cy.url().should('match', /\/$/);
  });
});