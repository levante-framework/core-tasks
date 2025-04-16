import * as Sentry from '@sentry/browser';
export type SentryContextType = {
  itemId: string;
  taskName: string;
  pageContext: string;
};

export const setSentryContext = (context: SentryContextType) => {
  Sentry.setContext('LevanteContext', context);
};
