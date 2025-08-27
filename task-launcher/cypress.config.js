import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        progress(message) {
          // Print immediate progress to STDOUT so long runs show liveness
          // eslint-disable-next-line no-console
          console.log(`[progress] ${message}`);
          return null;
        },
      });
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
    // Reduce video frame rate for smaller files
    env: {
      videoFrameRate: 5, // Lower frame rate for more compact videos
    },
  },
  retries: {
    runMode: 0,
    openMode: 0,
  },
});
