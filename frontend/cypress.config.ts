import { defineConfig } from 'cypress';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL,
    setupNodeEvents(on, config) {
      // Implement node event listeners here
      require('cypress-mochawesome-reporter/plugin')(on);
    },
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true,
    reporter: 'cypress-mochawesome-reporter',
    reporterOptions: {
      charts: true,
      reportPageTitle: 'TrafficGuardian Cypress Tests',
      embeddedScreenshots: true,
      inlineAssets: true,
      saveAllAttempts: false,
      reportDir: 'cypress/reports/mochawesome',
      overwrite: false,
      html: true,
      json: true,
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack',
    },
    setupNodeEvents(on, config) {
      require('cypress-mochawesome-reporter/plugin')(on);
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true,
    reporter: 'cypress-mochawesome-reporter',
    reporterOptions: {
      charts: true,
      reportPageTitle: 'TrafficGuardian Component Tests',
      embeddedScreenshots: true,
      inlineAssets: true,
      saveAllAttempts: false,
      reportDir: 'cypress/reports/mochawesome',
      overwrite: false,
      html: true,
      json: true,
    },
  },
  env: {
    API_URL: process.env.CYPRESS_API_URL,
  },
});