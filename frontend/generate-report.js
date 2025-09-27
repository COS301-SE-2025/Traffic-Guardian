#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create directories
const reportsDir = 'cypress/reports';
const jsonsDir = 'cypress/reports/mochawesome/.jsons';

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

if (!fs.existsSync(jsonsDir)) {
  fs.mkdirSync(jsonsDir, { recursive: true });
}

// Check if any JSON reports exist
const jsonFiles = fs.readdirSync(jsonsDir).filter(file => file.endsWith('.json'));

if (jsonFiles.length === 0) {
  // Create placeholder report
  const placeholderReport = {
    stats: {
      suites: 0,
      tests: 0,
      passes: 0,
      pending: 0,
      failures: 0,
      passPercent: 0,
      pendingPercent: 0,
      other: 0,
      hasOther: false,
      skipped: 0,
      hasSkipped: false,
      testsRegistered: 0,
      start: new Date().toISOString(),
      end: new Date().toISOString(),
      duration: 0
    },
    results: [{
      uuid: '00000000-0000-0000-0000-000000000000',
      title: 'No tests found',
      fullFile: 'cypress/e2e/placeholder.cy.ts',
      file: 'cypress/e2e/placeholder.cy.ts',
      beforeHooks: [],
      afterHooks: [],
      tests: [],
      suites: [],
      passes: [],
      failures: [],
      pending: [],
      skipped: [],
      duration: 0,
      root: true,
      rootEmpty: true,
      _timeout: 2000
    }]
  };

  // Write merged report directly
  fs.writeFileSync(
    path.join(reportsDir, 'mochawesome-report.json'),
    JSON.stringify(placeholderReport, null, 2)
  );

  console.log('Generated placeholder test report (no tests were run)');
} else {
  console.log(`Found ${jsonFiles.length} test reports, merging...`);
  // If there are actual test reports, merge them normally
  // This would use mochawesome-merge but since we're handling the placeholder case,
  // the CI script can handle the normal merge case
}