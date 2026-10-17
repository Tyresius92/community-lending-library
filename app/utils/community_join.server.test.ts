import { describe, expect, it } from "vitest";

import { prisma } from "~/db.server";
import { CommunityFactory } from "~/factories/community_factory.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { UserFactory } from "~/factories/user_factory.server";

import { joinCommunity } from "./community_join.server";

describe("joinCommunity", () => {
  it("creates a new membership and returns joined", async () => {
    const user = await UserFactory.create();
    const community = await CommunityFactory.create();

    const result = await joinCommunity({
      userId: user.id,
      communityId: community.id,
      displayName: "New Member",
    });

    expect(result.status).toBe("joined");
    const membership = await prisma.communityMembership.findUniqueOrThrow({
      where: {
        userId_communityId: { userId: user.id, communityId: community.id },
      },
    });
    expect(membership.role).toBe("member");
    expect(membership.displayName).toBe("New Member");
  });

  it("returns already_member without creating a duplicate when a non-removed membership exists", async () => {
    const community = await CommunityFactory.create();
    const membership = await CommunityMembershipFactory.create({
      community: { connect: { id: community.id } },
    });

    const result = await joinCommunity({
      userId: membership.userId,
      communityId: community.id,
      displayName: "Attempted Rejoin",
    });

    expect(result.status).toBe("already_member");
    const memberships = await prisma.communityMembership.findMany({
      where: { userId: membership.userId, communityId: community.id },
    });
    expect(memberships).toHaveLength(1);
    expect(memberships[0].displayName).toBe(membership.displayName);
  });

  it("returns banned without reactivating a removed membership", async () => {
    const community = await CommunityFactory.create();
    const membership = await CommunityMembershipFactory.create({
      community: { connect: { id: community.id } },
      removedAt: new Date(),
    });

    const result = await joinCommunity({
      userId: membership.userId,
      communityId: community.id,
      displayName: "Trying Again",
    });

    expect(result.status).toBe("banned");
    const persisted = await prisma.communityMembership.findUniqueOrThrow({
      where: { id: membership.id },
    });
    expect(persisted.removedAt).not.toBeNull();
  });

  it("resolves a concurrent double-join race to exactly one membership row", async () => {
    const user = await UserFactory.create();
    const community = await CommunityFactory.create();

    const [first, second] = await Promise.all([
      joinCommunity({
        userId: user.id,
        communityId: community.id,
        displayName: "Racer One",
      }),
      joinCommunity({
        userId: user.id,
        communityId: community.id,
        displayName: "Racer Two",
      }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual(["already_member", "joined"]);

    const memberships = await prisma.communityMembership.findMany({
      where: { userId: user.id, communityId: community.id },
    });
    expect(memberships).toHaveLength(1);
  });
});
