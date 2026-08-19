import { faker } from "@faker-js/faker";
import { test as base } from "@playwright/test";

import { prisma } from "~/db.server";
import { CommunityFactory } from "~/factories/community_factory.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { UserFactory } from "~/factories/user_factory.server";
import { initialize } from "~/generated/fabbrica";

import { loginAsNewUser } from "./helpers/session";

initialize({ prisma });

type CommunityRole = "member" | "admin" | "owner";

interface Fixtures {
  withCommunityMember: (options?: { role?: CommunityRole }) => Promise<{
    user: Awaited<ReturnType<typeof loginAsNewUser>>;
    community: Awaited<ReturnType<typeof CommunityFactory.create>>;
  }>;
}

export const test = base.extend<Fixtures>({
  withCommunityMember: async ({ context }, provide) => {
    const userIds: string[] = [];
    const communityIds: string[] = [];

    await provide(async ({ role = "member" } = {}) => {
      const email = `pw-member-${faker.string.uuid()}@example.com`;
      const user = await loginAsNewUser(context, email);
      userIds.push(user.id);

      const owner = role === "owner" ? user : await UserFactory.create();
      if (owner.id !== user.id) {
        userIds.push(owner.id);
      }

      const community = await CommunityFactory.create({
        owner: { connect: { id: owner.id } },
      });
      communityIds.push(community.id);

      await CommunityMembershipFactory.create({
        user: { connect: { id: user.id } },
        community: { connect: { id: community.id } },
        role,
      });

      return { user, community };
    });

    await prisma.loan.deleteMany({
      where: { communityId: { in: communityIds } },
    });
    await prisma.communityMembership.deleteMany({
      where: { communityId: { in: communityIds } },
    });
    await prisma.community.deleteMany({ where: { id: { in: communityIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  },
});

export { expect } from "@playwright/test";
