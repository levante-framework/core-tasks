import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // Point to the task-launcher directory for tests
    specPattern: 'task-launcher/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'task-launcher/cypress/support/e2e.js',
    // Screenshot configuration
    screenshotsFolder: 'task-launcher/cypress/screenshots',
    // Custom environment variable for screenshot flag
    env: {
      takeScreenshots: false, // Set to true to enable automatic screenshots
    },
  },
  retries: {
    runMode: 2,
    openMode: 0,
  },
}); 