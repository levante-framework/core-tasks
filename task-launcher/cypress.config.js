import { defineConfig } from 'cypress';

const LANGUAGE_OPTIONS_URL =
  'https://storage.googleapis.com/levante-assets-dev/translations/dashboard-consolidated-flat/languageoptions.json';

async function buildLanguageLocaleTaskMatrix() {
  const res = await fetch(LANGUAGE_OPTIONS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch language options: ${res.status} ${res.statusText}`);
  }
  const languageOptions = await res.json();
  const seen = new Set();

  const matrix = Object.entries(languageOptions).flatMap(([locale, cfg]) => {
    if (locale === 'en-US') {
      return [];
    }
    if (!cfg || !Array.isArray(cfg.taskOptions)) {
      return [];
    }
    return cfg.taskOptions
      .filter((task) => {
        const key = `${locale}\0${task}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .map((task) => ({ locale, task }));
  });

  if (matrix.length === 0) {
    throw new Error('languageoptions.json produced an empty test matrix (no locales with taskOptions).');
  }

  return matrix;
}

export default defineConfig({
  e2e: {
    async setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        progress(message) {
          // Print immediate progress to STDOUT so long runs show liveness
          // eslint-disable-next-line no-console
          console.log(`[progress] ${message}`);
          return null;
        },
      });

      const matrix = await buildLanguageLocaleTaskMatrix();

      return {
        ...config,
        env: {
          ...config.env,
          languageLocaleTaskMatrix: matrix,
        },
      };
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
