import { prisma } from "~/db.server";
import { Prisma } from "~/generated/prisma/client";

export type JoinCommunityResult =
  | { status: "joined" }
  | { status: "already_member" }
  | { status: "banned" };

export async function joinCommunity({
  userId,
  communityId,
  displayName,
}: {
  userId: string;
  communityId: string;
  displayName: string;
}): Promise<JoinCommunityResult> {
  const existingMembership = await prisma.communityMembership.findUnique({
    where: { userId_communityId: { userId, communityId } },
  });
  if (existingMembership) {
    return existingMembership.removedAt
      ? { status: "banned" }
      : { status: "already_member" };
  }

  try {
    await prisma.communityMembership.create({
      data: { userId, communityId, role: "member", displayName },
    });
    return { status: "joined" };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { status: "already_member" };
    }
    throw error;
  }
}
