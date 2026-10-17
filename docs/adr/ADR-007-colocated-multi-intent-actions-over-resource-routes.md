# ADR: Colocated Multi-Intent Actions Over Per-Verb Resource Routes

**Status:** Accepted

---

## Context

The route tree grew one file per mutation verb — `loans/lending/$loanId/accept/accept.tsx`, `.../decline/decline.tsx`, `.../cancel/cancel.tsx`, and so on, mirrored again under `loans/borrowing/` for the same verbs from the other side of the relationship. By the time Loan alone had 10 such files, each repeating the same `getUserId` → `loginRedirect` → `getCommunityMembership` → scoped `findFirst` → status guard → `update` → `redirect` boilerplate, the duplication was severe enough to be a real liability: `cancel` and `checkout` each existed twice (once per role) for what is really one state transition with a role-dependent precondition. The same smaller-scale pattern existed for `CommunityMembership` (`role.tsx`, `kick.tsx`), `InviteToken` (`revoke.tsx`), and `Item` (`delete.tsx`).

This shape was never a deliberate decision — no ADR exists for "why one URL segment per verb." `.claude/reference/routing.md` documented it after the fact as a named convention, but it accreted rather than being chosen.

Separately, this app's forms are all plain `<Form method="post">` with no `useFetcher`/`useSubmit` anywhere, and mutations are reached only from pages that already know about the entity being mutated — never from an unrelated page or a non-browser client.

## Options Considered

### Status quo: one URL segment per verb

The problem being fixed — rejected outright.

### A new `/api` namespace of component-less resource routes

Each entity gets a dedicated route with no default export (e.g. `/api/loan/:loanId`), consolidating the per-verb files into one file per entity. Considered seriously, but ran into a real question: a route with no component has nowhere to render a response that isn't a redirect. For this app's actual mutations (state transitions, delete, kick, revoke) that's rarely hit in practice — they only ever redirect or throw a 403/404 — but the shape still implies a route the rest of the app's convention (every route either renders something or is reached by a client that reads its response as data) doesn't otherwise have. Rejected in favor of reusing a page that already renders something.

### Real HTTP methods (`PATCH`/`DELETE`) on the existing resource routes

React Router's `<Form method="patch">` sends the real method via `fetch` once JS is active, so this doesn't require the method-override hack native HTML forms would need. Seriously considered, but it doesn't resolve the "where does this route's response render" question from the option above — a `PATCH /loan/:loanId` route still needs _some_ component if a non-redirect response (e.g. a validation error) ever needs to be shown. Superseded by colocating onto a page that already has one.

### Colocate the action with whichever existing page already has a loader + component for the entity, discriminated by a hidden `intent` field

**Chosen.**

This is the same idiom demonstrated by Remix's own "jokes" tutorial for "one route, several things that can happen to it." Every mutation here already originates from a page that renders the entity being mutated — the Loan detail page knows about the loan, the Members list already renders each member's row — so there's always an existing component to redirect back to or render an error into. No new URL namespace, no change to the plain-`<Form>`-only convention, no fetcher/CSR adoption.

## Decision

- A duplicated or action-only route (no loader, no component) folds into whichever existing page already has a loader + component for that entity. The page's action parses a hidden `intent` form field and `switch`es on it; each branch keeps the merged files' original status/role guards.
- Where a button lives on a _different_ page than the one that now owns the action (e.g. `lending.tsx`/`borrowing.tsx`'s inline buttons, which post to the canonical `loans/$loanId/$loanId.tsx` action), the form cross-posts there with hidden `intent` **and** `redirectTo` fields — `redirectTo` is validated through the existing `safeRedirect` helper (`app/utils.ts`), the same mechanism `login.tsx` already uses, so the response still redirects back to whichever page the form was submitted from.
- Where the button already lives on the page that owns the action (members, invite, item delete), no `redirectTo`/cross-posting is needed — the form simply omits `action` and submits to itself.
- Two genuinely duplicated entity-creation call sites (`$communitySlug.tsx`'s open-join and `join.tsx`'s token-join) extracted into one shared `joinCommunity()` helper (`app/utils/community_join.server.ts`) rather than a shared route — they remain two distinct pages a user can land on, but now call through one chokepoint for the soft-ban/race-condition logic, closing the drift risk [ADR-006](ADR-006-member-removal-is-a-soft-ban.md) flagged.
- `/items` and `/my_items` (two URL subtrees for one entity, split only by viewer ownership) merged into one list route (`?mine=true` toggles the filter) and one role-aware detail route (`isOwnItem` branches the rendering and the action's `intent` switch), per [ADR-002](ADR-002-direct-prisma-access-over-model-layer.md)'s own anticipation that this split might eventually warrant revisiting. Viewing the merged routes now requires full community membership unconditionally — tightened from the old public-browse route's looser check, since one route can only have one visibility rule.

## Consequences

**Positive:**

- Eliminates ~20 duplicated or near-duplicated action-only files across Loan, Member, Invite, and Item.
- Every mutation's response path stays attached to a route that has a component — no route exists solely to be a redirect-or-4xx endpoint with no other purpose.
- `cancel` and `checkout` (Loan), previously implemented twice each for the two roles that can trigger them, are now exactly one implementation each with the role check made explicit in code rather than implicit in which URL was hit.
- The community-join duplication that caused a real bug risk (per ADR-006) now has one implementation.

**Negative / Tradeoffs:**

- A colocated action's `switch` grows with the entity — `loans/$loanId/$loanId.tsx`'s action now has six branches in one file, versus six files of ~40 lines each before. Accepted as a better tradeoff than the duplication it replaces.
- Cross-posting via `redirectTo` adds two hidden fields to every form that lives on a different page than its action — a small amount of boilerplate per form, in exchange for not having to choose one canonical page to render on.
- Merging `/items` and `/my_items` is a real, intentional behavior change: a non-member of a _public_ community can no longer browse that community's items at all (previously allowed on the public-browse route, never on the owner-only route). A non-owner attempting the `delete` intent on a now-visible item gets 403, not 404 — the item genuinely exists and is visible to them, so pretending otherwise would be the wrong signal.
