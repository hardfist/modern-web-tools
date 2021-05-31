import * as Sentry from '@sentry/browser';
import { Integrations } from '@sentry/tracing';

Sentry.init({
  dsn: 'https://4a0a495b478843feb697efc0c0fed223@o178403.ingest.sentry.io/5778615',
  integrations: [new Integrations.BrowserTracing()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0
});
function inner() {
  let b = a + 1;
}
function outer() {
  inner();
}
setTimeout(() => {
  outer();
}, 1000);
