# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A React Router (Framework Mode) + Prisma + PostgreSQL app, originally scaffolded from the (now-archived) Remix Blues Stack. The README still describes the original Blues Stack note-taking demo — treat it as stale background, not current behavior; auth in particular has since been rewritten (see below).

The Prisma schema (`prisma/schema.prisma`) already models the target domain — `Community`, `CommunityMembership`, `Item`, `Loan`, `Message`, `InviteToken` — for a community lending-library app where members share items within a community and track loans through a request/accept/checkout/return lifecycle. Application code has partially caught up: `User`, `MagicLink`, the legacy `Note` model, and a first `communities` create/join slice (`app/routes/communities/`) are wired up; `Item`, `Loan`, `Message`, and `InviteToken` are not yet. When adding features, check whether the schema already has the shape you need before changing it.

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
npm run test               # vitest (watch mode)
npm run test -- --run     # vitest, single run
npm run test -- --run app/utils.test.ts   # run a single vitest file
npm run test:e2e:run      # npx playwright test (spins up dev server itself)
npm run validate            # test --run + lint + typecheck + e2e, in parallel
```

- `postinstall` runs `prisma generate` automatically after `npm install`.
- Prisma client is generated into `app/generated/prisma` (imported as `~/generated/prisma/client`), not `node_modules/.prisma` — this path is git-ignored but must exist before typecheck/build will pass.
- After changing `prisma/schema.prisma`, run `npx prisma migrate dev` (creates a migration + regenerates the client).
- Playwright config auto-starts `npm run dev`; make sure the Docker Postgres container is up and migrated first.

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
└── notes/
    ├── new/
    │   └── new.tsx
    ├── $noteId/
    │   └── $noteId.tsx
    ├── notes.layout.tsx        // shared layout for notes + its children
    └── notes.tsx                // content at exactly "/notes"
```

```ts
export default [
  index("routes/_index.tsx"),
  layout("routes/_auth/_auth.layout.tsx", [
    route("login", "routes/_auth/login/login.tsx"),
    route("join", "routes/_auth/join/join.tsx"),
  ]),
  route("notes", "routes/notes/notes.layout.tsx", [
    index("routes/notes/notes.tsx"),
    route("new", "routes/notes/new/new.tsx"),
    route(":noteId", "routes/notes/$noteId/$noteId.tsx"),
  ]),
] satisfies RouteConfig;
```

See the live (non-hypothetical) version of this in [app/routes.ts](app/routes.ts) and `app/routes/notes/`.

