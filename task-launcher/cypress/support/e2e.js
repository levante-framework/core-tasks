// Global Cypress support: stub Fullscreen API to avoid permission errors in headless/iframe

Cypress.on('window:before:load', (win) => {
  try {
    const noop = () => Promise.resolve();
    const doc = win.document;
    const el = doc.documentElement;

    // Set fullscreenEnabled true
    try {
      Object.defineProperty(doc, 'fullscreenEnabled', { get: () => true });
    } catch (_) {
      doc.fullscreenEnabled = true;
    }

    // Stub element and document fullscreen methods
    el.requestFullscreen = el.requestFullscreen || noop;
    doc.requestFullscreen = doc.requestFullscreen || noop;
    doc.exitFullscreen = doc.exitFullscreen || noop;
    el.webkitRequestFullscreen = el.webkitRequestFullscreen || noop;
    doc.webkitExitFullscreen = doc.webkitExitFullscreen || noop;
    el.mozRequestFullScreen = el.mozRequestFullScreen || noop;
    doc.mozCancelFullScreen = doc.mozCancelFullScreen || noop;
    el.msRequestFullscreen = el.msRequestFullscreen || noop;
    doc.msExitFullscreen = doc.msExitFullscreen || noop;
  } catch (e) {
    // ignore
  }
});

// Ignore fullscreen permission exceptions
Cypress.on('uncaught:exception', (err) => {
  const msg = String(err || '');
  if (msg.includes('Fullscreen') || msg.includes('Permission')) {
    return false;
  }
});

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
});
