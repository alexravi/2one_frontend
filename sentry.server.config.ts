// Sentry server-side configuration
// This file configures the Sentry SDK for the Node.js server (API routes, SSR).

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Don't send errors in development unless DSN is explicitly set
    enabled: !!SENTRY_DSN,
  });
}
