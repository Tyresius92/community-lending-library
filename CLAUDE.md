# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A React Router (Framework Mode) + Prisma + PostgreSQL app, originally scaffolded from the (now-archived) Remix Blues Stack. The README still describes the original Blues Stack note-taking demo — treat it as stale background, not current behavior; auth in particular has since been rewritten (see below).

The Prisma schema (`prisma/schema.prisma`) already models the target domain — `Community`, `CommunityMembership`, `Item`, `Loan`, `Message`, `InviteToken` — for a community lending-library app where members share items within a community and track loans through a request/accept/checkout/return lifecycle. Application code has partially caught up: `User`, `MagicLink`, and a first `communities` create/join slice (`app/routes/communities/`) are wired up; `Item`, `Loan`, `Message`, and `InviteToken` are not yet. When adding features, check whether the schema already has the shape you need before changing it.

## Commands

```sh
npm run docker          # start Postgres in Docker (detached; wait for healthy before using)
npm run setup            # prisma generate + migrate deploy + db seed
npm run dev               # start dev server (http://localhost:3000)
npm run build             # production build
npm run typecheck        # tsc, no emit
npm run lint              # eslint (cached)
npm run lint:fix
npm run format             # prettier --write .
npm run format:check       # prettier --check . (read-only; used in CI)
npm run test               # vitest (watch mode)
npm run test -- --run     # vitest, single run
npm run test -- --run app/utils.test.ts   # run a single vitest file
npm run test:e2e:run      # npx playwright test (spins up dev server itself)
npm run validate            # test --run + lint + typecheck (in parallel), then e2e
npm run storybook          # start Storybook dev server (http://localhost:6006)
npm run build-storybook   # build static Storybook
```

- `postinstall` runs `prisma generate` automatically after `npm install`.
- Prisma client is generated into `app/generated/prisma` (imported as `~/generated/prisma/client`), not `node_modules/.prisma` — this path is git-ignored but must exist before typecheck/build will pass.
- After changing `prisma/schema.prisma`, run `npx prisma migrate dev` (creates a migration + regenerates the client).
- Playwright config auto-starts `npm run dev:test` (`react-router dev --mode test`) against a dedicated `postgres_test` database, reset fresh on every run — make sure the Docker Postgres container is up first (`npm run docker`).

## Architecture

**Routing**: routes are declared explicitly in [app/routes.ts](app/routes.ts) (React Router Framework Mode, not filesystem routing) — nothing auto-registers from disk layout, so adding a route means adding both the file(s) under `app/routes/` and the corresponding entry in `routes.ts`. The folder structure under `app/routes/` is convention only, but is enforced by convention:

- A route segment `foo` gets its own folder `foo/` containing `foo.tsx` — the page/content for that exact path. This applies even to simple, non-nested routes (e.g. `login/login.tsx`), for shape consistency.
- `foo.layout.tsx` is added alongside `foo.tsx` only when the segment has children that share layout UI (e.g. a nav shared across a resource and its sub-routes). It's optional — omit it when there's nothing to share. In `routes.ts`, the layout file is the parent `route()`, wrapping an `index()` (the plain `foo.tsx`) plus any child routes.
- When a shared layout wraps multiple routes but contributes no URL segment of its own, prefix the folder with `_` (e.g. `_auth/` wrapping `login/` and `join/`, with `_auth.layout.tsx` as the shared layout — there's no `_auth.tsx`, since there's no content at that non-existent path).
- The root `/` route is the one exception: it stays a flat `app/routes/_index.tsx`, not wrapped in its own folder.

Example:

