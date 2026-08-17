# ADR: Direct Prisma Access Over a Model Layer

**Status:** Accepted

---

## Context

The app's earliest code (auth) went through a model layer —
`app/models/*.server.ts` functions wrapping Prisma calls — the pattern
inherited from the original Remix Blues Stack scaffold. As the app's real
domain (communities, items, and eventually loans/messages/invites) started
getting built out, each new CRUD-shaped route needed a decision: keep
routing every query through a model file, or call Prisma directly from the
route itself.

## Options Considered

### Continue the model-layer pattern (`app/models/<entity>.server.ts` per entity)

Consistent with the existing auth code, and gives a single place to change a
query's shape. But most of these routes are CRUD-shaped — create, edit,
delete, list — with exactly one call site per query. A model-layer wrapper
around a single-call-site Prisma call is indirection without an abstraction
benefit: one more file to open to see what a route actually does, for no
reuse payoff.

### Direct Prisma calls in loaders/actions, no model layer

**Chosen.**

Each loader/action calls `prisma` directly and re-fetches/re-checks what it
needs, rather than sharing data through a model function or a parent route's
loader output. This trades a small amount of duplication for locality — a
route's data access is fully visible in the route file itself. React
Router's loader/action model already scopes logic per route, so the model
layer's usual justification (reuse across many call sites) mostly doesn't
apply here: most of these queries have exactly one call site by
construction.

## Decision

- `app/db.server.ts` builds a singleton `PrismaClient` (via
  `@prisma/adapter-pg`), keyed through `app/singleton.server.ts` so dev-mode
  HMR doesn't spawn duplicate clients/connections.
- Existing auth code keeps going through `app/models/*.server.ts`
  (`user.server.ts`, `magic_link.server.ts`) rather than being migrated —
  not worth the churn for code that already works.
- Newer feature areas, starting with `communities`, skip that indirection:
  loaders/actions call `prisma` directly, and each route independently
  fetches/re-checks what it needs. An action can't consume a parent route's
  loader data anyway, so there's no shortcut being given up.
- **One deliberate exception:** `app/utils/community_role.server.ts`'s
  `getCommunityMembership`/`meetsMinRole`. Unlike single-call-site CRUD
  queries, "is this user a member/admin/owner of this community" is a real
  cross-cutting check reused by otherwise-unrelated routes (item management,
  invite generate/revoke, member management) — genuine multi-call-site
  reuse, which is exactly the case a shared helper earns its keep for.
- Consistently, `my_items`'s three item-scoped routes
  (`$itemId/$itemId.tsx`, `edit/edit.tsx`, `delete/delete.tsx`) each run
  their own combined ownership-check query rather than sharing one helper —
  deliberately duplicated, since each route's action can't consume a
  sibling route's loader output.

## Consequences

**Positive:**

- A route's full data access is visible in one file — no jumping to a
  model file to see what's queried or how.
- Nothing to keep in sync in a separate indirection layer as the schema
  grows, for the common single-call-site case.
- Matches React Router's per-route, request-scoped execution model.

**Negative / Tradeoffs:**

- Real duplication where two routes genuinely need the same nontrivial
  query shape — accepted for now at this app's size; worth revisiting a
  shared query helper if a specific shape recurs enough to matter.
- Two data-access conventions coexist (older model-layer auth code, newer
  direct-Prisma feature code) — a new contributor has to learn both by
  reading, since nothing enforces the boundary at compile time.
- No single obvious place to add cross-cutting query-level behavior later
  (soft deletes, query logging) — that would need to live at the
  Prisma-client or middleware level instead of a model layer.
