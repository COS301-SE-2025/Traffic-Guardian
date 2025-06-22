describe('SignUp Page', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test1234!',
    confirmPassword: 'Test1234!'
  };

  beforeEach(() => {
    cy.visit('/signup');
  });

  it('should show error for empty submission', () => {
    cy.get('[data-testid="submit-button"]').click();
    cy.contains('All fields are required').should('exist');
  });

  it('should show error for invalid email', () => {
    cy.get('[data-testid="username-input"]').type('someusername');
    cy.get('[data-testid="email-input"]').type('not-an-email');
    cy.get('[data-testid="password-input"]').type('somepassword');
    cy.get('[data-testid="confirm-password-input"]').type('somepassword');
    cy.get('[data-testid="submit-button"]').click();
    cy.get('[data-testid="error-message"]')
      .should('contain', 'Please enter a valid email address');
  });

  it('should show error for password mismatch', () => {
    cy.get('[data-testid="username-input"]').type('someusername');
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password1');
    cy.get('[data-testid="confirm-password-input"]').type('password2');
    cy.get('[data-testid="submit-button"]').click();
    cy.contains('Passwords do not match').should('exist');
  });

  it('should show error for short password', () => {
    cy.get('[data-testid="username-input"]').type('someusername');
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('short');
    cy.get('[data-testid="confirm-password-input"]').type('short');
    cy.get('[data-testid="submit-button"]').click();
    cy.contains('Password must be at least 6 characters').should('exist');
  });

  it('should successfully submit valid form', () => {
    cy.intercept('POST', '/api/auth/register', {
      statusCode: 200,
      body: { message: 'Registration successful' }
    }).as('registerRequest');

    cy.get('[data-testid="username-input"]').type(testUser.username);
    cy.get('[data-testid="email-input"]').type(testUser.email);
    cy.get('[data-testid="password-input"]').type(testUser.password);
    cy.get('[data-testid="confirm-password-input"]').type(testUser.confirmPassword);
    cy.get('[data-testid="submit-button"]').click();

    cy.wait('@registerRequest').its('request.body').should('deep.equal', {
      User_Username: testUser.username,
      User_Email: testUser.email,
      User_Password: testUser.password,
      User_Role: 'user',
      User_Preferences: "{}"
    });

    cy.contains('Registration Successful!').should('exist');
  });
});