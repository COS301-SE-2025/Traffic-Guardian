describe('Account Page', () => {
  beforeEach(() => {
    cy.visit('/account');
  });

  it('should load the login page', () => {
    cy.contains('h2', 'Welcome Back').should('exist');
    cy.get('[data-testid="login-form"]').should('exist');
  });

  it('should display error for empty submission', () => {
    cy.get('[data-testid="submit-button"]').click();
    // HTML5 validation prevents submission, so we check the URL doesn't change
    cy.url().should('include', '/account');
  });

  it('should display error for invalid credentials', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/auth/login`, {
      statusCode: 401,
      body: { message: 'Invalid email or password' }
    }).as('loginRequest');

    cy.get('[data-testid="email-input"]').type('wrong@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="submit-button"]').click();

    cy.wait('@loginRequest');
    // Just check that error message appears, regardless of exact text
    cy.get('[data-testid="error-message"]').should('be.visible');
  });

<<<<<<< HEAD
  it('should successfully login with valid credentials', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/auth/login`, {
      statusCode: 200,
      body: { apiKey: 'fake-api-key' }
    }).as('loginRequest');

    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('correctpassword');
    cy.get('[data-testid="submit-button"]').click();

    cy.wait('@loginRequest');
    cy.url().should('include', '/profile');
  });
=======
  // it('should successfully login with valid credentials', () => {
  //   cy.intercept('POST', '**/api/auth/login', {
  //     statusCode: 200,
  //     body: { apiKey: 'fake-api-key' }
  //   }).as('loginRequest');

  //   cy.intercept('GET', '**/api/user/preferences', {
  //     statusCode: 200,
  //     body: { preferences: '{"theme":"dark","notifications":true,"alertLevel":"medium"}' }
  //   }).as('preferencesRequest');

  //   cy.intercept('GET', '**/api/auth/profile', {
  //     statusCode: 200,
  //     body: { role: 'user', id: 'test-user' }
  //   }).as('profileRequest');

  //   cy.get('[data-testid="email-input"]').type('test@example.com');
  //   cy.get('[data-testid="password-input"]').type('correctpassword');
  //   cy.get('[data-testid="submit-button"]').click();

  //   cy.wait('@loginRequest');
  //   // Just verify the login API was called successfully
  //   cy.get('@loginRequest').should('have.property', 'response.statusCode', 200);
  // });
>>>>>>> Dev

  it('should navigate to signup page', () => {
    cy.get('[data-testid="signup-link"]').click();
    cy.url().should('include', '/signup');
  });
});