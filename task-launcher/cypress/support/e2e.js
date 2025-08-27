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

// prevent firestore error from failing test
Cypress.on('uncaught:exception', (err, runnable) => {
  if (err.message.includes('user not in Firestore')) {
    return false;
  }
  if (/Permissions check failed/i.test(err.message)) {
    return false;
  }
});

// Mock fullscreen API so plugins don't throw inside Cypress iframe
Cypress.on('window:before:load', (win) => {
  try {
    Object.defineProperty(win.document, 'fullscreenEnabled', { value: false, configurable: true });
  } catch {}
  try {
    Object.defineProperty(win.document, 'webkitFullscreenEnabled', { value: false, configurable: true });
  } catch {}
  if (win.document && win.document.documentElement) {
    win.document.documentElement.requestFullscreen = () => Promise.resolve();
    // @ts-ignore
    win.document.documentElement.webkitRequestFullscreen = () => Promise.resolve();
  }
  win.document.exitFullscreen = () => Promise.resolve();
  // @ts-ignore
  win.document.webkitExitFullscreen = () => Promise.resolve();
});
