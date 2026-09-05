import { describe, expect, it } from "vitest";

import { CommunityFactory } from "~/factories/community_factory.server";
import { InviteTokenFactory } from "~/factories/invite_token_factory.server";

import { validateInviteToken } from "./invite_token.server";

describe("validateInviteToken", () => {
  it("returns invalid for an unknown token", async () => {
    expect(await validateInviteToken("does-not-exist")).toEqual({
      status: "invalid",
    });
  });

  it("returns ok for a valid, unexpired, unrevoked token", async () => {
    const community = await CommunityFactory.create();
    const inviteToken = await InviteTokenFactory.create({
      community: { connect: { id: community.id } },
    });

    expect(await validateInviteToken(inviteToken.token)).toEqual({
      status: "ok",
      community: {
        id: community.id,
        slug: community.slug,
        name: community.name,
      },
    });
  });

  it("returns ok when expiresAt is null (never expires)", async () => {
    const inviteToken = await InviteTokenFactory.create({
      expiresAt: null,
    });

    expect(await validateInviteToken(inviteToken.token)).toMatchObject({
      status: "ok",
    });
  });

  it("returns ok when expiresAt is set but in the future", async () => {
    const inviteToken = await InviteTokenFactory.create({
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    expect(await validateInviteToken(inviteToken.token)).toMatchObject({
      status: "ok",
    });
  });

  it("returns expired when expiresAt is in the past", async () => {
    const inviteToken = await InviteTokenFactory.create({
      expiresAt: new Date(Date.now() - 1000),
    });

    expect(await validateInviteToken(inviteToken.token)).toEqual({
      status: "expired",
    });
  });

  it("returns revoked when revokedAt is set", async () => {
    const inviteToken = await InviteTokenFactory.create({
      revokedAt: new Date(),
    });

    expect(await validateInviteToken(inviteToken.token)).toEqual({
      status: "revoked",
    });
  });

  it("returns revoked (not expired) when both revokedAt and an expired expiresAt are set", async () => {
    const inviteToken = await InviteTokenFactory.create({
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() - 1000),
    });

    expect(await validateInviteToken(inviteToken.token)).toEqual({
      status: "revoked",
    });
  });

  it("returns invalid when the token is fine but its community is archived", async () => {
    const community = await CommunityFactory.create({
      archivedAt: new Date(),
    });
    const inviteToken = await InviteTokenFactory.create({
      community: { connect: { id: community.id } },
    });

    expect(await validateInviteToken(inviteToken.token)).toEqual({
      status: "invalid",
    });
  });
});
