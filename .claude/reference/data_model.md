# Data model

See [ADR-002](../../docs/adr/ADR-002-direct-prisma-access-over-model-layer.md) for why this repo mostly skips a model layer. `app/db.server.ts` exports a singleton `PrismaClient`. Auth code goes through `app/models/*.server.ts`; newer feature areas (`communities` onward) call `prisma` directly from loaders/actions instead, each independently fetching/re-checking what it needs. Route components read data via typegen's `loaderData`/`actionData` props — not `useLoaderData()`/`useActionData()`, which this app doesn't use.

## Community membership/role checks

`app/utils/community_role.server.ts` is the one shared cross-cutting permission helper (the deliberate exception to direct-Prisma-per-route). `getCommunityMembership(userId, communitySlug)` returns `{ community, membership } | null`; `meetsMinRole(role, minRole)` compares roles (`member < admin < owner`). Use these for any "is this user a member/admin/owner" check:

```ts
const found = await getCommunityMembership(userId, params.communitySlug);
if (!found) {
  return new Response(null, { status: 404 });
}

if (!meetsMinRole(found.membership.role, "admin")) {
  return new Response(null, { status: 403 });
}
```

`CommunityMembership.removedAt`/`removedById` mark a member as removed (banned) without deleting the row — see [ADR-006](../../docs/adr/ADR-006-member-removal-is-a-soft-ban.md). `getCommunityMembership` treats a removed membership as if it doesn't exist (returns `null`), so the check above already locks a removed member out everywhere it's used. Routes that query `CommunityMembership` directly instead of going through this helper (e.g. the community overview page) must filter `removedAt: null` themselves.

## Standing questions

- Is there more than one reasonable shape for this schema change or relationship?
- Does this belong on an existing model, or does it need a new one?
- Does a new field need a constraint (length, format, uniqueness) that isn't already implied by `prisma/schema.prisma`?
