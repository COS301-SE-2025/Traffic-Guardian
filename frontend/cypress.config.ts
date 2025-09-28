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
      reportDir: 'cypress/reports/mochawesome/.jsons', //added /.jsons
      overwrite: false,
      html: false, //changed to false
      json: true,
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack',
      webpackConfig: {
        mode: 'development',
        devtool: false,
        resolve: {
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
          fallback: {
            "process": require.resolve("process/browser"),
          },
        },
        plugins: [
          new (require('webpack')).ProvidePlugin({
            process: 'process/browser',
          }),
        ],
        module: {
          rules: [
            {
              test: /\.tsx?$/,
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                compilerOptions: {
                  jsx: 'react-jsx',
                },
              },
            },
            {
              test: /\.css$/,
              use: ['style-loader', 'css-loader'],
            },
            {
              test: /\.(png|jpe?g|gif|svg)$/i,
              type: 'asset/resource',
            },
          ],
        },
      },
    },
    setupNodeEvents(on) {
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
    supportFile: 'cypress/support/component.ts',
  },
  env: {
    API_URL: process.env.CYPRESS_API_URL,
  },
});