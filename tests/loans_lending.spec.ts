import { faker } from "@faker-js/faker";

import { prisma } from "~/db.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { ItemFactory } from "~/factories/item_factory.server";
import { LoanFactory } from "~/factories/loan_factory.server";
import { UserFactory } from "~/factories/user_factory.server";

import { expect, test } from "./fixtures";
import { expectNoAxeViolations } from "./helpers/axe";
import { loginAsNewUser } from "./helpers/session";

test.describe("lending", () => {
  test.describe("borrower identity privacy", () => {
    for (const status of [
      "declined",
      "cancelled",
      "expired",
      "completed",
    ] as const) {
      test(`hides the borrower's name, including in the raw response, while the loan is ${status}`, async ({
        page,
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

        const borrower = await UserFactory.create();
        const borrowerMembership = await CommunityMembershipFactory.create({
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

        const response = await page.goto(
          `/communities/${community.slug}/loans/lending`,
        );
        const body = (await response?.text()) ?? "";
        expect(body).not.toContain(borrowerMembership.displayName);

        await expect(
          page.getByText(borrowerMembership.displayName),
        ).toHaveCount(0);
        await expect(page.getByText("A neighbor")).toBeVisible();
      });
    }

    for (const status of ["pending", "accepted", "active"] as const) {
      test(`reveals the borrower's name while the loan is ${status}`, async ({
        page,
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

        const borrower = await UserFactory.create();
        const borrowerMembership = await CommunityMembershipFactory.create({
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

        await page.goto(`/communities/${community.slug}/loans/lending`);
        await expectNoAxeViolations(page);

        await expect(
          page.getByText(borrowerMembership.displayName),
        ).toBeVisible();
      });
    }
  });

  test("shows every loan status, not just the pre-active ones", async ({
    page,
    withCommunityMember,
  }) => {
    const { community, user: owner } = await withCommunityMember();
    const ownerMembership = await prisma.communityMembership.findFirstOrThrow({
      where: { userId: owner.id, communityId: community.id },
    });

    const borrower = await UserFactory.create();
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

    await page.goto(`/communities/${community.slug}/loans/lending`);

    for (const status of statuses) {
      await expect(
        page.getByRole("link", { name: `Item ${status}` }),
      ).toBeVisible();
    }
  });

  test("a pending request shows accept and decline actions", async ({
    page,
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

    const borrower = await UserFactory.create();
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

    await page.goto(`/communities/${community.slug}/loans/lending`);
    await expectNoAxeViolations(page);

    await expect(
      page.getByRole("link", { name: "Cordless Drill" }),
    ).toBeVisible();
    await expect(page.getByText("Pending")).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Decline" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeHidden();
  });

  test("an accepted loan shows a cancel action but no accept/decline", async ({
    page,
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

    const borrower = await UserFactory.create();
    await CommunityMembershipFactory.create({
      user: { connect: { id: borrower.id } },
      community: { connect: { id: community.id } },
    });

    await LoanFactory.create({
      item: { connect: { id: item.id } },
      community: { connect: { id: community.id } },
      borrower: { connect: { id: borrower.id } },
      owner: { connect: { id: owner.id } },
      status: "accepted",
    });

    await page.goto(`/communities/${community.slug}/loans/lending`);

    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Decline" })).toBeHidden();
  });

  test("an expired pending loan displays and persists as expired, with no actions", async ({
    page,
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

    const borrower = await UserFactory.create();
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

    await page.goto(`/communities/${community.slug}/loans/lending`);

    await expect(page.getByText("Expired")).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Decline" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeHidden();

    const persisted = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
    });
    expect(persisted.status).toBe("expired");
  });

  test.describe("actions", () => {
    test("owner can accept a pending request", async ({
      page,
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
      const borrower = await UserFactory.create();
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

      await page.goto(`/communities/${community.slug}/loans/lending`);
      await page.getByRole("button", { name: "Accept" }).click();

      await expect(page).toHaveURL(
        `/communities/${community.slug}/loans/lending`,
      );
      await expect(page.getByText("Accepted")).toBeVisible();

      const persisted = await prisma.loan.findUniqueOrThrow({
        where: { id: loan.id },
      });
      expect(persisted.status).toBe("accepted");
      expect(persisted.acceptedAt).not.toBeNull();
    });

    test("owner can decline a pending request", async ({
      page,
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
      const borrower = await UserFactory.create();
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

      await page.goto(`/communities/${community.slug}/loans/lending`);
      await page.getByRole("button", { name: "Decline" }).click();

      await expect(page).toHaveURL(
        `/communities/${community.slug}/loans/lending`,
      );
      await expect(page.getByText("Declined")).toBeVisible();

      const persisted = await prisma.loan.findUniqueOrThrow({
        where: { id: loan.id },
      });
      expect(persisted.status).toBe("declined");
      expect(persisted.declinedAt).not.toBeNull();
    });

    test("owner can cancel an accepted loan via the confirmation modal", async ({
      page,
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
      const borrower = await UserFactory.create();
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

      await page.goto(`/communities/${community.slug}/loans/lending`);

      const dialog = page.getByRole("dialog", { name: "Cancel this loan?" });
      await expect(async () => {
        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(dialog).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 15_000 });
      await expectNoAxeViolations(page);

      await dialog.getByRole("button", { name: "Cancel request" }).click();

      await expect(page).toHaveURL(
        `/communities/${community.slug}/loans/lending`,
      );
      await expect(page.getByText("Cancelled")).toBeVisible();

      const persisted = await prisma.loan.findUniqueOrThrow({
        where: { id: loan.id },
      });
      expect(persisted.status).toBe("cancelled");
      expect(persisted.cancelledByRole).toBe("owner");
    });

    test("accepting one pending request leaves other pending requests on the same item untouched", async ({
      page,
      withCommunityMember,
    }) => {
      const { community, user: owner } = await withCommunityMember();
      const ownerMembership = await prisma.communityMembership.findFirstOrThrow(
        {
          where: { userId: owner.id, communityId: community.id },
        },
      );
      const item = await ItemFactory.create({
        name: "Shared Drill",
        community: { connect: { id: community.id } },
        ownerMembership: { connect: { id: ownerMembership.id } },
      });

      const borrowerA = await UserFactory.create();
      await CommunityMembershipFactory.create({
        user: { connect: { id: borrowerA.id } },
        community: { connect: { id: community.id } },
      });
      const loanA = await LoanFactory.create({
        item: { connect: { id: item.id } },
        community: { connect: { id: community.id } },
        borrower: { connect: { id: borrowerA.id } },
        owner: { connect: { id: owner.id } },
        status: "pending",
      });

      const borrowerB = await UserFactory.create();
      await CommunityMembershipFactory.create({
        user: { connect: { id: borrowerB.id } },
        community: { connect: { id: community.id } },
      });
      const loanB = await LoanFactory.create({
        item: { connect: { id: item.id } },
        community: { connect: { id: community.id } },
        borrower: { connect: { id: borrowerB.id } },
        owner: { connect: { id: owner.id } },
        status: "pending",
      });

      const acceptResponse = await page.request.post(
        `/communities/${community.slug}/loans/lending/${loanA.id}/accept`,
      );
      expect(acceptResponse.status()).toBe(200);

      const persistedA = await prisma.loan.findUniqueOrThrow({
        where: { id: loanA.id },
      });
      const persistedB = await prisma.loan.findUniqueOrThrow({
        where: { id: loanB.id },
      });
      expect(persistedA.status).toBe("accepted");
      expect(persistedB.status).toBe("pending");

      await page.goto(`/communities/${community.slug}/loans/lending`);
      await expect(page.getByText("Accepted")).toBeVisible();
      await expect(page.getByText("Pending")).toBeVisible();
      await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();
    });

    test("accepting an already-expired pending request is rejected and the loan is persisted as expired", async ({
      page,
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
      const borrower = await UserFactory.create();
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

      const response = await page.request.post(
        `/communities/${community.slug}/loans/lending/${loan.id}/accept`,
      );
      expect(response.status()).toBe(403);

      const persisted = await prisma.loan.findUniqueOrThrow({
        where: { id: loan.id },
      });
      expect(persisted.status).toBe("expired");
    });

    test("owner can check out an accepted loan", async ({
      page,
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
      const borrower = await UserFactory.create();
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

      await page.goto(`/communities/${community.slug}/loans/lending`);
      await page.getByRole("button", { name: "Check out" }).click();

      await expect(page).toHaveURL(
        `/communities/${community.slug}/loans/lending`,
      );
      await expect(page.getByText("Active")).toBeVisible();

      const persisted = await prisma.loan.findUniqueOrThrow({
        where: { id: loan.id },
      });
      expect(persisted.status).toBe("active");
      expect(persisted.checkedOutAt).not.toBeNull();
    });

    for (const status of [
      "pending",
      "active",
      "completed",
      "declined",
      "cancelled",
      "expired",
    ] as const) {
      test(`cannot check out a loan that is ${status}`, async ({
        page,
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
        const borrower = await UserFactory.create();
        await CommunityMembershipFactory.create({
          user: { connect: { id: borrower.id } },
          community: { connect: { id: community.id } },
        });
        const loan = await LoanFactory.create({
          item: { connect: { id: item.id } },
          community: { connect: { id: community.id } },
          borrower: { connect: { id: borrower.id } },
          owner: { connect: { id: owner.id } },
          status,
        });

        const response = await page.request.post(
          `/communities/${community.slug}/loans/lending/${loan.id}/checkout`,
        );
        expect(response.status()).toBe(403);

        const persisted = await prisma.loan.findUniqueOrThrow({
          where: { id: loan.id },
        });
        expect(persisted.status).toBe(status);
      });
    }

    test("cannot cancel an accepted loan that has already been checked out", async ({
      page,
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
      const borrower = await UserFactory.create();
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

      const response = await page.request.post(
        `/communities/${community.slug}/loans/lending/${loan.id}/cancel`,
      );
      expect(response.status()).toBe(403);

      const persisted = await prisma.loan.findUniqueOrThrow({
        where: { id: loan.id },
      });
      expect(persisted.status).toBe("accepted");
    });

    for (const action of ["accept", "decline", "cancel", "checkout"] as const) {
      test(`only the item's owner can ${action} a loan`, async ({
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
        const borrower = await UserFactory.create();
        await CommunityMembershipFactory.create({
          user: { connect: { id: borrower.id } },
          community: { connect: { id: community.id } },
        });
        const loan = await LoanFactory.create({
          item: { connect: { id: item.id } },
          community: { connect: { id: community.id } },
          borrower: { connect: { id: borrower.id } },
          owner: { connect: { id: owner.id } },
          status:
            action === "cancel" || action === "checkout"
              ? "accepted"
              : "pending",
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
            `/communities/${community.slug}/loans/lending/${loan.id}/${action}`,
          );
          expect(response.status()).toBe(404);

          await otherContext.close();
        }

        const persisted = await prisma.loan.findUniqueOrThrow({
          where: { id: loan.id },
        });
        expect(persisted.status).toBe(
          action === "cancel" || action === "checkout" ? "accepted" : "pending",
        );
      });
    }
  });
});
