import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // Video recording settings
    video: true,
    videoCompression: 32,
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    viewportWidth: 1000,
    viewportHeight: 660,
    defaultCommandTimeout: 30000,
    requestTimeout: 30000,
    responseTimeout: 30000,
    pageLoadTimeout: 60000,
    // Memory management settings
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 1,
    // Reduce video frame rate for smaller files
    env: {
      videoFrameRate: 5  // Lower frame rate for more compact videos
    },
    // Add specPattern to include both e2e and e2e-screenshot-scripts
    specPattern: [
      'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
      'cypress/e2e-screenshot-scripts/**/*.cy.{js,jsx,ts,tsx}'
    ]
  },
  retries: {
    runMode: 0,
    openMode: 0,
  },
});
