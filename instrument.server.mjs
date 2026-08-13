import * as Sentry from "@sentry/react-router";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// Fly sets FLY_APP_NAME automatically on every deployed machine — only
// present when this is actually running on Fly (staging/production), never
// in local dev. Deriving "staging" vs "production" from it means we don't
// need a separate secret to tell the two apart in Sentry.
const flyAppName = process.env.FLY_APP_NAME;

if (flyAppName) {
  Sentry.init({
    dsn: "https://15beb4037aabfb8389f303db56f72648@o4511593609297920.ingest.us.sentry.io/4511884767199232",

    environment: flyAppName.endsWith("-staging") ? "staging" : "production",

    dataCollection: {
      // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/react-router/configuration/options/#dataCollection
      // userInfo: false,
      // httpBodies: [],
    },

    // Enable logs to be sent to Sentry
    enableLogs: true,

    integrations: [
      nodeProfilingIntegration(),
      // Fly's health checker polls /healthcheck every 10s per machine (see
      // fly.toml) — that's pure noise with no useful signal, and at 100%
      // sampling was the single largest driver of our performance-unit
      // consumption. Skip creating a transaction for it entirely rather
      // than sampling it down, since it carries no diagnostic value.
      Sentry.httpIntegration({
        ignoreIncomingRequests: (url) => url.startsWith("/healthcheck"),
      }),
    ],
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1, // matches tracesSampleRate — profile the same fraction of sampled transactions

    // Set up performance monitoring
    beforeSend(event) {
      // Filter out 404s from error reporting
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (
          error?.type === "NotFoundException" ||
          error?.value?.includes("404")
        ) {
          return null;
        }
      }
      return event;
    },
  });
}
