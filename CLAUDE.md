# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A React Router (Framework Mode) + Prisma + PostgreSQL app for a community lending library — members share items within a community and track loans through a request/accept/checkout/return lifecycle.

The Prisma schema (`prisma/schema.prisma`) already models the full domain — `Community`, `CommunityMembership`, `Item`, `Loan`, `Message`, `InviteToken`. Application code has partially caught up: auth, communities, and `Item` management are wired up; `Loan`, `Message`, and `InviteToken` are not yet. Check whether the schema already has the shape you need before changing it. See [docs/adr/](docs/adr/) for the reasoning behind major decisions.

## How we work

**Ask before assuming — no exceptions for "small" decisions.** This is the single most important rule in this file. If there is any ambiguity at all — in scope, design, behavior, implementation, wording, or whether a decision made elsewhere should also apply here — stop and ask, rather than resolving it yourself. In particular, none of the following are valid reasons to skip asking:

- The answer feels obvious to you. ("Obviously right" is not the same as "confirmed right," and this exact thought has preceded real mistakes in this project.)
- The decision feels small, cosmetic, or "just an implementation detail" — a sort order, a default value, a naming choice, an error message's wording, whether to touch a file adjacent to the one you're supposed to be changing.
- You're mid-task and asking would break momentum or slow down a checkpoint you're trying to finish.
- Deciding it yourself would keep the diff smaller, or get you to "done" sooner.

The default action on any unstated judgment call is to stop and ask — proceeding on your own judgment is the exception, reserved for cases where the user has already explicitly specified the answer or there is truly no second reasonable interpretation. The cost of asking is a short pause. The cost of guessing wrong is rework, an explanation, and re-teaching the same lesson. When those two costs are ever in tension, asking wins, every time.

**One logical unit at a time.** Break work into discrete steps. Complete one, report what was done, and wait for approval before starting the next.

**No code comments without permission.** Do not add code comments unless the user explicitly instructed one, or you asked and the user approved it first. This overrides the general "add a comment when the WHY is non-obvious" allowance — in this repo, that judgment call belongs to the user, not to Claude.

**Verify before declaring done.** Run the `ship-check` skill before reporting any coding task complete — it runs typecheck, unit tests, build, e2e, lint, and format in order, fixing failures and restarting until everything's green.

**Tests are part of the task, not a follow-up.** Every change to production code includes tests in the same unit of work. Use Vitest for utility functions, server-side logic, data transformations, and components that don't need a full server. Use Playwright for page flows, form submissions, and auth/UI behavior a user would actually perform. Don't import a route's `action`/`loader` directly into a Vitest test — Playwright exercises the full request cycle and is the right tool for that; ask before making an exception.

**Documentation is part of the task, not a follow-up.** A change to a convention, pattern, or architectural decision updates this file in the same unit of work that made it stale — and gets a new ADR under `docs/adr/` if it's a real decision with alternatives, not a follow-up issue. Same for a component's Storybook story or a skill file's how-to steps, if the change affects them.

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
- Prisma client is generated into `app/generated/prisma` (git-ignored, must exist before typecheck/build will pass).
- After changing `prisma/schema.prisma`, run `npx prisma migrate dev`.
- Playwright needs the Docker Postgres container up first (`npm run docker`).

## Architecture

**Routing**: routes are declared explicitly in [app/routes.ts](app/routes.ts) (Framework Mode, not filesystem routing) — adding a route means adding both the file(s) under `app/routes/` and the corresponding entry in `routes.ts`. A route segment `foo` gets its own folder `foo/foo.tsx`. Add `foo.layout.tsx` alongside it only when the segment has children that share layout UI. When a shared layout contributes no URL segment of its own, prefix the folder with `_` (e.g. `_auth/`). The root `/` route is the one exception, staying flat as `app/routes/_index.tsx`.

The only non-route files that belong under `app/routes/` are components used exclusively by that one route (e.g. a route-local `member_card.tsx`, not reusable enough to belong in `app/components/`). Server-side helpers, data-transformation functions, and anything else that isn't a route module or a route-exclusive component go in `app/utils/` (or another appropriately-named top-level `app/` directory), even if only one route currently calls them.

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

