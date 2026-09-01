import { faker } from "@faker-js/faker";

import { prisma } from "~/db.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { InviteTokenFactory } from "~/factories/invite_token_factory.server";

import { expect, test } from "./fixtures";
import { expectNoAxeViolations } from "./helpers/axe";
import { loginAsNewUser } from "./helpers/session";

test.describe("invite link management", () => {
  test("owner can generate a link via the form and revoke it via the confirmation modal", async ({
    page,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember({
      role: "owner",
    });

    await page.goto(`/communities/${community.slug}/invite`);
    await expect(
      page.getByRole("heading", { name: "Invite links" }),
    ).toBeVisible();
    await expect(page.getByText("No active invite links.")).toBeVisible();

    await page.getByRole("button", { name: "Generate link" }).click();

    const linkLocator = page.getByRole("link", {
      name: /\/join\?token=/,
    });
    await expect(linkLocator).toBeVisible();
    const href = await linkLocator.getAttribute("href");
    expect(href).not.toBeNull();

    const created = await prisma.inviteToken.findFirstOrThrow({
      where: { communityId: community.id },
    });
    expect(href).toContain(created.token);
    expect(created.expiresAt).not.toBeNull();
    expect(created.createdByUserId).toBe(owner.id);

    await expectNoAxeViolations(page);

    const dialog = page.getByRole("dialog", {
      name: "Revoke this invite link?",
    });
    await expect(async () => {
      await page.getByRole("button", { name: "Revoke" }).click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await expectNoAxeViolations(page);

    await dialog.getByRole("button", { name: "Revoke link" }).click();

    await expect(page).toHaveURL(`/communities/${community.slug}/invite`);
    await expect(page.getByText("No active invite links.")).toBeVisible();
    await expect(linkLocator).toHaveCount(0);

    const revoked = await prisma.inviteToken.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(revoked.revokedAt).not.toBeNull();
    expect(revoked.revokedByUserId).toBe(owner.id);
  });

  test("a plain member cannot view, generate, or revoke invite links", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember({
      role: "owner",
    });
    const inviteToken = await InviteTokenFactory.create({
      community: { connect: { id: community.id } },
      createdBy: { connect: { id: owner.id } },
    });

    const memberContext = await browser.newContext();
    const memberUser = await loginAsNewUser(
      memberContext,
      `pw-member-${faker.string.uuid()}@example.com`,
    );
    await CommunityMembershipFactory.create({
      user: { connect: { id: memberUser.id } },
      community: { connect: { id: community.id } },
      role: "member",
    });
    const memberPage = await memberContext.newPage();

    const viewResponse = await memberPage.goto(
      `/communities/${community.slug}/invite`,
    );
    expect(viewResponse?.status()).toBe(403);

    const generateResponse = await memberPage.request.post(
      `/communities/${community.slug}/invite`,
      { form: { expiryPreset: "7" } },
    );
    expect(generateResponse.status()).toBe(403);

    const revokeResponse = await memberPage.request.post(
      `/communities/${community.slug}/invite/${inviteToken.id}/revoke`,
    );
    expect(revokeResponse.status()).toBe(403);

    await memberContext.close();
  });

  test("an admin can generate a link with no expiry and revoke a link created by someone else", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember({
      role: "owner",
    });
    const ownerCreatedToken = await InviteTokenFactory.create({
      community: { connect: { id: community.id } },
      createdBy: { connect: { id: owner.id } },
    });

    const adminContext = await browser.newContext();
    const adminUser = await loginAsNewUser(
      adminContext,
      `pw-admin-${faker.string.uuid()}@example.com`,
    );
    await CommunityMembershipFactory.create({
      user: { connect: { id: adminUser.id } },
      community: { connect: { id: community.id } },
      role: "admin",
    });
    const adminPage = await adminContext.newPage();

    const generateResponse = await adminPage.request.post(
      `/communities/${community.slug}/invite`,
      { form: { expiryPreset: "" } },
    );
    expect(generateResponse.ok()).toBe(true);
    const created = await prisma.inviteToken.findFirstOrThrow({
      where: { communityId: community.id, createdByUserId: adminUser.id },
    });
    expect(created.expiresAt).toBeNull();

    await adminPage.goto(`/communities/${community.slug}/invite`);
    const adminRow = adminPage.getByRole("row", {
      name: new RegExp(created.token),
    });
    await expect(adminRow.getByText("Never")).toBeVisible();

    const revokeResponse = await adminPage.request.post(
      `/communities/${community.slug}/invite/${ownerCreatedToken.id}/revoke`,
    );
    expect(revokeResponse.ok()).toBe(true);
    const revoked = await prisma.inviteToken.findUniqueOrThrow({
      where: { id: ownerCreatedToken.id },
    });
    expect(revoked.revokedAt).not.toBeNull();
    expect(revoked.revokedByUserId).toBe(adminUser.id);

    await adminContext.close();
  });

  test("a numeric expiry preset produces the correct stored expiresAt", async ({
    page,
    withCommunityMember,
  }) => {
    const { community } = await withCommunityMember({ role: "owner" });

    const beforeGenerate = Date.now();
    const response = await page.request.post(
      `/communities/${community.slug}/invite`,
      { form: { expiryPreset: "1" } },
    );
    expect(response.ok()).toBe(true);

    const created = await prisma.inviteToken.findFirstOrThrow({
      where: { communityId: community.id },
    });
    expect(created.expiresAt).not.toBeNull();

    const expectedMs = beforeGenerate + 24 * 60 * 60 * 1000;
    const actualMs = created.expiresAt?.getTime() ?? 0;
    expect(Math.abs(actualMs - expectedMs)).toBeLessThan(60_000);
  });
});
