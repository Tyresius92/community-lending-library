/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/docs/en/main/file-conventions/entry.client
 */

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
            <HydratedRouter />
          </StrictMode>
        </I18nextProvider>,
      );
    });
  });
