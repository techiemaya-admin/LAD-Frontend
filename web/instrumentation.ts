// Sentry server/edge instrumentation (R3/R18).
// Next.js calls register() once at server startup. Init is a no-op until
// SENTRY_DSN is configured, so the app runs unchanged before Sentry is set up.
// NOTE: requires `@sentry/nextjs` to be installed (it's in package.json) - run
// `npm install` if the import below fails to resolve.
import * as Sentry from '@sentry/nextjs';

export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return; // no-op until configured

  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    });
  }
}

// Reports nested React Server Component / route-handler errors to Sentry.
export const onRequestError = Sentry.captureRequestError;
