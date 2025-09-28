/// <reference path="../../cypress/support/component.d.ts" />
import React from 'react';
import StatsCard from './StatsCard';

describe('StatsCard Component', () => {
  it('renders with title and string value', () => {
    cy.mount(<StatsCard title="Active Users" value="1,234" />);

    cy.get('[data-testid="stats-card"]').should('be.visible');
    cy.contains('Active Users').should('be.visible');
    cy.contains('1,234').should('be.visible');
  });

  it('renders with title and numeric value', () => {
    cy.mount(<StatsCard title="Total Incidents" value={42} />);

    cy.get('[data-testid="stats-card"]').should('be.visible');
    cy.contains('Total Incidents').should('be.visible');
    cy.contains('42').should('be.visible');
  });

  it('renders with long title', () => {
    const longTitle = 'Average Response Time for Critical Incidents';
    cy.mount(<StatsCard title={longTitle} value="3.5 min" />);

    cy.contains(longTitle).should('be.visible');
    cy.contains('3.5 min').should('be.visible');
  });

  it('renders with zero value', () => {
    cy.mount(<StatsCard title="Errors" value={0} />);

    cy.contains('Errors').should('be.visible');
    cy.contains('0').should('be.visible');
  });

  it('renders with empty string value', () => {
    cy.mount(<StatsCard title="Status" value="" />);

    cy.contains('Status').should('be.visible');
    cy.get('[data-testid="stats-card"] p').should('be.empty');
  });

  it('has correct HTML structure', () => {
    cy.mount(<StatsCard title="Test Title" value="Test Value" />);

    cy.get('[data-testid="stats-card"]').within(() => {
      cy.get('h4').should('contain', 'Test Title');
      cy.get('p').should('contain', 'Test Value');
    });
  });

  it('handles special characters in title and value', () => {
    cy.mount(<StatsCard title="Speed (mph)" value="65.5 mph" />);

    cy.contains('Speed (mph)').should('be.visible');
    cy.contains('65.5 mph').should('be.visible');
  });

  it('renders with percentage value', () => {
    cy.mount(<StatsCard title="Success Rate" value="98.7%" />);

    cy.contains('Success Rate').should('be.visible');
    cy.contains('98.7%').should('be.visible');
  });

  it('renders with negative numeric value', () => {
    cy.mount(<StatsCard title="Change" value={-15} />);

    cy.contains('Change').should('be.visible');
    cy.contains('-15').should('be.visible');
  });

  it('renders with large numeric value', () => {
    cy.mount(<StatsCard title="Total Records" value={1000000} />);

    cy.contains('Total Records').should('be.visible');
    cy.contains('1000000').should('be.visible');
  });
});