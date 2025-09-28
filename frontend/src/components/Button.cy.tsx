/// <reference path="../../cypress/support/component.d.ts" />
import React from 'react';
import Button from './Button';

describe('Button Component', () => {
  it('renders with label and handles click', () => {
    const onClick = cy.stub();

    cy.mount(<Button label="Click Me" onClick={onClick} />);

    cy.get('.custom-button').should('be.visible');
    cy.contains('Click Me').should('be.visible');

    cy.get('.custom-button').click();
    cy.then(() => {
      cy.wrap(onClick).should('have.been.calledOnce');
    });
  });

  it('renders with default button type', () => {
    const onClick = cy.stub();

    cy.mount(<Button label="Default Type" onClick={onClick} />);

    cy.get('.custom-button').should('have.attr', 'type', 'button');
  });

  it('renders with submit type', () => {
    const onClick = cy.stub();

    cy.mount(<Button label="Submit" onClick={onClick} type="submit" />);

    cy.get('.custom-button').should('have.attr', 'type', 'submit');
  });

  it('applies custom className', () => {
    const onClick = cy.stub();

    cy.mount(<Button label="Styled" onClick={onClick} className="primary-btn" />);

    cy.get('.custom-button.primary-btn').should('be.visible');
  });

  it('handles multiple clicks', () => {
    const onClick = cy.stub();

    cy.mount(<Button label="Multi Click" onClick={onClick} />);

    cy.get('.custom-button').click();
    cy.get('.custom-button').click();
    cy.get('.custom-button').click();

    cy.then(() => {
      cy.wrap(onClick).should('have.been.calledThrice');
    });
  });

  it('renders with long label text', () => {
    const onClick = cy.stub();
    const longLabel = 'This is a very long button label that might wrap';

    cy.mount(<Button label={longLabel} onClick={onClick} />);

    cy.contains(longLabel).should('be.visible');
  });

  it('renders with empty label', () => {
    const onClick = cy.stub();

    cy.mount(<Button label="" onClick={onClick} />);

    cy.get('.custom-button').should('be.visible');
    cy.get('.custom-button').should('be.empty');
  });

  it('combines multiple CSS classes correctly', () => {
    const onClick = cy.stub();

    cy.mount(<Button label="Test" onClick={onClick} className="btn-large btn-danger" />);

    cy.get('.custom-button.btn-large.btn-danger').should('be.visible');
  });

  it('maintains button functionality after multiple renders', () => {
    const onClick = cy.stub();

    // Mount component
    cy.mount(<Button label="First" onClick={onClick} />);
    cy.get('.custom-button').click();

    // Re-mount with different props
    cy.mount(<Button label="Second" onClick={onClick} className="new-class" />);
    cy.get('.custom-button').click();

    cy.then(() => {
      cy.wrap(onClick).should('have.been.calledTwice');
    });
  });

  it('has accessible button element', () => {
    const onClick = cy.stub();

    cy.mount(<Button label="Accessible Button" onClick={onClick} />);

    cy.get('button').should('be.visible');
    cy.get('button').should('not.be.disabled');
  });
});