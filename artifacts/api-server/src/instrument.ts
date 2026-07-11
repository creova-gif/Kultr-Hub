// Imported first, before any other module, so Sentry's auto-instrumentation
// can patch Express/HTTP before they're required elsewhere. With no
// SENTRY_DSN set, the SDK initializes in a disabled no-op state.
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: process.env.SENTRY_DSN ? 0.1 : 0,
});
