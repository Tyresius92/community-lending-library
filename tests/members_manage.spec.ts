import { faker } from "@faker-js/faker";

import { prisma } from "~/db.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { ItemFactory } from "~/factories/item_factory.server";
import { LoanFactory } from "~/factories/loan_factory.server";
import { UserFactory } from "~/factories/user_factory.server";

import { expect, test } from "./fixtures";
import { expectNoAxeViolations } from "./helpers/axe";
import { loginAsNewUser } from "./helpers/session";

async function createTargetMembership(communityId: string) {
  const user = await UserFactory.create();
  return CommunityMembershipFactory.create({
    user: { connect: { id: user.id } },
    community: { connect: { id: communityId } },
    role: "member",
  });
}

test.describe("members management", () => {
  test("renders the member list sorted by display name with correct lend counts", async ({
    page,
    withCommunityMember,
  }) => {
    const { community } = await withCommunityMember({ role: "owner" });

    const memberAUser = await UserFactory.create();
    await CommunityMembershipFactory.create({
      user: { connect: { id: memberAUser.id } },
      community: { connect: { id: community.id } },
      role: "member",
      displayName: "Amy",
    });
    await LoanFactory.create({
      community: { connect: { id: community.id } },
      owner: { connect: { id: memberAUser.id } },
      status: "completed",
    });
    await LoanFactory.create({
      community: { connect: { id: community.id } },
      owner: { connect: { id: memberAUser.id } },
      status: "completed",
    });
    await LoanFactory.create({
      community: { connect: { id: community.id } },
      owner: { connect: { id: memberAUser.id } },
      status: "pending",
    });

    const memberBUser = await UserFactory.create();
    await CommunityMembershipFactory.create({
      user: { connect: { id: memberBUser.id } },
      community: { connect: { id: community.id } },
      role: "member",
      displayName: "Zed",
    });

    await page.goto(`/communities/${community.slug}/members`);
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();

    const amyCard = page.getByRole("article").filter({ hasText: "Amy" });
    await expect(amyCard.getByText("2 completed loans")).toBeVisible();

    const zedCard = page.getByRole("article").filter({ hasText: "Zed" });
    await expect(zedCard.getByText("0 completed loans")).toBeVisible();

    const cardsText = (await page.getByRole("article").allTextContents()).join(
      "\n",
    );
    expect(cardsText.indexOf("Amy")).toBeGreaterThanOrEqual(0);
    expect(cardsText.indexOf("Amy")).toBeLessThan(cardsText.indexOf("Zed"));

    await expectNoAxeViolations(page);
  });

  test("a plain member cannot promote, demote, or kick another member", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community } = await withCommunityMember({ role: "owner" });
    const targetMembership = await createTargetMembership(community.id);

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

    const roleResponse = await memberPage.request.post(
      `/communities/${community.slug}/members/${targetMembership.id}/role`,
      { form: { role: "admin" } },
    );
    expect(roleResponse.status()).toBe(403);

    const kickResponse = await memberPage.request.post(
      `/communities/${community.slug}/members/${targetMembership.id}/kick`,
    );
    expect(kickResponse.status()).toBe(403);

    await memberContext.close();
  });

  test("an admin can promote, demote, and kick another member", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community } = await withCommunityMember({ role: "owner" });
    const targetMembership = await createTargetMembership(community.id);

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

    const roleResponse = await adminPage.request.post(
      `/communities/${community.slug}/members/${targetMembership.id}/role`,
      { form: { role: "admin" } },
    );
    expect(roleResponse.ok()).toBe(true);
    const promoted = await prisma.communityMembership.findUniqueOrThrow({
      where: { id: targetMembership.id },
    });
    expect(promoted.role).toBe("admin");

    const kickResponse = await adminPage.request.post(
      `/communities/${community.slug}/members/${targetMembership.id}/kick`,
    );
    expect(kickResponse.ok()).toBe(true);
    const kicked = await prisma.communityMembership.findUniqueOrThrow({
      where: { id: targetMembership.id },
    });
    expect(kicked.removedAt).not.toBeNull();
    expect(kicked.removedById).toBe(adminUser.id);

    await adminContext.close();
  });

  test("the owner can promote, demote, and kick another member", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember({
      role: "owner",
    });
    const targetMembership = await createTargetMembership(community.id);

    const ownerContext = await browser.newContext();
    await loginAsNewUser(ownerContext, owner.email);
    const ownerPage = await ownerContext.newPage();

    const roleResponse = await ownerPage.request.post(
      `/communities/${community.slug}/members/${targetMembership.id}/role`,
      { form: { role: "admin" } },
    );
    expect(roleResponse.ok()).toBe(true);
    const promoted = await prisma.communityMembership.findUniqueOrThrow({
      where: { id: targetMembership.id },
    });
    expect(promoted.role).toBe("admin");

    const kickResponse = await ownerPage.request.post(
      `/communities/${community.slug}/members/${targetMembership.id}/kick`,
    );
    expect(kickResponse.ok()).toBe(true);
    const kicked = await prisma.communityMembership.findUniqueOrThrow({
      where: { id: targetMembership.id },
    });
    expect(kicked.removedAt).not.toBeNull();
    expect(kicked.removedById).toBe(owner.id);

    await ownerContext.close();
  });

  test("the owner's row and the viewer's own row never show or allow management actions, even via direct POST", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember({
      role: "owner",
    });
    const ownerMembership = await prisma.communityMembership.findFirstOrThrow({
      where: { userId: owner.id, communityId: community.id },
    });

    const adminContext = await browser.newContext();
    const adminUser = await loginAsNewUser(
      adminContext,
      `pw-admin-${faker.string.uuid()}@example.com`,
    );
    const adminMembership = await CommunityMembershipFactory.create({
      user: { connect: { id: adminUser.id } },
      community: { connect: { id: community.id } },
      role: "admin",
      displayName: "AdminSelf",
    });
    const adminPage = await adminContext.newPage();

    await adminPage.goto(`/communities/${community.slug}/members`);
    await expect(
      adminPage.getByRole("button", { name: "Promote to admin" }),
    ).toHaveCount(0);
    await expect(
      adminPage.getByRole("button", { name: "Demote to member" }),
    ).toHaveCount(0);
    await expect(
      adminPage.getByRole("button", { name: "Remove from community" }),
    ).toHaveCount(0);

    const ownerRoleResponse = await adminPage.request.post(
      `/communities/${community.slug}/members/${ownerMembership.id}/role`,
      { form: { role: "member" } },
    );
    expect(ownerRoleResponse.status()).toBe(403);

    const ownerKickResponse = await adminPage.request.post(
      `/communities/${community.slug}/members/${ownerMembership.id}/kick`,
    );
    expect(ownerKickResponse.status()).toBe(403);

    const selfRoleResponse = await adminPage.request.post(
      `/communities/${community.slug}/members/${adminMembership.id}/role`,
      { form: { role: "member" } },
    );
    expect(selfRoleResponse.status()).toBe(403);

    const selfKickResponse = await adminPage.request.post(
      `/communities/${community.slug}/members/${adminMembership.id}/kick`,
    );
    expect(selfKickResponse.status()).toBe(403);

    await adminContext.close();
  });

  test("owner can kick a member via the confirmation modal; the kicked member is fully locked out and cannot rejoin", async ({
    page,
    browser,
    withCommunityMember,
  }) => {
    const { community } = await withCommunityMember({ role: "owner" });
    await prisma.community.update({
      where: { id: community.id },
      data: { visibility: "public", joinPolicy: "open" },
    });

    const kickedUser = await UserFactory.create();
    const kickedMembership = await CommunityMembershipFactory.create({
      user: { connect: { id: kickedUser.id } },
      community: { connect: { id: community.id } },
      role: "member",
      displayName: "ToBeKicked",
    });
    await ItemFactory.create({
      community: { connect: { id: community.id } },
      ownerMembership: { connect: { id: kickedMembership.id } },
      name: "Kicked Widget",
    });

    await page.goto(`/communities/${community.slug}/members`);
    await expect(page.getByText("ToBeKicked", { exact: true })).toBeVisible();

    const dialog = page.getByRole("dialog", {
      name: "Remove ToBeKicked from the community?",
    });
    await expect(async () => {
      await page.getByRole("button", { name: "Remove from community" }).click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await expectNoAxeViolations(page);

    await dialog.getByRole("button", { name: "Remove" }).click();

    await expect(page).toHaveURL(`/communities/${community.slug}/members`);
    await expect(page.getByText("ToBeKicked", { exact: true })).toHaveCount(0);

    const updated = await prisma.communityMembership.findUniqueOrThrow({
      where: { id: kickedMembership.id },
    });
    expect(updated.removedAt).not.toBeNull();
    expect(updated.removedById).not.toBeNull();

    await page.goto(`/communities/${community.slug}/items`);
    await expect(page.getByText("Kicked Widget")).toHaveCount(0);

    const kickedContext = await browser.newContext();
    await loginAsNewUser(kickedContext, kickedUser.email);
    const kickedPage = await kickedContext.newPage();

    for (const path of ["", "/items", "/loans"]) {
      const response = await kickedPage.goto(
        `/communities/${community.slug}${path}`,
      );
      expect(response?.status()).toBe(404);
    }

    const joinResponse = await kickedPage.request.post(
      `/communities/${community.slug}?index`,
      { form: { displayName: "Trying Again" } },
    );
    expect(joinResponse.status()).toBe(404);

    await kickedContext.close();
  });
});
