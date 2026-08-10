import { prisma } from "~/db.server";
import type { CommunityRole } from "~/generated/prisma/client";

const ROLE_RANK: Record<CommunityRole, number> = {
  member: 0,
  admin: 1,
  owner: 2,
};

export function meetsMinRole(
  role: CommunityRole,
  minRole: CommunityRole,
): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export async function getCommunityMembership(
  userId: string,
  communitySlug: string,
) {
  const community = await prisma.community.findFirst({
    where: { slug: communitySlug, archivedAt: null },
    select: { id: true, name: true, slug: true, visibility: true },
  });
  if (!community) {
    return null;
  }

  const membership = await prisma.communityMembership.findUnique({
    where: { userId_communityId: { userId, communityId: community.id } },
  });
  if (!membership) {
    return null;
  }

  return { community, membership };
}
