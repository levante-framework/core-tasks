// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

import 'cypress-real-events';

// Screenshot Feature:
// To enable automatic screenshots on page visits, set the environment variable:
// Cypress.env('takeScreenshots', true) or run with --env takeScreenshots=true
// Screenshots will be saved to cypress/screenshots/ folder

// prevent firestore error from failing test
Cypress.on('uncaught:exception', (err, runnable) => {
  if (err.message.includes('user not in Firestore')) {
    return false;
  }
});
