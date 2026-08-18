import { prisma } from "~/db.server";

export async function getCompletedLendCounts(
  communityId: string,
  userIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map(userIds.map((userId) => [userId, 0]));

  if (userIds.length === 0) {
    return counts;
  }

  const grouped = await prisma.loan.groupBy({
    by: ["ownerId"],
    where: { communityId, ownerId: { in: userIds }, status: "completed" },
    _count: true,
  });

  for (const row of grouped) {
    counts.set(row.ownerId, row._count);
  }

  return counts;
}