```ascii
app/routes/
├── _index.tsx                  // root "/" — flat, exception to the rule
├── _auth/                      // shared layout, no URL segment of its own
│   ├── login/
│   │   └── login.tsx
│   ├── join/
│   │   └── join.tsx
│   └── _auth.layout.tsx
└── communities/
    ├── new/
    │   └── new.tsx
    ├── $communitySlug/
    │   ├── $communitySlug.layout.tsx   // shared layout for a single community + its children
    │   └── $communitySlug.tsx           // content at exactly "/communities/:communitySlug"
    ├── communities.layout.tsx        // shared layout for communities + its children
    └── communities.tsx                // content at exactly "/communities"
```

```ts
export default [
  index("routes/_index.tsx"),
  layout("routes/_auth/_auth.layout.tsx", [
    route("login", "routes/_auth/login/login.tsx"),
    route("join", "routes/_auth/join/join.tsx"),
  ]),
  route("communities", "routes/communities/communities.layout.tsx", [
    index("routes/communities/communities.tsx"),
    route("new", "routes/communities/new/new.tsx"),
    route(
      ":communitySlug",
      "routes/communities/$communitySlug/$communitySlug.layout.tsx",
      [index("routes/communities/$communitySlug/$communitySlug.tsx")],
    ),
  ]),
] satisfies RouteConfig;
```

See the live (non-hypothetical) version of this in [app/routes.ts](app/routes.ts) and `app/routes/communities/`.

