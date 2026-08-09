import i18next from "i18next";

import translations from "~/locales/en/emails.json";

const SUPPORTED_EMAIL_LOCALES = ["en"] as const;
type EmailLocale = (typeof SUPPORTED_EMAIL_LOCALES)[number];

/**
 * There is no persisted per-user locale preference yet — no `User.locale`
 * field on the Prisma schema, and no separate settings model either.
 * Hardcoded to "en" until one exists (possibly a `User.locale` field, or a
 * separate `UserSetting` model — not yet decided). Kept as a named helper
 * rather than an inline literal at each call site so this is the one place
 * to update once a real preference exists.
 *
 * Deliberately does not read the triggering request's Accept-Language, even
 * though today's only call site (login.tsx's action) has a `request` in
 * scope — an email's language is a property of its recipient, not of
 * whoever happened to submit the form that sent it.
 */
export function getEmailLocale(): EmailLocale {
  return "en";
}

const emailI18n = i18next.createInstance();

// Resources are provided directly (no backend, no network) so the
// translation store is populated synchronously during this call — emailT
// below is safe to use immediately without awaiting the returned promise.
void emailI18n.init({
  lng: getEmailLocale(),
  fallbackLng: "en",
  supportedLngs: SUPPORTED_EMAIL_LOCALES,
  resources: { en: { emails: translations } },
  defaultNS: "emails",
  interpolation: { escapeValue: false },
});

export const emailT = emailI18n.getFixedT(getEmailLocale(), "emails");
