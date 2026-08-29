import { faker } from "@faker-js/faker";

import { prisma } from "~/db.server";
import { CommunityFactory } from "~/factories/community_factory.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { ItemFactory } from "~/factories/item_factory.server";
import { LoanFactory } from "~/factories/loan_factory.server";

import { expect, test } from "./fixtures";
import { expectNoAxeViolations } from "./helpers/axe";
import { loginAsNewUser } from "./helpers/session";

test.describe("item detail", () => {
  test("a member can view an item and ask to borrow it, creating a pending loan", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember();
    const ownerMembership = await prisma.communityMembership.findFirstOrThrow({
      where: { userId: owner.id, communityId: community.id },
    });
    const item = await ItemFactory.create({
      name: "Cordless Drill",
      community: { connect: { id: community.id } },
      ownerMembership: { connect: { id: ownerMembership.id } },
    });

    const borrowerContext = await browser.newContext();
    const borrowerPage = await borrowerContext.newPage();
    const borrower = await loginAsNewUser(
      borrowerContext,
      `borrower-${faker.string.uuid()}@example.com`,
    );
    await CommunityMembershipFactory.create({
      user: { connect: { id: borrower.id } },
      community: { connect: { id: community.id } },
    });

    await borrowerPage.goto(`/communities/${community.slug}/items/${item.id}`);
    await expectNoAxeViolations(borrowerPage);

    await expect(
      borrowerPage.getByRole("heading", { name: "Cordless Drill" }),
    ).toBeVisible();
    await expect(borrowerPage.getByText("a neighbor")).toBeVisible();

    await borrowerPage.getByRole("button", { name: "Ask to borrow" }).click();

    await expect(borrowerPage).toHaveURL(
      `/communities/${community.slug}/items/${item.id}`,
    );
    await expect(borrowerPage.getByText("Request pending")).toBeVisible();

    const loan = await prisma.loan.findFirstOrThrow({
      where: { itemId: item.id, borrowerId: borrower.id },
    });
    expect(loan.status).toBe("pending");
    expect(loan.ownerId).toBe(owner.id);
    const expectedExpiry = Date.now() + 3 * 24 * 60 * 60 * 1000;
    expect(Math.abs(loan.expiresAt.getTime() - expectedExpiry)).toBeLessThan(
      60_000,
    );

    await borrowerContext.close();
  });

  test("an owner cannot ask to borrow their own item; the CTA is absent and the action is blocked server-side", async ({
    page,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember();
    const ownerMembership = await prisma.communityMembership.findFirstOrThrow({
      where: { userId: owner.id, communityId: community.id },
    });
    const item = await ItemFactory.create({
      name: "Extension Ladder",
      community: { connect: { id: community.id } },
      ownerMembership: { connect: { id: ownerMembership.id } },
    });

    await page.goto(`/communities/${community.slug}/items/${item.id}`);
    await expect(
      page.getByRole("button", { name: "Ask to borrow" }),
    ).toBeHidden();

    const response = await page.request.post(
      `/communities/${community.slug}/items/${item.id}`,
    );
    expect(response.status()).toBe(403);
  });

  test("owner identity is hidden while pending, revealed while accepted/active, and hidden again once completed", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember();
    const ownerMembership = await prisma.communityMembership.findFirstOrThrow({
      where: { userId: owner.id, communityId: community.id },
    });
    const item = await ItemFactory.create({
      name: "Pressure Washer",
      community: { connect: { id: community.id } },
      ownerMembership: { connect: { id: ownerMembership.id } },
    });

    const borrowerContext = await browser.newContext();
    const borrowerPage = await borrowerContext.newPage();
    const borrower = await loginAsNewUser(
      borrowerContext,
      `borrower-${faker.string.uuid()}@example.com`,
    );
    await CommunityMembershipFactory.create({
      user: { connect: { id: borrower.id } },
      community: { connect: { id: community.id } },
    });

    const loan = await LoanFactory.create({
      item: { connect: { id: item.id } },
      community: { connect: { id: community.id } },
      borrower: { connect: { id: borrower.id } },
      owner: { connect: { id: owner.id } },
      status: "pending",
    });

    await borrowerPage.goto(`/communities/${community.slug}/items/${item.id}`);
    await expect(borrowerPage.getByText("a neighbor")).toBeVisible();
    await expect(
      borrowerPage.getByText(ownerMembership.displayName),
    ).toHaveCount(0);

    await prisma.loan.update({
      where: { id: loan.id },
      data: { status: "accepted" },
    });
    await borrowerPage.reload();
    await expect(
      borrowerPage.getByText(ownerMembership.displayName),
    ).toBeVisible();

    await prisma.loan.update({
      where: { id: loan.id },
      data: { status: "active" },
    });
    await borrowerPage.reload();
    await expect(
      borrowerPage.getByText(ownerMembership.displayName),
    ).toBeVisible();

    await prisma.loan.update({
      where: { id: loan.id },
      data: { status: "completed" },
    });
    await borrowerPage.reload();
    await expect(borrowerPage.getByText("a neighbor")).toBeVisible();
    await expect(
      borrowerPage.getByText(ownerMembership.displayName),
    ).toHaveCount(0);
    await expect(
      borrowerPage.getByRole("button", { name: "Ask to borrow" }),
    ).toBeVisible();

    await borrowerContext.close();
  });

  test("owner identity reverts to hidden if an accepted loan is later cancelled", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember();
    const ownerMembership = await prisma.communityMembership.findFirstOrThrow({
      where: { userId: owner.id, communityId: community.id },
    });
    const item = await ItemFactory.create({
      name: "Camping Stove",
      community: { connect: { id: community.id } },
      ownerMembership: { connect: { id: ownerMembership.id } },
    });

    const borrowerContext = await browser.newContext();
    const borrowerPage = await borrowerContext.newPage();
    const borrower = await loginAsNewUser(
      borrowerContext,
      `borrower-${faker.string.uuid()}@example.com`,
    );
    await CommunityMembershipFactory.create({
      user: { connect: { id: borrower.id } },
      community: { connect: { id: community.id } },
    });

    const loan = await LoanFactory.create({
      item: { connect: { id: item.id } },
      community: { connect: { id: community.id } },
      borrower: { connect: { id: borrower.id } },
      owner: { connect: { id: owner.id } },
      status: "accepted",
    });

    await borrowerPage.goto(`/communities/${community.slug}/items/${item.id}`);
    await expect(
      borrowerPage.getByText(ownerMembership.displayName),
    ).toBeVisible();

    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledByRole: "borrower",
      },
    });
    await borrowerPage.reload();
    await expect(borrowerPage.getByText("a neighbor")).toBeVisible();

    await borrowerContext.close();
  });

  test("multiple members can each hold their own pending request on the same item", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember();
    const ownerMembership = await prisma.communityMembership.findFirstOrThrow({
      where: { userId: owner.id, communityId: community.id },
    });
    const item = await ItemFactory.create({
      name: "Canoe",
      community: { connect: { id: community.id } },
      ownerMembership: { connect: { id: ownerMembership.id } },
    });

    const contexts = [];
    for (let i = 0; i < 2; i += 1) {
      const borrowerContext = await browser.newContext();
      const borrowerPage = await borrowerContext.newPage();
      const borrower = await loginAsNewUser(
        borrowerContext,
        `borrower-${i}-${faker.string.uuid()}@example.com`,
      );
      await CommunityMembershipFactory.create({
        user: { connect: { id: borrower.id } },
        community: { connect: { id: community.id } },
      });

      await borrowerPage.goto(
        `/communities/${community.slug}/items/${item.id}`,
      );
      await borrowerPage.getByRole("button", { name: "Ask to borrow" }).click();
      await expect(borrowerPage.getByText("Request pending")).toBeVisible();

      contexts.push(borrowerContext);
    }

    const loans = await prisma.loan.findMany({ where: { itemId: item.id } });
    expect(loans).toHaveLength(2);
    expect(loans.every((loan) => loan.status === "pending")).toBe(true);
    expect(new Set(loans.map((loan) => loan.borrowerId)).size).toBe(2);

    for (const context of contexts) {
      await context.close();
    }
  });

  test("a member with an existing open request cannot create a second one", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember();
    const ownerMembership = await prisma.communityMembership.findFirstOrThrow({
      where: { userId: owner.id, communityId: community.id },
    });
    const item = await ItemFactory.create({
      name: "Tent",
      community: { connect: { id: community.id } },
      ownerMembership: { connect: { id: ownerMembership.id } },
    });

    const borrowerContext = await browser.newContext();
    const borrowerPage = await borrowerContext.newPage();
    const borrower = await loginAsNewUser(
      borrowerContext,
      `borrower-${faker.string.uuid()}@example.com`,
    );
    await CommunityMembershipFactory.create({
      user: { connect: { id: borrower.id } },
      community: { connect: { id: community.id } },
    });
    await LoanFactory.create({
      item: { connect: { id: item.id } },
      community: { connect: { id: community.id } },
      borrower: { connect: { id: borrower.id } },
      owner: { connect: { id: owner.id } },
      status: "pending",
    });

    await borrowerPage.goto(`/communities/${community.slug}/items/${item.id}`);
    await expect(
      borrowerPage.getByRole("button", { name: "Ask to borrow" }),
    ).toBeHidden();

    const response = await borrowerPage.request.post(
      `/communities/${community.slug}/items/${item.id}`,
    );
    expect(response.status()).toBe(403);

    const loans = await prisma.loan.findMany({
      where: { itemId: item.id, borrowerId: borrower.id },
    });
    expect(loans).toHaveLength(1);

    await borrowerContext.close();
  });

  test("an expired pending request no longer blocks asking again, and is persisted as expired", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember();
    const ownerMembership = await prisma.communityMembership.findFirstOrThrow({
      where: { userId: owner.id, communityId: community.id },
    });
    const item = await ItemFactory.create({
      name: "Tent",
      community: { connect: { id: community.id } },
      ownerMembership: { connect: { id: ownerMembership.id } },
    });

    const borrowerContext = await browser.newContext();
    const borrowerPage = await borrowerContext.newPage();
    const borrower = await loginAsNewUser(
      borrowerContext,
      `borrower-${faker.string.uuid()}@example.com`,
    );
    await CommunityMembershipFactory.create({
      user: { connect: { id: borrower.id } },
      community: { connect: { id: community.id } },
    });
    const loan = await LoanFactory.create({
      item: { connect: { id: item.id } },
      community: { connect: { id: community.id } },
      borrower: { connect: { id: borrower.id } },
      owner: { connect: { id: owner.id } },
      status: "pending",
      expiresAt: new Date(Date.now() - 60 * 60 * 1000),
    });

    await borrowerPage.goto(`/communities/${community.slug}/items/${item.id}`);
    await expect(
      borrowerPage.getByRole("button", { name: "Ask to borrow" }),
    ).toBeVisible();
    await expect(borrowerPage.getByText("Request pending")).toBeHidden();

    const persisted = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
    });
    expect(persisted.status).toBe("expired");

    await borrowerContext.close();
  });

  test("a nonexistent item id in a real community returns 404", async ({
    page,
    withCommunityMember,
  }) => {
    const { community } = await withCommunityMember();

    const response = await page.goto(
      `/communities/${community.slug}/items/some-item-id`,
    );
    expect(response?.status()).toBe(404);
  });

  test("a non-member cannot view a private community's item detail", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember();
    const ownerMembership = await prisma.communityMembership.findFirstOrThrow({
      where: { userId: owner.id, communityId: community.id },
    });
    const item = await ItemFactory.create({
      name: "Chainsaw",
      community: { connect: { id: community.id } },
      ownerMembership: { connect: { id: ownerMembership.id } },
    });

    const outsiderContext = await browser.newContext();
    const outsiderPage = await outsiderContext.newPage();
    await loginAsNewUser(
      outsiderContext,
      `outsider-${faker.string.uuid()}@example.com`,
    );

    const response = await outsiderPage.goto(
      `/communities/${community.slug}/items/${item.id}`,
    );
    expect(response?.status()).toBe(404);

    await outsiderContext.close();
  });

  test("a logged-in non-member can view a public community's item but cannot ask to borrow", async ({
    browser,
  }) => {
    const ownerContext = await browser.newContext();
    const owner = await loginAsNewUser(
      ownerContext,
      `owner-${faker.string.uuid()}@example.com`,
    );
    const community = await CommunityFactory.create({
      visibility: "public",
      owner: { connect: { id: owner.id } },
    });
    const ownerMembership = await CommunityMembershipFactory.create({
      user: { connect: { id: owner.id } },
      community: { connect: { id: community.id } },
      role: "owner",
    });
    const item = await ItemFactory.create({
      name: "Wheelbarrow",
      community: { connect: { id: community.id } },
      ownerMembership: { connect: { id: ownerMembership.id } },
    });
    await ownerContext.close();

    const outsiderContext = await browser.newContext();
    const outsiderPage = await outsiderContext.newPage();
    await loginAsNewUser(
      outsiderContext,
      `visitor-${faker.string.uuid()}@example.com`,
    );

    await outsiderPage.goto(`/communities/${community.slug}/items/${item.id}`);
    await expect(
      outsiderPage.getByRole("heading", { name: "Wheelbarrow" }),
    ).toBeVisible();
    await expect(outsiderPage.getByText("a neighbor")).toBeVisible();
    await expect(
      outsiderPage.getByRole("button", { name: "Ask to borrow" }),
    ).toBeHidden();

    const response = await outsiderPage.request.post(
      `/communities/${community.slug}/items/${item.id}`,
    );
    expect(response.status()).toBe(404);

    await outsiderContext.close();
  });
});
