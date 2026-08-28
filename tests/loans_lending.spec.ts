import { prisma } from "~/db.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { ItemFactory } from "~/factories/item_factory.server";
import { LoanFactory } from "~/factories/loan_factory.server";
import { UserFactory } from "~/factories/user_factory.server";

import { expect, test } from "./fixtures";
import { expectNoAxeViolations } from "./helpers/axe";

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
});
