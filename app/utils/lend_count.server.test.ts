import { describe, expect, it } from "vitest";

import { CommunityFactory } from "~/factories/community_factory.server";
import { LoanFactory } from "~/factories/loan_factory.server";
import { UserFactory } from "~/factories/user_factory.server";

import { getCompletedLendCounts } from "./lend_count.server";

describe("getCompletedLendCounts", () => {
  it("returns an empty map for an empty list of userIds", async () => {
    expect(await getCompletedLendCounts("does-not-matter", [])).toEqual(
      new Map(),
    );
  });

  it("returns 0 for a member with no loans", async () => {
    const community = await CommunityFactory.create();
    const user = await UserFactory.create();

    const counts = await getCompletedLendCounts(community.id, [user.id]);

    expect(counts.get(user.id)).toBe(0);
  });

  it("counts only completed loans, ignoring other statuses", async () => {
    const community = await CommunityFactory.create();
    const owner = await UserFactory.create();

    for (const status of [
      "pending",
      "accepted",
      "active",
      "declined",
      "cancelled",
      "expired",
    ] as const) {
      await LoanFactory.create({
        community: { connect: { id: community.id } },
        owner: { connect: { id: owner.id } },
        status,
      });
    }
    await LoanFactory.create({
      community: { connect: { id: community.id } },
      owner: { connect: { id: owner.id } },
      status: "completed",
    });
    await LoanFactory.create({
      community: { connect: { id: community.id } },
      owner: { connect: { id: owner.id } },
      status: "completed",
    });

    const counts = await getCompletedLendCounts(community.id, [owner.id]);

    expect(counts.get(owner.id)).toBe(2);
  });

  it("scopes counts to the given community", async () => {
    const community = await CommunityFactory.create();
    const otherCommunity = await CommunityFactory.create();
    const owner = await UserFactory.create();

    await LoanFactory.create({
      community: { connect: { id: community.id } },
      owner: { connect: { id: owner.id } },
      status: "completed",
    });
    await LoanFactory.create({
      community: { connect: { id: otherCommunity.id } },
      owner: { connect: { id: owner.id } },
      status: "completed",
    });

    const counts = await getCompletedLendCounts(community.id, [owner.id]);

    expect(counts.get(owner.id)).toBe(1);
  });

  it("computes counts for multiple members in a single call", async () => {
    const community = await CommunityFactory.create();
    const memberA = await UserFactory.create();
    const memberB = await UserFactory.create();

    await LoanFactory.create({
      community: { connect: { id: community.id } },
      owner: { connect: { id: memberA.id } },
      status: "completed",
    });
    await LoanFactory.create({
      community: { connect: { id: community.id } },
      owner: { connect: { id: memberB.id } },
      status: "completed",
    });
    await LoanFactory.create({
      community: { connect: { id: community.id } },
      owner: { connect: { id: memberB.id } },
      status: "completed",
    });

    const counts = await getCompletedLendCounts(community.id, [
      memberA.id,
      memberB.id,
    ]);

    expect(counts.get(memberA.id)).toBe(1);
    expect(counts.get(memberB.id)).toBe(2);
  });
});
