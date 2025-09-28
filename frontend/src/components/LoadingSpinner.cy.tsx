/// <reference path="../../cypress/support/component.d.ts" />
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('renders with default props', () => {
    cy.mount(<LoadingSpinner />);

    cy.get('.loading-spinner-container').should('be.visible');
    cy.get('.loading-spinner.medium').should('be.visible');
    cy.contains('Loading...').should('be.visible');
  });

  it('renders with custom text', () => {
    cy.mount(<LoadingSpinner text="Please wait..." />);

    cy.contains('Please wait...').should('be.visible');
    cy.contains('Loading...').should('not.exist');
  });

  it('renders with different sizes', () => {
    // Small size
    cy.mount(<LoadingSpinner size="small" />);
    cy.get('.loading-spinner.small').should('be.visible');

    // Medium size (default)
    cy.mount(<LoadingSpinner size="medium" />);
    cy.get('.loading-spinner.medium').should('be.visible');

    // Large size
    cy.mount(<LoadingSpinner size="large" />);
    cy.get('.loading-spinner.large').should('be.visible');
  });

  it('applies custom className', () => {
    cy.mount(<LoadingSpinner className="custom-spinner" />);

    cy.get('.loading-spinner-container.custom-spinner').should('be.visible');
  });

  it('renders without text when text is empty string', () => {
    cy.mount(<LoadingSpinner text="" />);

    cy.get('.loading-text').should('not.exist');
    cy.get('.loading-spinner').should('be.visible');
  });

  it('supports data-testid attribute', () => {
    cy.mount(<LoadingSpinner data-testid="my-spinner" />);

    cy.get('[data-testid="my-spinner"]').should('be.visible');
  });

  it('renders spinner animation element', () => {
    cy.mount(<LoadingSpinner />);

    cy.get('.loading-spinner').should('be.visible');
    cy.get('.loading-spinner').should('have.class', 'medium');
  });

  it('renders text when provided', () => {
    const customText = 'Loading analytics data...';
    cy.mount(<LoadingSpinner text={customText} />);

    cy.get('.loading-text').should('be.visible');
    cy.get('.loading-text').should('contain', customText);
  });

  it('combines all props correctly', () => {
    cy.mount(
      <LoadingSpinner
        size="large"
        text="Processing your request..."
        className="test-class"
        data-testid="combo-spinner"
      />
    );

    cy.get('[data-testid="combo-spinner"]').should('be.visible');
    cy.get('.loading-spinner-container.test-class').should('be.visible');
    cy.get('.loading-spinner.large').should('be.visible');
    cy.contains('Processing your request...').should('be.visible');
  });
});