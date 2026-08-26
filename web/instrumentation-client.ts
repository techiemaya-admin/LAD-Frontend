// Sentry browser instrumentation (R18) - captures client-side errors that
// otherwise vanish (blank page, user leaves, no email). No-op until
// NEXT_PUBLIC_SENTRY_DSN is set. Requires `@sentry/nextjs` (in package.json).
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0),
    // Session Replay is opt-in - keep it off by default (cost + privacy).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
