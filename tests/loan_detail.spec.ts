import { faker } from "@faker-js/faker";

import { prisma } from "~/db.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { ItemFactory } from "~/factories/item_factory.server";
import { LoanFactory } from "~/factories/loan_factory.server";
import { UserFactory } from "~/factories/user_factory.server";

import { expect, test } from "./fixtures";
import { expectNoAxeViolations } from "./helpers/axe";
import { loginAsNewUser } from "./helpers/session";

test.describe("loan detail", () => {
  test.describe("privacy", () => {
    for (const status of [
      "declined",
      "cancelled",
      "expired",
      "completed",
    ] as const) {
      test(`hides the owner's name from the borrower viewer while the loan is ${status}`, async ({
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

        const loan = await LoanFactory.create({
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
          `/communities/${community.slug}/loans/${loan.id}`,
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
      test(`reveals the owner's name to the borrower viewer while the loan is ${status}`, async ({
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

        const loan = await LoanFactory.create({
          item: { connect: { id: item.id } },
          community: { connect: { id: community.id } },
          borrower: { connect: { id: borrower.id } },
          owner: { connect: { id: owner.id } },
          status,
        });

        await borrowerPage.goto(
          `/communities/${community.slug}/loans/${loan.id}`,
        );
        await expect(
          borrowerPage.getByText(ownerMembership.displayName),
        ).toBeVisible();

        await borrowerContext.close();
      });
    }

    for (const status of [
      "declined",
      "cancelled",
      "expired",
      "completed",
    ] as const) {
      test(`hides the borrower's name from the owner viewer while the loan is ${status}`, async ({
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

        const loan = await LoanFactory.create({
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
          `/communities/${community.slug}/loans/${loan.id}`,
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
      test(`reveals the borrower's name to the owner viewer while the loan is ${status}`, async ({
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

        const loan = await LoanFactory.create({
          item: { connect: { id: item.id } },
          community: { connect: { id: community.id } },
          borrower: { connect: { id: borrower.id } },
          owner: { connect: { id: owner.id } },
          status,
        });

        await page.goto(`/communities/${community.slug}/loans/${loan.id}`);
        await expect(
          page.getByText(borrowerMembership.displayName),
        ).toBeVisible();
      });
    }
  });

  test.describe("action availability", () => {
    test("owner viewer, pending loan: shows accept and decline, no cancel or checkout", async ({
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

      await page.goto(`/communities/${community.slug}/loans/${loan.id}`);
      await expectNoAxeViolations(page);

      await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Decline" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Cancel" })).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Check out" }),
      ).toBeHidden();
    });

    test("borrower viewer, pending loan: shows cancel, no accept, decline, or checkout", async ({
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

      await borrowerPage.goto(
        `/communities/${community.slug}/loans/${loan.id}`,
      );

      await expect(
        borrowerPage.getByRole("button", { name: "Cancel" }),
      ).toBeVisible();
      await expect(
        borrowerPage.getByRole("button", { name: "Accept" }),
      ).toBeHidden();
      await expect(
        borrowerPage.getByRole("button", { name: "Decline" }),
      ).toBeHidden();
      await expect(
        borrowerPage.getByRole("button", { name: "Check out" }),
      ).toBeHidden();

      await borrowerContext.close();
    });

    test("owner viewer, accepted loan not yet checked out: shows cancel and checkout, no confirm-return", async ({
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

      await page.goto(`/communities/${community.slug}/loans/${loan.id}`);

      await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Check out" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "I got it back" }),
      ).toBeHidden();
      await expect(
        page.getByRole("button", { name: "I returned it" }),
      ).toBeHidden();
    });

    test("borrower viewer, accepted loan not yet checked out: shows cancel and checkout, no confirm-return", async ({
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

      await borrowerPage.goto(
        `/communities/${community.slug}/loans/${loan.id}`,
      );

      await expect(
        borrowerPage.getByRole("button", { name: "Cancel" }),
      ).toBeVisible();
      await expect(
        borrowerPage.getByRole("button", { name: "Check out" }),
      ).toBeVisible();
      await expect(
        borrowerPage.getByRole("button", { name: "I got it back" }),
      ).toBeHidden();
      await expect(
        borrowerPage.getByRole("button", { name: "I returned it" }),
      ).toBeHidden();

      await borrowerContext.close();
    });

    test("owner viewer, active loan: shows confirm-return, no cancel or checkout", async ({
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
        status: "active",
        checkedOutAt: new Date(),
      });

      await page.goto(`/communities/${community.slug}/loans/${loan.id}`);
      await expectNoAxeViolations(page);

      await expect(
        page.getByRole("button", { name: "I got it back" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Cancel" })).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Check out" }),
      ).toBeHidden();
    });

    test("borrower viewer, active loan, not yet flagged: shows the return-flag button", async ({
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
        status: "active",
        checkedOutAt: new Date(),
      });

      await borrowerPage.goto(
        `/communities/${community.slug}/loans/${loan.id}`,
      );

      await expect(
        borrowerPage.getByRole("button", { name: "I returned it" }),
      ).toBeVisible();

      await borrowerContext.close();
    });

    test("borrower viewer, active loan, already flagged: hides the return-flag button", async ({
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
        status: "active",
        checkedOutAt: new Date(),
        borrowerConfirmedReturnAt: new Date(),
      });

      await borrowerPage.goto(
        `/communities/${community.slug}/loans/${loan.id}`,
      );

      await expect(
        borrowerPage.getByRole("button", { name: "I returned it" }),
      ).toBeHidden();

      await borrowerContext.close();
    });

    for (const status of [
      "completed",
      "declined",
      "cancelled",
      "expired",
    ] as const) {
      test(`no actions are shown for either viewer once the loan is ${status}`, async ({
        browser,
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
          status,
          ...(status === "expired"
            ? { expiresAt: new Date(Date.now() - 60 * 60 * 1000) }
            : {}),
        });

        for (const viewerPage of [page, borrowerPage]) {
          await viewerPage.goto(
            `/communities/${community.slug}/loans/${loan.id}`,
          );
          await expect(
            viewerPage.getByRole("button", { name: "Accept" }),
          ).toBeHidden();
          await expect(
            viewerPage.getByRole("button", { name: "Decline" }),
          ).toBeHidden();
          await expect(
            viewerPage.getByRole("button", { name: "Cancel" }),
          ).toBeHidden();
          await expect(
            viewerPage.getByRole("button", { name: "Check out" }),
          ).toBeHidden();
          await expect(
            viewerPage.getByRole("button", { name: "I got it back" }),
          ).toBeHidden();
          await expect(
            viewerPage.getByRole("button", { name: "I returned it" }),
          ).toBeHidden();
        }

        await borrowerContext.close();
      });
    }
  });

  test.describe("wrong party and not found", () => {
    test("a third community member cannot view a loan they are not a party to", async ({
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

        const response = await otherPage.goto(
          `/communities/${community.slug}/loans/${loan.id}`,
        );
        expect(response?.status()).toBe(404);

        await otherContext.close();
      }
    });

    test("a nonexistent loan id returns 404", async ({
      page,
      withCommunityMember,
    }) => {
      const { community } = await withCommunityMember();

      const response = await page.goto(
        `/communities/${community.slug}/loans/some-loan-id`,
      );
      expect(response?.status()).toBe(404);
    });

    test("a loan belonging to a different community returns 404", async ({
      page,
      withCommunityMember,
    }) => {
      const { community: communityA, user: ownerA } =
        await withCommunityMember();
      const ownerAMembership =
        await prisma.communityMembership.findFirstOrThrow({
          where: { userId: ownerA.id, communityId: communityA.id },
        });
      const itemA = await ItemFactory.create({
        community: { connect: { id: communityA.id } },
        ownerMembership: { connect: { id: ownerAMembership.id } },
      });
      const borrowerA = await UserFactory.create();
      await CommunityMembershipFactory.create({
        user: { connect: { id: borrowerA.id } },
        community: { connect: { id: communityA.id } },
      });
      const loanInCommunityA = await LoanFactory.create({
        item: { connect: { id: itemA.id } },
        community: { connect: { id: communityA.id } },
        borrower: { connect: { id: borrowerA.id } },
        owner: { connect: { id: ownerA.id } },
        status: "pending",
      });

      const { community: communityB } = await withCommunityMember();

      const response = await page.goto(
        `/communities/${communityB.slug}/loans/${loanInCommunityA.id}`,
      );
      expect(response?.status()).toBe(404);
    });
  });
});
