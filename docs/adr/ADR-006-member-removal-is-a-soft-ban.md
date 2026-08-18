# ADR: Removing a Member Is a Soft Ban, Not a Delete

**Status:** Accepted

---

## Context

The Members route (issue #37) needed a "kick a member" action. The
straightforward reading — delete the `CommunityMembership` row — has a real
consequence the issue text didn't spell out: `Item.ownerMembershipId` and
`Loan.itemId` both cascade-delete, so removing a membership row would
permanently destroy that member's items and any loan history tied to those
items, including loans where someone else is mid-exchange with them.

Separately, "kick" in this app's context is expected to be used for real
moderation reasons (harassment, misuse), not routine housekeeping — so the
removed member shouldn't simply be free to rejoin immediately after.

## Options Considered

### Hard delete, unconditionally

Simplest to build and matches "kick" literally, but silently destroys
in-progress loan history and a borrower's ability to see what they currently
have on loan from someone who just got removed. Rejected as a genuine
data-loss risk for something that isn't just the removed member's own data.

### Hard delete, blocked while in-flight loans exist

Avoids destroying live loans by refusing the kick until nothing's
outstanding, but doesn't solve the general problem (completed loan history
still vanishes) and lets a problem member stall their own removal
indefinitely by never returning something.

### Lifecycle-status enum on `CommunityMembership`

More extensible if more lifecycle states are ever needed, but more schema
surface than a single boolean-ish fact ("this membership has been revoked")
requires today, and every consumer of `CommunityRole` would need to learn to
ignore the new states.

### Nullable `removedAt` (+ `removedById`) timestamp

**Chosen.**

Mirrors the existing pattern used for `Community.archivedAt` and
`InviteToken.revokedAt`/`revokedByUserId`: a nullable timestamp marks the
row as no-longer-active without deleting it, and a nullable FK records who
did it. The `CommunityMembership` row, the member's items, and all loan
history stay intact — nothing cascades. A removed membership is simply
treated as "not a member" everywhere the app checks membership.

## Decision

- `CommunityMembership.removedAt`/`removedById` mark a member as removed
  (banned) without deleting the row.
- `getCommunityMembership` (`app/utils/community_role.server.ts`) treats a
  membership with `removedAt` set the same as no membership at all — this is
  the single chokepoint nearly every role-gated route already calls through,
  so a removed member is locked out of `items`, `my_items`, `members`, and
  the community overview consistently, without each route re-deriving the
  check.
- Removal is a **ban, not a leave**: the pre-existing open-join action
  (`$communitySlug.tsx`) explicitly rejects rejoining when a removed
  membership row already exists, rather than silently letting them back in.
  There's no way to un-remove a member today — that's intentionally not
  built, since the only way to get removed is being kicked by an admin/owner
  for cause.
- A removed member's items are excluded from the Items catalog (they're not
  deleted, just no longer offered for new loans) — nothing about being
  banned should make someone's inventory still show up as borrowable.
- In-flight loans are deliberately left untouched by a kick — the Loan
  feature isn't built in the app yet, so there's no loan-lifecycle behavior
  to hook into. A richer experience where a removed member retains narrow
  access to just their own items and in-flight loans (rather than full
  lockout) is a deliberate future direction, tracked as a follow-up once the
  Loan feature exists to design it against.

## Consequences

**Positive:**

- No data-loss risk from kicking someone — items and loan history for
  everyone involved stay intact.
- One shared chokepoint (`getCommunityMembership`) enforces the lockout
  everywhere instead of each route needing its own removed-member check.
- Consistent with the codebase's existing soft-delete-via-timestamp pattern
  (`archivedAt`, `revokedAt`), so it's not a new mental model to learn.

**Negative / Tradeoffs:**

- The two routes that bypass `getCommunityMembership` with raw Prisma
  queries (`$communitySlug.tsx`'s overview loader and join action) needed
  direct updates rather than getting the fix for free — a missed spot there
  would have let a banned member rejoin.
- Full lockout today is coarser than the eventual target experience (own
  items + in-flight loans visible while banned) — shipped this way only
  because the Loan feature doesn't exist yet to build the finer-grained
  version against.
