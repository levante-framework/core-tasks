import { browserTracingIntegration, getClient, init, replayIntegration } from '@sentry/browser';

// Default key for levante-framework/core-tasks
const CORE_TASKS_DSN =
  'https://9d67b24a405feffb49477ca8002cc033@o4507250485035008.ingest.us.sentry.io/4507376476618752';

const regexLevantePreview = /^https:\/\/hs-levante-admin-(prod|dev)(--pr\d+-\w+)?\.web\.app/;

/**
 * Initialize Sentry for standalone task hosts.
 * When embedded in the dashboard (or any host that already called Sentry.init),
 * skip so we do not clobber the parent client.
 */
export function initSentry() {
  if (getClient()) {
    return;
  }

  init({
    dsn: CORE_TASKS_DSN,
    integrations: [browserTracingIntegration(), replayIntegration()],
    tracesSampleRate: 1.0,
    tracePropagationTargets: [
      regexLevantePreview,
      'https://platform.levante-network.org',
      'https://hs-levante-admin-prod.web.app',
      'https://hs-levante-admin-dev.web.app',
      'localhost',
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
