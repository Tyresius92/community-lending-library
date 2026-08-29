import { faker } from "@faker-js/faker";

import { prisma } from "~/db.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { ItemFactory } from "~/factories/item_factory.server";
import { LoanFactory } from "~/factories/loan_factory.server";

import { expect, test } from "./fixtures";
import { expectNoAxeViolations } from "./helpers/axe";
import { loginAsNewUser } from "./helpers/session";

test.describe("borrowing", () => {
  test.describe("owner identity privacy", () => {
    for (const status of [
      "pending",
      "declined",
      "cancelled",
      "expired",
      "completed",
    ] as const) {
      test(`hides the owner's name, including in the raw response, while the loan is ${status}`, async ({
        browser,
        withCommunityMember,
      }) => {
        const { community, user: owner } = await withCommunityMember();
        const ownerMembership =
          await prisma.communityMembership.findFirstOrThrow({
            where: { userId: owner.id, communityId: community.id },
          });
        const item = await ItemFactory.create({
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
          status,
          ...(status === "expired"
            ? { expiresAt: new Date(Date.now() - 60 * 60 * 1000) }
            : {}),
        });

        const response = await borrowerPage.goto(
          `/communities/${community.slug}/loans/borrowing`,
        );
        const body = (await response?.text()) ?? "";
        expect(body).not.toContain(ownerMembership.displayName);

        await expect(
          borrowerPage.getByText(ownerMembership.displayName),
        ).toHaveCount(0);
        await expect(borrowerPage.getByText("A neighbor")).toBeVisible();

        await borrowerContext.close();
      });
    }

    for (const status of ["accepted", "active"] as const) {
      test(`reveals the owner's name while the loan is ${status}`, async ({
        browser,
        withCommunityMember,
      }) => {
        const { community, user: owner } = await withCommunityMember();
        const ownerMembership =
          await prisma.communityMembership.findFirstOrThrow({
            where: { userId: owner.id, communityId: community.id },
          });
        const item = await ItemFactory.create({
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
          status,
        });

        await borrowerPage.goto(
          `/communities/${community.slug}/loans/borrowing`,
        );
        await expectNoAxeViolations(borrowerPage);

        await expect(
          borrowerPage.getByText(ownerMembership.displayName),
        ).toBeVisible();

        await borrowerContext.close();
      });
    }
  });

  test("shows every loan status, not just the pre-active ones", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember();
    const ownerMembership = await prisma.communityMembership.findFirstOrThrow({
      where: { userId: owner.id, communityId: community.id },
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

    const statuses = [
      "pending",
      "accepted",
      "active",
      "completed",
      "declined",
      "cancelled",
      "expired",
    ] as const;

    for (const status of statuses) {
      const item = await ItemFactory.create({
        name: `Item ${status}`,
        community: { connect: { id: community.id } },
        ownerMembership: { connect: { id: ownerMembership.id } },
      });
      await LoanFactory.create({
        item: { connect: { id: item.id } },
        community: { connect: { id: community.id } },
        borrower: { connect: { id: borrower.id } },
        owner: { connect: { id: owner.id } },
        status,
      });
    }

    await borrowerPage.goto(`/communities/${community.slug}/loans/borrowing`);

    for (const status of statuses) {
      await expect(
        borrowerPage.getByRole("link", { name: `Item ${status}` }),
      ).toBeVisible();
    }

    await borrowerContext.close();
  });

  test("shows a pending loan with a cancel action and no owner name", async ({
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

    await LoanFactory.create({
      item: { connect: { id: item.id } },
      community: { connect: { id: community.id } },
      borrower: { connect: { id: borrower.id } },
      owner: { connect: { id: owner.id } },
      status: "pending",
    });

    await borrowerPage.goto(`/communities/${community.slug}/loans/borrowing`);
    await expectNoAxeViolations(borrowerPage);

    await expect(
      borrowerPage.getByRole("link", { name: "Cordless Drill" }),
    ).toBeVisible();
    await expect(borrowerPage.getByText("Pending")).toBeVisible();
    await expect(
      borrowerPage.getByRole("button", { name: "Cancel" }),
    ).toBeVisible();

    await borrowerContext.close();
  });

  test("an expired pending loan displays and persists as expired, with no cancel action", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember();
    const ownerMembership = await prisma.communityMembership.findFirstOrThrow({
      where: { userId: owner.id, communityId: community.id },
    });
    const item = await ItemFactory.create({
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

    await borrowerPage.goto(`/communities/${community.slug}/loans/borrowing`);

    await expect(borrowerPage.getByText("Expired")).toBeVisible();
    await expect(
      borrowerPage.getByRole("button", { name: "Cancel" }),
    ).toBeHidden();

    const persisted = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
    });
    expect(persisted.status).toBe("expired");

    await borrowerContext.close();
  });

  test.describe("actions", () => {
    test("borrower can cancel a pending request via the confirmation modal", async ({
      browser,
      withCommunityMember,
    }) => {
      const { community, user: owner } = await withCommunityMember();
      const ownerMembership = await prisma.communityMembership.findFirstOrThrow(
        {
          where: { userId: owner.id, communityId: community.id },
        },
      );
      const item = await ItemFactory.create({
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

      await borrowerPage.goto(`/communities/${community.slug}/loans/borrowing`);

      const dialog = borrowerPage.getByRole("dialog", {
        name: "Cancel this loan?",
      });
      await expect(async () => {
        await borrowerPage.getByRole("button", { name: "Cancel" }).click();
        await expect(dialog).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 15_000 });
      await expectNoAxeViolations(borrowerPage);

      await dialog.getByRole("button", { name: "Cancel request" }).click();

      await expect(borrowerPage).toHaveURL(
        `/communities/${community.slug}/loans/borrowing`,
      );
      await expect(borrowerPage.getByText("Cancelled")).toBeVisible();

      const persisted = await prisma.loan.findUniqueOrThrow({
        where: { id: loan.id },
      });
      expect(persisted.status).toBe("cancelled");
      expect(persisted.cancelledByRole).toBe("borrower");

      await borrowerContext.close();
    });

    test("borrower can cancel an accepted loan that has not been checked out", async ({
      browser,
      withCommunityMember,
    }) => {
      const { community, user: owner } = await withCommunityMember();
      const ownerMembership = await prisma.communityMembership.findFirstOrThrow(
        {
          where: { userId: owner.id, communityId: community.id },
        },
      );
      const item = await ItemFactory.create({
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

      const response = await borrowerPage.request.post(
        `/communities/${community.slug}/loans/borrowing/${loan.id}/cancel`,
      );
      expect(response.status()).toBe(200);

      const persisted = await prisma.loan.findUniqueOrThrow({
        where: { id: loan.id },
      });
      expect(persisted.status).toBe("cancelled");
      expect(persisted.cancelledByRole).toBe("borrower");

      await borrowerContext.close();
    });

    test("borrower cannot cancel an accepted loan that has already been checked out", async ({
      browser,
      withCommunityMember,
    }) => {
      const { community, user: owner } = await withCommunityMember();
      const ownerMembership = await prisma.communityMembership.findFirstOrThrow(
        {
          where: { userId: owner.id, communityId: community.id },
        },
      );
      const item = await ItemFactory.create({
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
        checkedOutAt: new Date(),
      });

      const response = await borrowerPage.request.post(
        `/communities/${community.slug}/loans/borrowing/${loan.id}/cancel`,
      );
      expect(response.status()).toBe(403);

      const persisted = await prisma.loan.findUniqueOrThrow({
        where: { id: loan.id },
      });
      expect(persisted.status).toBe("accepted");

      await borrowerContext.close();
    });

    test("cancelling an already-expired pending request is rejected and the loan is persisted as expired", async ({
      browser,
      withCommunityMember,
    }) => {
      const { community, user: owner } = await withCommunityMember();
      const ownerMembership = await prisma.communityMembership.findFirstOrThrow(
        {
          where: { userId: owner.id, communityId: community.id },
        },
      );
      const item = await ItemFactory.create({
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

      const response = await borrowerPage.request.post(
        `/communities/${community.slug}/loans/borrowing/${loan.id}/cancel`,
      );
      expect(response.status()).toBe(403);

      const persisted = await prisma.loan.findUniqueOrThrow({
        where: { id: loan.id },
      });
      expect(persisted.status).toBe("expired");

      await borrowerContext.close();
    });

    test("only the requesting borrower can cancel their loan", async ({
      browser,
      withCommunityMember,
    }) => {
      const { community, user: owner } = await withCommunityMember();
      const ownerMembership = await prisma.communityMembership.findFirstOrThrow(
        {
          where: { userId: owner.id, communityId: community.id },
        },
      );
      const item = await ItemFactory.create({
        community: { connect: { id: community.id } },
        ownerMembership: { connect: { id: ownerMembership.id } },
      });

      const borrowerContext = await browser.newContext();
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

      for (const role of ["member", "admin", "owner"] as const) {
        const otherContext = await browser.newContext();
        const otherPage = await otherContext.newPage();
        const otherUser = await loginAsNewUser(
          otherContext,
          `other-${role}-${faker.string.uuid()}@example.com`,
        );
        await CommunityMembershipFactory.create({
          user: { connect: { id: otherUser.id } },
          community: { connect: { id: community.id } },
          role,
        });

        const response = await otherPage.request.post(
          `/communities/${community.slug}/loans/borrowing/${loan.id}/cancel`,
        );
        expect(response.status()).toBe(404);

        await otherContext.close();
      }

      const persisted = await prisma.loan.findUniqueOrThrow({
        where: { id: loan.id },
      });
      expect(persisted.status).toBe("pending");

      await borrowerContext.close();
    });
  });
});
