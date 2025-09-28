/// <reference path="../../cypress/support/component.d.ts" />
import React from 'react';
import IncidentChart from './IncidentChart';
import { setupComponentTestMocks } from '../test-utils/componentTestUtils';

// Setup common mocks for all tests
setupComponentTestMocks();

describe('IncidentChart Component', () => {
  it('renders chart container with title', () => {
    cy.mount(<IncidentChart />);

    cy.get('.incident-chart').should('be.visible');
    cy.contains('Incident Trends').should('be.visible');
  });

  it('displays placeholder content', () => {
    cy.mount(<IncidentChart />);

    cy.get('.chart-placeholder').should('be.visible');
    cy.contains('Chart coming soon...').should('be.visible');
  });

  it('has proper structure', () => {
    cy.mount(<IncidentChart />);

    cy.get('.incident-chart').within(() => {
      cy.get('h3').should('contain', 'Incident Trends');
      cy.get('.chart-placeholder').should('be.visible');
    });
  });

  it('maintains consistent styling', () => {
    cy.mount(<IncidentChart />);

    cy.get('.incident-chart').should('exist');
    cy.get('.chart-placeholder').should('exist');
  });
});