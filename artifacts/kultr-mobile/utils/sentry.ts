import * as Sentry from "@sentry/react-native";

// With no DSN set, Sentry.init no-ops and captureException becomes a silent
// discard, so this is safe to call unconditionally in every environment.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  environment: process.env.EXPO_PUBLIC_ENV ?? (__DEV__ ? "development" : "production"),
  tracesSampleRate: dsn ? 0.1 : 0,
});

export { Sentry };
