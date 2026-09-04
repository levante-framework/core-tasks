import { defineConfig } from 'cypress';

const LANGUAGE_OPTIONS_URL =
  'https://storage.googleapis.com/levante-assets-dev/translations/dashboard-consolidated-flat/languageoptions.json';

const LIVE_TASK_PARAMS_URL = 'https://storage.googleapis.com/levante-assets-dev/live-task-params.json';

function taskVariantKey(task, params) {
  return JSON.stringify({ task, params });
}

function taskMatchPresent(task, matrix) {
  return Object.values(matrix).some((entry) => entry.task === task);
}

async function buildTaskVariantGroups() {
  const res = await fetch(LANGUAGE_OPTIONS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch language options: ${res.status} ${res.statusText}`);
  }
  const languageOptions = await res.json();
  const seen = new Set();

  const matrix = Object.entries(languageOptions).flatMap(([locale, cfg]) => {
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

  const paramsRes = await fetch(LIVE_TASK_PARAMS_URL);
  if (!paramsRes.ok) {
    throw new Error(`Failed to fetch live task params for testing: ${paramsRes.status} ${paramsRes.statusText}`);
  }
  const liveParams = await paramsRes.json();

  const firstLocalesPerVariant = {};
  const remainingLocalesPerVariant = {};
  matrix.forEach(({ locale, task }) => {
    const variants = liveParams[task]?.variants ?? [];
    variants.forEach((variant) => {
      const params = variant[locale];
      if (params === undefined) {
        return;
      }
      const key = taskVariantKey(task, params);
      // the first locale in each variant is separated out so that it can be tested end-to-end
      if (
        !firstLocalesPerVariant[key] &&
        // trog and vocab variants only differ by corpus, so no need to run through all of them
        !((task === 'trog' || task === 'vocab') && taskMatchPresent(task, firstLocalesPerVariant))
      ) {
        firstLocalesPerVariant[key] = { task, params, locale: locale };
      } else {
        if (!remainingLocalesPerVariant[key]) {
          remainingLocalesPerVariant[key] = { task, params, locales: [] };
        }

        remainingLocalesPerVariant[key].locales.push(locale);
      }
    });
  });

  if (Object.keys(remainingLocalesPerVariant).length === 0) {
    throw new Error('live task params produced an empty test matrix (no task variants).');
  }

  return { firstLocalesPerVariant, remainingLocalesPerVariant };
}

export default defineConfig({
  e2e: {
    async setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        progress(message) {
          // Print immediate progress to STDOUT so long runs show liveness
          console.log(`[progress] ${message}`);
          return null;
        },
      });

      const { firstLocalesPerVariant, remainingLocalesPerVariant } = await buildTaskVariantGroups();

      return {
        ...config,
        env: {
          ...config.env,
          firstLocalesPerVariant,
          remainingLocalesPerVariant,
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
