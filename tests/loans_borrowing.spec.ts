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

    test("reveals the owner's name once the loan is accepted", async ({
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

      await LoanFactory.create({
        item: { connect: { id: item.id } },
        community: { connect: { id: community.id } },
        borrower: { connect: { id: borrower.id } },
        owner: { connect: { id: owner.id } },
        status: "accepted",
      });

      await borrowerPage.goto(`/communities/${community.slug}/loans/borrowing`);
      await expectNoAxeViolations(borrowerPage);

      await expect(
        borrowerPage.getByText(ownerMembership.displayName),
      ).toBeVisible();

      await borrowerContext.close();
    });
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
});
