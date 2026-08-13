/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/docs/en/main/file-conventions/entry.client
 */

import {
  createSentryClientInstrumentation,
  init,
  reactRouterTracingIntegration,
  replayIntegration,
  sentryOnError,
} from "@sentry/react-router";
import i18next from "i18next";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { HydratedRouter } from "react-router/dom";

import resources, {
  defaultNS,
  fallbackLng,
  supportedLngs,
} from "~/i18n/resources";

const tracing = reactRouterTracingIntegration();
const clientInstrumentation = createSentryClientInstrumentation();

// Only initialize Sentry in a real deployed build (staging/production) — set
// as a build-time env var per Fly app in the deploy workflow. This keeps
// local dev and Playwright e2e runs from reporting to the live Sentry
// project, and doubles as the "staging" vs "production" environment tag.
const rawSentryEnvironment: unknown = import.meta.env.VITE_SENTRY_ENVIRONMENT;
const sentryEnvironment =
  typeof rawSentryEnvironment === "string" ? rawSentryEnvironment : undefined;

if (sentryEnvironment) {
  init({
    dsn: "https://15beb4037aabfb8389f303db56f72648@o4511593609297920.ingest.us.sentry.io/4511884767199232",
    environment: sentryEnvironment,
    dataCollection: {
      // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/react-router/configuration/options/#dataCollection
      // userInfo: false,
      // httpBodies: [],
    },
    integrations: [tracing, replayIntegration()],
    enableLogs: true,
    tracesSampleRate: 0.1,
    tracePropagationTargets: [/^\//, /^https:\/\/yourserver\.io\/api/],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// The server already resolved this request's locale (Accept-Language, via
// remix-i18next's middleware) and baked it into the rendered `<html lang>`
// attribute (see app/root.tsx). Reading it back from the DOM instead of
// running any client-side detection guarantees hydration uses the exact
// locale the server rendered with, so there's no mismatch and no need for
// i18next-browser-languagedetector.
const locale = document.documentElement.lang || fallbackLng;

i18next.use(initReactI18next);

// Resources are bundled directly (no backend/network), so this resolves on
// the same tick without a real async wait — but awaiting it rather than
// relying on that as an assumption keeps this correct regardless.
void i18next
  .init({
    lng: locale,
    fallbackLng,
    supportedLngs,
    defaultNS,
    resources,
    interpolation: { escapeValue: false },
  })
  .then(() => {
    startTransition(() => {
      hydrateRoot(
        document,
        <I18nextProvider i18n={i18next}>
          <StrictMode>
            <HydratedRouter
              instrumentations={[clientInstrumentation]}
              onError={sentryOnError}
            />
          </StrictMode>
        </I18nextProvider>,
      );
    });
  });
