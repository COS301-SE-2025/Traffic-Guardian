import { defineConfig } from 'cypress';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // Implement node event listeners here
    },
  },
  env: {
    API_URL: process.env.CYPRESS_API_URL || 'http://localhost:5000/api',
  },
});