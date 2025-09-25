import React from 'react'
import LoadingSpinner from './LoadingSpinner'

describe('LoadingSpinner Component', () => {
  it('renders loading spinner', () => {
    cy.mount(<LoadingSpinner />)
    cy.get('[data-testid="loading-spinner"]').should('exist')
    cy.get('[data-testid="loading-spinner"]').should('be.visible')
  })

  it('renders with custom size', () => {
    cy.mount(<LoadingSpinner size="large" />)
    cy.get('[data-testid="loading-spinner"]').should('exist')
    cy.get('[data-testid="loading-spinner"]').should('have.class', 'large')
  })

  it('renders with custom test id', () => {
    cy.mount(<LoadingSpinner data-testid="custom-spinner" />)
    cy.get('[data-testid="custom-spinner"]').should('exist')
  })
})