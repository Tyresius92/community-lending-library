# Routing

Routes are declared explicitly in [app/routes.ts](../../app/routes.ts) (React Router Framework Mode, not filesystem routing) — adding a route means adding both the file(s) under `app/routes/` and the corresponding entry in `routes.ts`. A route segment `foo` gets its own folder `foo/foo.tsx`. Add `foo.layout.tsx` alongside it, registered via `route()`/`layout()`, only when the segment's children genuinely share layout UI (wrapping markup, a loader, an `ErrorBoundary`) — not merely to give a set of children a common URL prefix. When a segment's children need no shared UI at all, register it with `prefix(path, children)` instead: it adds the URL prefix without introducing a parent route or file, so no `.layout.tsx` gets written just to return `<Outlet />`. When a shared layout contributes no URL segment of its own, prefix the folder with `_` (e.g. `_auth/`). The root `/` route is the one exception, staying flat as `app/routes/_index.tsx`.

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

A segment like `items` has children (`index`, `:itemId`) but no shared UI of its own, so it uses `prefix()` rather than a `.layout.tsx`:

```ts
export default [
  ...prefix("items", [
    index("routes/communities/$communitySlug/items/items.tsx"),
    route(
      ":itemId",
      "routes/communities/$communitySlug/items/$itemId/$itemId.tsx",
    ),
  ]),
] satisfies RouteConfig;
```

See the live version in [app/routes.ts](../../app/routes.ts) and `app/routes/communities/`.

## Community IA

Community-scoped screens (`items`, `my_items`, `members`, `loans`) nest under `/communities/:communitySlug` as siblings. `/communities` one level up is the only place "my communities" (join/leave/switch) lives. Items are modeled as fully separate listings per community. `Message` isn't wired up yet.

## `my_items`

`app/routes/communities/$communitySlug/my_items/`: owner-scoped item management (list, create, view, edit, delete) — strictly owner-only, no admin override yet. Each item-scoped route independently checks ownership, collapsing "doesn't exist," "wrong community," and "not yours" into a single 404 rather than sharing a helper — see [ADR-002](../../docs/adr/ADR-002-direct-prisma-access-over-model-layer.md) for why. Delete is an action-only resource route (no loader, no component), invoked from a confirmation `Modal`.

## Standing questions

- Is there more than one reasonable place this route/file could live? If so, which one, and does it match the existing structure?
- Does a new dynamic segment (like `:loanId`) belong as a single shared route, or does it need to be split per role/context (e.g. lending vs. borrowing)?
- Does this need a `.layout.tsx` (real shared UI), or does `prefix()` cover it (just a shared URL prefix, no shared markup)?
- Should this nest under an existing community-scoped section, or does it need its own top-level section?
