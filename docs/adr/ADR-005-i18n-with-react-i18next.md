# ADR: i18n via react-i18next, Set Up Before Feature UI

**Status:** Accepted

---

## Context

The app is expected to serve communities where not every member is
comfortable in English, and retrofitting translation support after a lot of
hardcoded UI copy already exists is expensive — every screen has to be
revisited to extract strings that were never designed to be extracted. The
decision was to set up i18n infrastructure before the bulk of feature UI
(items, loans, messaging, invites) was built, even though only English would
be populated at first.

## Options Considered

### No i18n — hardcode English, retrofit later

Fastest short-term path, but defers the expensive part (finding and
extracting every hardcoded string across every screen) to whenever
translation actually becomes a requirement, at which point there's
significantly more UI to retrofit than there is today.

### react-i18next, wired in from the start

**Chosen.**

A well-established i18next binding for React with first-class SSR support,
wired through a React Router middleware so the server-resolved locale is
available to loaders/actions and the initial render, avoiding a
hydration-mismatch class of bugs that a client-only detection setup would
risk. Every new route is written against the extraction convention from day
one, so there's no later retrofit pass.

## Decision

- `remix-i18next` + `react-i18next` + `i18next`, wired via a React Router v8
  middleware (`app/i18n/middleware.server.ts`) registered in `root.tsx`.
- Only `en` is supported today (`app/i18n/resources.ts`'s `supportedLngs`).
  Locale is detected from the `Accept-Language` header; there's no visible
  language switcher or persisted preference yet, so it always resolves to
  `en`. `entry.client.tsx` hydrates using the locale the server already
  resolved (read from `document.documentElement.lang`) rather than
  re-detecting independently client-side, so there's no hydration mismatch
  to guard against even without a backend/detector library.
- Translation files live centrally under `app/locales/<lang>/<namespace>.json`
  — not colocated with route files — so a future translation-management
  sync has one predictable glob to watch instead of scattered files
  throughout `app/routes/`.
- Namespace granularity is by feature domain, not URL/folder depth: one file
  per top-level route area (`login.json`, `communities.json`, `items.json`,
  …), plus `common.json` for cross-cutting UI and `emails.json` for
  transactional email copy. Within a namespace, keys are nested shallowly
  and grouped by content-type (`errors.*`, `labels.*`, `buttons.*`, …), not
  by screen — grouping by content-type keeps each group scannable as one
  list, so an existing "please try again" gets reused instead of duplicated
  by accident.
- Emails are a deliberately separate i18n path: `app/mailer.server.ts`
  renders react-email templates via its own `render()` call from inside an
  action, entirely outside the request lifecycle (no root loader, no
  middleware `context`). Email copy resolves via `getEmailLocale()` — a
  property of the _recipient_, not of whoever happened to submit the
  triggering form — rather than the request's `Accept-Language`.

## Consequences

**Positive:**

- No retrofit pass needed as feature UI grows — every route since this
  decision has been written translation-ready from the start.
- Locale resolution happens once, server-side, and is threaded consistently
  to both SSR and hydration — no client-side re-detection, no
  hydration-mismatch class of bug.
- Centralized, content-type-grouped translation files make existing keys
  easy to find and reuse instead of duplicate.

**Negative / Tradeoffs:**

- Real translations, a translation-management sync, and a visible language
  switcher are all still not built — the infrastructure is ready, but the
  actual multilingual experience doesn't exist yet, so this decision pays
  a cost today for a benefit not yet realized.
- Every new route's copy has to go through `t()` and a namespace file even
  though only one locale is populated, which is marginally more ceremony
  than writing a plain string.
- Two genuinely separate i18n code paths exist (request-scoped app UI via
  middleware `context`, and recipient-scoped email via `getEmailLocale()`) —
  a contributor has to know which one applies depending on whether they're
  in a loader/action/component or a mailer template.