**Planned community IA** (not yet built — `Item`/`Loan`/`Message` aren't wired up yet): once built, community-scoped screens nest under `/community/:communitySlug` (`browse`, `members`, `loans`, `items/:id`), with `/communities` one level up as the only place "my communities" (join/leave/switch) is a page — it must not be nested inside a community's own section list as a peer of Browse/Members/Loans. Items are modeled as fully separate listings per community (no shared item entity reused across communities). Switching communities navigates to a different community's route root, preserving the current leaf route where sensible (e.g. staying on `/loans`). **Privacy rule** (functional, not just visual — must hold in loaders/actions, not only be hidden client-side): borrowers never see who owns an item until the lender accepts their request; until then, render a neutral placeholder like "a neighbor" instead of the owner's name/avatar on Browse, Item Detail, and My Loans. On the Members list, item ownership must never be shown or inferable at all (no per-type item counts, no click-through from a member to their listings) — only aggregate, non-identifying stats like total lend count are safe. Full visual design system (colors, shadows, typography, screen layouts, copy voice, accessibility floor) lives in the `zine-design-system` skill — read it before building any of these screens.

**Auth (passwordless, magic-link)**: there is no password field on `User`. Login flow: [login.tsx](app/routes/login/login.tsx) validates + rate-limits (`app/utils/rate_limit.server.ts`, in-memory, per-process) an email, upserts a `User` (`findOrCreateUserByEmail`), creates a `MagicLink` token (`app/models/magic_link.server.ts` — random token, only its SHA-256 hash is stored, 20-minute expiry, single-use via a conditional `updateMany` to survive email-scanner prefetches), and emails it via `sendEmail`/react-email (`app/mailer.server.ts`, `app/emails/`). [magic_link.tsx](app/routes/magic_link/magic_link.tsx) consumes the token and calls `createUserSession`. Session state itself is a signed cookie (`app/session.server.ts`, `createCookieSessionStorage`) storing just the `userId`; `requireUser`/`requireUserId` guard loaders/actions and redirect to `/login?redirectTo=...`.

**Data layer**: `app/db.server.ts` builds a singleton `PrismaClient` over `@prisma/adapter-pg`, keyed via `app/singleton.server.ts` so HMR in dev doesn't spawn duplicate clients/connections. Auth/notes code goes through functions in `app/models/*.server.ts` (`user.server.ts`, `magic_link.server.ts`, `note.server.ts`). Newer feature areas (starting with `communities`) skip that indirection — loaders/actions call `prisma` directly, and each route independently fetches/re-checks what it needs rather than sharing data across routes. Route components also read their data via the `loaderData`/`actionData` props from React Router's typegen (`Route.ComponentProps`, imported from `./+types/<routename>`) instead of the `useLoaderData()`/`useActionData()` hooks that older routes still use.

**Design system (`app/components/`)**: a small, currently-unstyled component library (`Button`, `Link`, `TextInput`, `TextArea`, `Select`, `RadioGroup`, `Checkbox`, `Box`), modeled on the equivalent components in the `net-worth-tracker` project. Both folders and files use snake_case (e.g. `app/components/text_input/text_input.tsx`); only the exported component name is PascalCase (`TextInput`). No CSS yet — components exist for semantic/accessible structure (labels, `aria-describedby`, `aria-invalid`, etc.) and are meant to be skinned later without call sites changing. New forms/nav should be built from these rather than raw HTML elements. The target visual styling (colors, shadows, typography) isn't decided in this file — see the `zine-design-system` skill.

**Env vars** (see `.env.example`): `DATABASE_POOLER_URL` (used at request time by the app), `DATABASE_DIRECT_URL` (used by Prisma CLI for migrations — see `prisma.config.ts`), `SESSION_SECRET`, `RESEND_API_KEY`, `FROM_EMAIL`. Separate `.env.staging` / `.env.production` files exist alongside `.env`.

**Testing**:

- Vitest (`vitest.config.ts`) runs `*.test.*` files colocated under `app/`, `happy-dom` environment, globals on, setup in `test/setup-test-env.ts`.
- Playwright e2e specs live in `tests/` (not colocated with `app/`), config in `playwright.config.ts`, runs against chromium/firefox/webkit.
- MSW (`mocks/`) is available for stubbing third-party HTTP in tests/dev; see `mocks/README.md`.

## CI/CD

`.github/workflows/deploy.yml` runs lint, typecheck, vitest (with coverage), and Playwright (against a docker-composed Postgres, migrated via `prisma migrate reset --force`) on every push/PR. On success, pushes to `dev` deploy to the Fly.io staging app and then fast-forward `dev` into `main`; pushes to `main` deploy to the Fly.io production app. There is no separate merge-to-main step — `dev` is promoted to `main` automatically after a successful staging deploy.

## Conventions

- **New files, directories, and routes use `snake_case`** (e.g. `magic_link.server.ts`, `rate_limit.server.ts`), not kebab-case. React component export names stay `PascalCase`. Exception: dynamic route segments are camelCase, prefixed with `$` (e.g. `$userId`, `$noteId`) — see Architecture → Routing.
- Import alias `~/*` maps to `app/*`. ESLint enforces import ordering/grouping (builtin → external → internal → parent/sibling, alphabetized, blank line between groups) and treats `~/` as internal.
- `*.server.ts` naming marks server-only modules (enforced by convention/React Router, not just style) — keep secrets and DB/Prisma access behind that suffix.
- Dependencies in `package.json` are pinned to exact versions (no `^`/`~` ranges) — match that when adding packages.