See the live version in [app/routes.ts](app/routes.ts) and `app/routes/communities/`.

**Community IA**: community-scoped screens (`items`, `my_items`, `members`, `loans`) nest under `/communities/:communitySlug` as siblings. `/communities` one level up is the only place "my communities" (join/leave/switch) lives. Items are modeled as fully separate listings per community. `Loan`/`Message` aren't wired up yet.

**Privacy rule** (enforced in loaders/actions, not just hidden client-side): item owner identity is never shown to a browsing member — a neutral placeholder ("a neighbor") renders instead, until that viewer's own loan request on the item is accepted. `my_items` is exempt (always your own items). The Members list must never show or allow inferring item ownership. See [ADR-004](docs/adr/ADR-004-owner-identity-privacy-rule.md) for why.

**`my_items`** (`app/routes/communities/$communitySlug/my_items/`): owner-scoped item management (list, create, view, edit, delete) — strictly owner-only, no admin override yet. Each item-scoped route independently checks ownership, collapsing "doesn't exist," "wrong community," and "not yours" into a single 404 rather than sharing a helper — see [ADR-002](docs/adr/ADR-002-direct-prisma-access-over-model-layer.md) for why. Delete is an action-only resource route (no loader, no component), invoked from a confirmation `Modal`.

**Auth (passwordless, magic-link)** — see [ADR-001](docs/adr/ADR-001-passwordless-magic-link-authentication.md) for why. No password field on `User`; login is by emailed link only. Auth guards never throw: `getUserId`/`getUser` resolve the signed-in user (or `undefined`/`null`), and a loader/action that requires auth checks the result and returns `loginRedirect(url)`:

```ts
const userId = await getUserId(request);
if (!userId) {
  return loginRedirect(url);
}
```

There's no throwing `requireUser`/`requireUserId` — new guards follow this check-and-return-early shape.

**Internationalization (i18n)** — see [ADR-005](docs/adr/ADR-005-i18n-with-react-i18next.md) for why this was set up before most feature UI. `react-i18next`, with locale resolved server-side. Only `en` is supported today; no visible language switcher yet. Translation files live under `app/locales/<lang>/<namespace>.json`, one file per top-level route area, keys grouped by content-type (`errors.*`, `labels.*`, `buttons.*`) rather than by screen, so an existing key gets reused instead of duplicated. Client components use `useTranslation("namespace")`; loaders/actions use `getInstance(context).getFixedT(getLocale(context), "namespace")` (both from `~/i18n/middleware.server`). Emails resolve their copy separately, via the recipient's locale rather than the triggering request's.

**Data layer** — see [ADR-002](docs/adr/ADR-002-direct-prisma-access-over-model-layer.md) for why. `app/db.server.ts` exports a singleton `PrismaClient`. Auth code goes through `app/models/*.server.ts`; newer feature areas (`communities` onward) call `prisma` directly from loaders/actions instead, each independently fetching/re-checking what it needs. Route components read data via typegen's `loaderData`/`actionData` props — not `useLoaderData()`/`useActionData()`, which this app doesn't use.

**Community membership/role checks**: `app/utils/community_role.server.ts` is the one shared cross-cutting permission helper (the deliberate exception to direct-Prisma-per-route — see [ADR-002](docs/adr/ADR-002-direct-prisma-access-over-model-layer.md)). `getCommunityMembership(userId, communitySlug)` returns `{ community, membership } | null`; `meetsMinRole(role, minRole)` compares roles (`member < admin < owner`). Use these for any "is this user a member/admin/owner" check:

```ts
const found = await getCommunityMembership(userId, params.communitySlug);
if (!found) {
  return new Response(null, { status: 404 });
}

if (!meetsMinRole(found.membership.role, "admin")) {
  return new Response(null, { status: 403 });
}
```

`CommunityMembership.removedAt`/`removedById` mark a member as removed (banned) without deleting the row — see [ADR-006](docs/adr/ADR-006-member-removal-is-a-soft-ban.md). `getCommunityMembership` treats a removed membership as if it doesn't exist (returns `null`), so the check above already locks a removed member out everywhere it's used. Routes that query `CommunityMembership` directly instead of going through this helper (e.g. the community overview page) must filter `removedAt: null` themselves.

