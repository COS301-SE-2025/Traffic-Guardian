/// <reference types="cypress" />
/// <reference types="@cypress/react" />
/// <reference types="@cypress/sinon-chai" />
/// <reference types="chai" />
/// <reference types="sinon-chai" />

import { mount } from '@cypress/react'

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
    }
  }
}