**Planned community IA** (not yet built — `Item`/`Loan`/`Message` aren't wired up yet): once built, community-scoped screens nest under `/community/:communitySlug` (`browse`, `members`, `loans`, `items/:id`), with `/communities` one level up as the only place "my communities" (join/leave/switch) is a page — it must not be nested inside a community's own section list as a peer of Browse/Members/Loans. Items are modeled as fully separate listings per community (no shared item entity reused across communities). Switching communities navigates to a different community's route root, preserving the current leaf route where sensible (e.g. staying on `/loans`). **Privacy rule** (functional, not just visual — must hold in loaders/actions, not only be hidden client-side): borrowers never see who owns an item until the lender accepts their request; until then, render a neutral placeholder like "a neighbor" instead of the owner's name/avatar on Browse, Item Detail, and My Loans. On the Members list, item ownership must never be shown or inferable at all (no per-type item counts, no click-through from a member to their listings) — only aggregate, non-identifying stats like total lend count are safe. Full visual design system (colors, shadows, typography, screen layouts, copy voice, accessibility floor) lives in the `zine-design-system` skill — read it before building any of these screens.

**Auth (passwordless, magic-link)**: there is no password field on `User`. Login flow: [login.tsx](app/routes/login/login.tsx) validates + rate-limits (`app/utils/rate_limit.server.ts`, in-memory, per-process) an email, upserts a `User` (`findOrCreateUserByEmail`), creates a `MagicLink` token (`app/models/magic_link.server.ts` — random token, only its SHA-256 hash is stored, 20-minute expiry, single-use via a conditional `updateMany` to survive email-scanner prefetches), and emails it via `sendEmail`/react-email (`app/mailer.server.ts`, `app/emails/`). [magic_link.tsx](app/routes/magic_link/magic_link.tsx) consumes the token and calls `createUserSession`. Session state itself is a signed cookie (`app/session.server.ts`, `createCookieSessionStorage`) storing just the `userId`. Auth guards never throw: `getUserId`/`getUser` resolve the signed-in user (or `undefined`/`null`), and a loader/action that requires auth checks the result itself and returns `loginRedirect(url)` — e.g. `const userId = await getUserId(request); if (!userId) return loginRedirect(url);`. This mirrors `net-worth-tracker`'s `session.server.ts` pattern and exists specifically so nothing in a loader/action throws a non-`Error` value (a `Response`) — this repo is expected to adopt ESLint's `@typescript-eslint/only-throw-error` rule, which disallows that. There is no `requireUser`/`requireUserId` — those threw and have been removed; new guards should follow the same check-and-return-early shape rather than reintroducing a throwing helper.

**Internationalization (i18n)**: `remix-i18next` + `react-i18next` + `i18next`, wired via a React Router v8 middleware (`app/i18n/middleware.server.ts`, registered as `middleware` in [root.tsx](app/root.tsx)). Only `en` is supported today (`app/i18n/resources.ts`'s `supportedLngs`) — locale is detected from the `Accept-Language` header, but there's no visible language switcher yet and no persisted locale preference, so it always resolves to `en`. There's no `i18next-browser-languagedetector` or HTTP/fs backend: `entry.client.tsx` hydrates using the locale the server already resolved (read from `document.documentElement.lang`, which `root.tsx` sets dynamically from `i18n.language`) rather than re-detecting independently, so there's no hydration mismatch to guard against.

Translation files live centrally under `app/locales/<lang>/<namespace>.json` — not colocated with route files, so a future Weblate/TMS sync (Post-MVP Backlog) has one predictable glob to watch instead of scattered files throughout `app/routes/`. Namespace granularity is by feature domain, not URL/folder depth: one file per top-level route area (`login.json`, `communities.json`, and eventually `items.json`/`loans.json`/`messages.json`/`invite.json` as those land), plus `common.json` for things shared across unrelated pages (e.g. the root nav bar) and `emails.json` for transactional email copy (not a route area, but its own namespace). A community-scoped feature keeps one namespace no matter how deep its routes nest under `/communities/:slug/` — e.g. everything under `/communities/:slug/items/**` still shares `items.json`, since item-editing copy doesn't differ per community. Within a namespace file, JSON is genuinely nested (not dot-delimited flat keys), but shallowly (1-2 levels) and grouped by content-type — `errors.*`, `labels.*`, `buttons.*`, `nav.*`, `meta.*` — never by screen/route. This is deliberate: per-screen nesting makes it easy to add a near-duplicate key (e.g. another "Please try again") without noticing the same message already exists elsewhere in the file, whereas grouping by content-type keeps each group scannable as one list so an existing key gets reused instead of duplicated. Add a new namespace file to the `en` object in `app/i18n/resources.ts` when it's created.

Pulling a translated string into a route: client components use `const { t } = useTranslation("namespace")`; loaders/actions use `const t = getInstance(context).getFixedT(getLocale(context), "namespace")` (both exports come from `~/i18n/middleware.server`). `meta` functions don't receive `context` (so no `t()` there) — a translated `<title>` is computed in the loader and returned as loader data (e.g. `return { title: t("meta.title") }`), and `meta` reads `loaderData?.title`.

Emails are a separate, deliberately decoupled i18n path: `app/mailer.server.ts` renders react-email templates via its own `render()` call from within an action, entirely outside the React Router request lifecycle (no root loader, no middleware `context`). Email copy uses its own always-`"en"`-for-now i18next instance (`app/emails/locale.server.ts`'s `emailT`, namespace `emails.json`), resolved via `getEmailLocale()` rather than the triggering request's `Accept-Language` — an email's language is a property of its recipient, not of whoever happened to submit the form that sent it, and there's no persisted per-user locale yet to resolve that properly. `getEmailLocale()` is the one place to update once a real preference (e.g. a `User.locale` field, or a separate settings model) exists.

**Data layer**: `app/db.server.ts` builds a singleton `PrismaClient` over `@prisma/adapter-pg`, keyed via `app/singleton.server.ts` so HMR in dev doesn't spawn duplicate clients/connections. Auth code goes through functions in `app/models/*.server.ts` (`user.server.ts`, `magic_link.server.ts`). Newer feature areas (starting with `communities`) skip that indirection — loaders/actions call `prisma` directly, and each route independently fetches/re-checks what it needs rather than sharing data across routes. Route components also read their data via the `loaderData`/`actionData` props from React Router's typegen (`Route.ComponentProps`, imported from `./+types/<routename>`) instead of the `useLoaderData()`/`useActionData()` hooks that older routes still use.

**Community membership/role checks**: `app/utils/community_role.server.ts` is the one shared cross-cutting auth/permission helper — a deliberate exception to the "loaders/actions call Prisma directly" rule above, not a per-entity model file. It exports `getCommunityMembership(userId, communitySlug)`, which resolves the community by slug and the caller's own `CommunityMembership` row, returning `{ community, membership } | null` (`null` covers both "community doesn't exist" and "not a member," deliberately collapsed so a non-member can't probe whether a private community's slug exists — same reasoning `$communitySlug.layout.tsx`'s loader already applies inline), and `meetsMinRole(role, minRole)`, a pure ordinal comparison (`member < admin < owner`) with no DB access. Any future route needing "is this user a member / admin / owner of this community" (Item edit/delete, Invite generate/revoke, Members kick/promote, etc.) should call these instead of re-deriving the check, e.g.:

```ts
const userId = await getUserId(request);
if (!userId) {
  return loginRedirect(url);
}

const found = await getCommunityMembership(userId, params.communitySlug);
if (!found) {
  return new Response(null, { status: 404 });
}

if (!meetsMinRole(found.membership.role, "admin")) {
  return new Response(null, { status: 403 });
}
```

`$communitySlug.layout.tsx` itself hasn't been retrofitted to use this helper — its membership check is conditional on the community's `visibility` (public communities skip the membership check entirely), which doesn't fit `getCommunityMembership`'s shape cleanly.

**Logging & error tracking (Sentry)**: `app/logger.ts` exports `logger` (`error`, `warn`, `info`, `setUser`), modeled directly on `net-worth-tracker`'s `app/logger.ts`. `error`/`warn`/`info` are backed by `@sentry/react-router`'s `captureException`/`captureMessage`/`addBreadcrumb`; `setUser` tags the current Sentry scope with the signed-in user (called from `root.tsx`'s loader). Every method checks `process.env.NODE_ENV === "development"` first and falls back to the matching `console.*` call instead of touching Sentry, so local dev output is unchanged from plain `console.*` — this means the logger is silent-to-Sentry (not silent-to-terminal) in dev. Deliberately **not** suffixed `*.server.ts`: it's used from `root.tsx`'s `ErrorBoundary`, a client-reachable route export, not just loaders/actions — React Router's server-code-stripping only applies to `loader`/`action`/`middleware`/`headers` exports, so a `.server.ts` import from `ErrorBoundary` fails the build. `@sentry/react-router`'s functions are safe to call from either runtime (Sentry's client SDK is already initialized separately in `entry.client.tsx`), so this doesn't leak anything server-only into the client bundle. `eslint.config.js` special-cases `app/logger.ts`/`app/logger.test.ts` into the same "allow console" rule as `*.server.ts` files, since its dev-mode console fallback is deliberate, not a stray debug call. Server-side app-runtime code (loaders, actions, server modules) should use `logger` instead of `console.*`. Two categories stay on raw `console.*` intentionally: one-off CLI scripts that never run inside the deployed app (`prisma/seed.ts`, `mocks/index.js`), and dev-only debug output that must never reach Sentry even indirectly via breadcrumbs — e.g. `login.tsx`'s magic-link URL log and `mailer.server.ts`'s dev-mode email dump, both of which can contain live secrets/tokens.

Sentry itself only initializes in an actually-deployed environment, never in local dev or Playwright e2e runs, to keep the one live Sentry project free of local noise. Server-side (`instrument.server.mjs`, loaded via `NODE_OPTIONS` in the `dev`/`start` scripts) gates on `process.env.FLY_APP_NAME`, which Fly sets automatically on every deployed machine and nowhere else; client-side (`entry.client.tsx`) gates on a build-time `import.meta.env.VITE_SENTRY_ENVIRONMENT`, passed as a `--build-arg` per `flyctl deploy --app` call in `.github/workflows/deploy.yml` (`staging` vs `production`, matching the `Dockerfile`'s `build` stage `ARG`s). The same value doubles as the Sentry `environment` tag, so staging and production errors are distinguishable in the Sentry UI despite sharing one DSN/project. Source-map upload (`vite.config.ts`'s `sentryReactRouter()` plugin) needs a `SENTRY_AUTH_TOKEN` GitHub Actions secret, threaded through the same build-arg mechanism — without it, errors still reach Sentry, just with minified stack traces.

**Design system (`app/components/`)**: a small, currently-unstyled component library (`Button`, `Link`, `TextInput`, `TextArea`, `Select`, `RadioGroup`, `Checkbox`, `Box`), modeled on the equivalent components in the `net-worth-tracker` project. Both folders and files use snake_case (e.g. `app/components/text_input/text_input.tsx`); only the exported component name is PascalCase (`TextInput`). No CSS yet — components exist for semantic/accessible structure (labels, `aria-describedby`, `aria-invalid`, etc.) and are meant to be skinned later without call sites changing. New forms/nav should be built from these rather than raw HTML elements. The target visual styling (colors, shadows, typography) isn't decided in this file — see the `zine-design-system` skill.

**Storybook**: every design-system component has a colocated `*.stories.tsx` (e.g. `app/components/button/button.stories.tsx`), run via `npm run storybook`. Each story file sets an explicit `title: "components/PascalName"` in its `meta` (Storybook's file-path-derived default would otherwise show the snake_case folder name in the sidebar). Every new or modified design-system component must ship with a story as part of that component's own PR — this is enforced, not just convention: `@storybook/addon-a11y` runs an axe accessibility check against every story, and `.storybook/preview.tsx` sets `a11y.test: "error"`, so an accessibility violation in any story fails `npm run test` and blocks CI (see Testing/CI below). `.storybook/main.ts` guards the root `vite.config.ts`'s `reactRouter()` plugin behind `process.env.STORYBOOK` (set at the top of `main.ts`) since that plugin only works under the React Router CLI, not Storybook's own Vite server.

**Env vars** (see `.env.example`): `DATABASE_POOLER_URL` (used at request time by the app), `DATABASE_DIRECT_URL` (used by Prisma CLI for migrations — see `prisma.config.ts`), `SESSION_SECRET`, `RESEND_API_KEY`, `FROM_EMAIL`. Separate `.env.staging` / `.env.production` files exist alongside `.env`.

**Testing**:

- Vitest (`vitest.config.ts`) runs `*.test.*` files colocated under `app/`, `happy-dom` environment, globals on, setup in `test/setup-test-env.ts`.
- Vitest tests that need real data (e.g. `app/utils/community_role.server.test.ts`) hit the same `postgres_test` database Playwright uses, via the actual `prisma` client from `app/db.server.ts` — no mocking. `test/db_global_setup.ts` runs `prisma migrate reset --force` once before the suite (same mechanism as `tests/global_setup.ts`, just for Vitest); since this Prisma version always reseeds on reset, tests can't assume an empty database. Test data is built with `@quramy/prisma-fabbrica` factories in `app/factories/` (`user_factory.server.ts`, `community_factory.server.ts`, `community_membership_factory.server.ts`; generated client in `app/generated/fabbrica`, wired up via `initialize({ prisma })` in `test/setup-test-env.ts`), using `@faker-js/faker` for field values so each test's fixtures are randomized and don't collide with seed data or each other — mirrors `net-worth-tracker`'s `app/factories/` + fabbrica pattern. Add a new factory here (not a one-off `prisma.create()` call in the test) whenever a test needs to construct a model that doesn't have one yet. Because both Vitest's `db_global_setup.ts` and Playwright's `tests/global_setup.ts` run a destructive `prisma migrate reset --force` against the same `postgres_test` database, `npm run validate` no longer runs `test:e2e:run` in the same parallel group as `test -- --run`/`lint`/`typecheck` (concurrent resets against the same database corrupt each other) — it runs after that group succeeds instead.
- Vitest also has a second, browser-mode `storybook` project (`@storybook/addon-vitest`, Chromium via `@vitest/browser-playwright`) that runs every `*.stories.tsx` file's play functions and the `addon-a11y` accessibility check. Plain `npm run test` (and `npm run validate`) runs both projects together; target just this one with `npx vitest --project storybook run`.
- Playwright e2e specs live in `tests/` (not colocated with `app/`), config in `playwright.config.ts`, runs against chromium/firefox/webkit. A11y is checked at this layer too, via `@axe-core/playwright`: `tests/helpers/axe.ts` exports `expectNoAxeViolations(page)`, which hard-fails the test on any violation (`expect(violations).toEqual([])`) — the same enforced bar as Storybook's `addon-a11y`, just at the rendered-page level instead of the component level. New screen-level specs are expected to call it as part of that feature issue's own DoD.
- Playwright runs against a dedicated `postgres_test` database (same Docker Postgres container as dev, different database name — see `docker/init-test-db.sql`), never the dev database. Config is `.env.test` (committed; no real secrets). `tests/global_setup.ts` runs `prisma migrate reset --force` against it automatically before every `npm run test:e2e:run` (this Prisma version always reruns the seed on reset — `prisma/seed.ts` is idempotent and its fixed fixtures don't collide with specs, which generate randomized emails/slugs); use `npm run test:db:reset` to reset it manually (e.g. after editing migrations) without running the full suite. The `postgres_test` database only exists once `./postgres-data` has been initialized with `docker/init-test-db.sql` mounted — a pre-existing volume needs a one-time wipe (`docker compose down && rm -rf ./postgres-data && docker compose up -d --wait && npm run setup`) to pick it up.
- MSW (`mocks/`) is available for stubbing third-party HTTP in tests/dev; see `mocks/README.md`.

## CI/CD

`.github/workflows/deploy.yml` runs lint, typecheck, vitest (with coverage — this includes the Storybook/a11y project, so an accessibility violation in any story fails this job and blocks deploy; the job installs Chromium via `npx playwright install --with-deps chromium` first, then runs `docker compose up -d --wait` since some Vitest tests hit the real `postgres_test` database, same as the Playwright job below), and Playwright (against a docker-composed Postgres, with Playwright's own `globalSetup` resetting the dedicated `postgres_test` database — the same mechanism used locally) on every push/PR. On success, pushes to `dev` deploy to the Fly.io staging app and then fast-forward `dev` into `main`; pushes to `main` deploy to the Fly.io production app. There is no separate merge-to-main step — `dev` is promoted to `main` automatically after a successful staging deploy.

## Conventions

- **New files, directories, and routes use `snake_case`** (e.g. `magic_link.server.ts`, `rate_limit.server.ts`), not kebab-case. React component export names stay `PascalCase`. Exception: dynamic route segments are camelCase, prefixed with `$` (e.g. `$userId`, `$communitySlug`) — see Architecture → Routing.
- Import alias `~/*` maps to `app/*`. ESLint enforces import ordering/grouping (builtin → external → internal → parent/sibling, alphabetized, blank line between groups) and treats `~/` as internal.
- ESLint runs `eslint-plugin-jsx-a11y`'s `strict` ruleset (`.eslintrc.cjs`, React override block) against all JS/TS/JSX/TSX files — this is the accessibility enforcement layer at lint time, alongside the Storybook/Playwright axe checks described under Testing. `jsx-a11y/no-autofocus` is turned back off, since this app intentionally autofocuses form inputs (e.g. the login email field) after validation errors.
- `*.server.ts` naming marks server-only modules (enforced by convention/React Router, not just style) — keep secrets and DB/Prisma access behind that suffix.
- Dependencies in `package.json` are pinned to exact versions (no `^`/`~` ranges) — match that when adding packages.
