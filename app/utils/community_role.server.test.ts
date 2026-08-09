import { describe, expect, it } from "vitest";

import { CommunityFactory } from "~/factories/community_factory.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { UserFactory } from "~/factories/user_factory.server";

import { getCommunityMembership, meetsMinRole } from "./community_role.server";

describe("meetsMinRole", () => {
  it.each([
    { role: "member", minRole: "member", expected: true },
    { role: "admin", minRole: "member", expected: true },
    { role: "owner", minRole: "member", expected: true },
    { role: "member", minRole: "admin", expected: false },
    { role: "admin", minRole: "admin", expected: true },
    { role: "owner", minRole: "admin", expected: true },
    { role: "member", minRole: "owner", expected: false },
    { role: "admin", minRole: "owner", expected: false },
    { role: "owner", minRole: "owner", expected: true },
  ] as const)(
    "returns $expected for role $role and minRole $minRole",
    ({ role, minRole, expected }) => {
      expect(meetsMinRole(role, minRole)).toBe(expected);
    },
  );
});

describe("getCommunityMembership", () => {
  it("returns null when the community does not exist", async () => {
    const user = await UserFactory.create();

    expect(
      await getCommunityMembership(user.id, "does-not-exist"),
    ).toBeNull();
  });

  it("returns null when the community is archived", async () => {
    const user = await UserFactory.create();
    const community = await CommunityFactory.create({
      archivedAt: new Date(),
    });

    expect(await getCommunityMembership(user.id, community.slug)).toBeNull();
  });

  it("returns null when the user is not a member of the community", async () => {
    const user = await UserFactory.create();
    const community = await CommunityFactory.create();

    expect(await getCommunityMembership(user.id, community.slug)).toBeNull();
  });

  it("returns the community and membership when the user is a member", async () => {
    const community = await CommunityFactory.create();
    const membership = await CommunityMembershipFactory.create({
      community: { connect: { id: community.id } },
      role: "admin",
    });

    const result = await getCommunityMembership(
      membership.userId,
      community.slug,
    );

    expect(result?.community.id).toBe(community.id);
    expect(result?.membership.id).toBe(membership.id);
    expect(result?.membership.role).toBe("admin");
  });
});
