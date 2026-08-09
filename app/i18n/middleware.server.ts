import "i18next";
import { initReactI18next } from "react-i18next";
import { createI18nextMiddleware } from "remix-i18next";

import resources, {
  defaultNS,
  fallbackLng,
  supportedLngs,
} from "~/i18n/resources";

export const [i18nextMiddleware, getLocale, getInstance] =
  createI18nextMiddleware({
    detection: {
      supportedLanguages: [...supportedLngs],
      fallbackLanguage: fallbackLng,
    },
    i18next: {
      resources,
      defaultNS,
      interpolation: { escapeValue: false },
    },
    plugins: [initReactI18next],
  });