**Logging & error tracking**: use `app/logger.ts`'s `logger` (`error`/`warn`/`info`/`setUser`) instead of `console.*` in server-side app code — it reports to Sentry. Sentry is not initialized in local development or tests. CLI scripts and dev-only output that must never reach Sentry (e.g. anything containing a live token) stay on raw `console.*`.

**Component library** (`app/components/`): `Button`, `Link`, `TextInput`, `TextArea`, `Select`, `RadioGroup`, `Checkbox`, `Modal`, `Box`, `Table`. Build new forms/nav/UI from these rather than raw HTML elements. Currently unstyled — components exist for semantic/accessible structure and will be styled later without call sites needing to change.

When an existing component doesn't support something a feature needs, or no suitable component exists yet, extend or create one — don't work around the gap with a one-off inline style, a bespoke wrapper, or a raw HTML element instead. Propose the change first (the prop name/behavior, or a full new-component API) and wait for approval before writing code.

**Validation (Zod)** — see [ADR-003](docs/adr/ADR-003-zod-for-form-validation.md) for why, and the `zod-validation` skill for the full recipe. Route actions validate `FormData` with Zod schemas under `app/schemas/<model>.ts` — one file per model, a base schema plus named variants. Schema messages are semantic CODE strings, never i18n keys or English text — each route maps codes to display text itself, so two routes validating the same model can show different copy without forking the schema.

**Storybook**: every component library component has a colocated `*.stories.tsx`, run via `npm run storybook`. Every new or modified component ships with a story as part of its own PR — enforced, not just convention: `@storybook/addon-a11y` runs an accessibility check against every story, so a violation fails `npm run test` and blocks CI.

**Env vars** (see `.env.example`): `DATABASE_POOLER_URL`, `DATABASE_DIRECT_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `FROM_EMAIL`. Separate `.env.staging` / `.env.production` files exist alongside `.env`.

**Testing**:

- Vitest runs `*.test.*` files colocated under `app/`.
- Tests needing real data hit the real `postgres_test` database via `prisma` — no mocking. Test data comes from `@quramy/prisma-fabbrica` factories in `app/factories/`; add a new factory there, not a one-off `prisma.create()` call, for any model that doesn't have one yet.
- A second, browser-mode Storybook Vitest project runs every story's play functions and its accessibility check. `npm run test` runs both projects together.
- Playwright e2e specs live in `tests/`. A11y is checked here too, via `expectNoAxeViolations(page)` — the same enforced bar as Storybook's check, at the rendered-page level.
- `npm run validate` runs `test:e2e:run` after the Vitest/lint/typecheck group, not alongside it — both suites reset the same test database and can't run concurrently. `npm run test:db:reset` resets it manually.
- MSW (`mocks/`) is available for stubbing third-party HTTP in tests/dev; see `mocks/README.md`.

## CI/CD

`.github/workflows/deploy.yml` runs lint, typecheck, vitest, and Playwright on every push/PR. On success: pushes to `dev` deploy to the Fly.io staging app, then fast-forward `dev` into `main`; pushes to `main` deploy to production. There's no separate merge-to-main step.

## Conventions

- **New files, directories, and routes use `snake_case`** (e.g. `magic_link.server.ts`), not kebab-case. React component export names stay `PascalCase`. Exception: dynamic route segments are camelCase, prefixed with `$` (e.g. `$communitySlug`).
- Import alias `~/*` maps to `app/*`. ESLint enforces import ordering/grouping and treats `~/` as internal.
- ESLint runs `eslint-plugin-jsx-a11y`'s `strict` ruleset against all JS/TS/JSX/TSX files — the accessibility enforcement layer at lint time, alongside the Storybook/Playwright axe checks above.
- `*.server.ts` naming marks server-only modules — keep secrets and DB/Prisma access behind that suffix.
- Dependencies in `package.json` are pinned to exact versions (no `^`/`~` ranges) — match that when adding packages.
