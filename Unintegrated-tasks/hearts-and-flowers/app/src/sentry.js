import * as Sentry from '@sentry/browser';
// import 'dotenv/config'

export function initSentry() {
  Sentry.init({
    dsn: 'https://824c4c36b4dff88550ff5cc0a3de46e1@o4505913837420544.ingest.sentry.io/4505913888735232',
    // release: process.env.npm_package_version,
    integrations: [
      new Sentry.BrowserTracing({
        // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
        tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/],
      }),
      new Sentry.Replay(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
    // Session Replay
    replaysSessionSampleRate: 1.0, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    beforeSend(event) {
      return event;
    },
  });
}
