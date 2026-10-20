import { faker } from "@faker-js/faker";
import type { Browser } from "@playwright/test";

import { prisma } from "~/db.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { ItemFactory } from "~/factories/item_factory.server";
import { LoanFactory } from "~/factories/loan_factory.server";
import { MessageFactory } from "~/factories/message_factory.server";
import { UserFactory } from "~/factories/user_factory.server";
import type { LoanStatus } from "~/generated/prisma/client";
import { BODY_MAX_LENGTH } from "~/schemas/message";

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

  test.describe("messages", () => {
    async function setUpLoan(
      browser: Browser,
      {
        community,
        user: owner,
      }: { community: { id: string; slug: string }; user: { id: string } },
      status: LoanStatus,
    ) {
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

      return {
        community,
        owner,
        ownerMembership,
        borrower,
        borrowerMembership,
        borrowerContext,
        borrowerPage,
        loan,
        loanPath: `/communities/${community.slug}/loans/${loan.id}`,
      };
    }

    test("owner and borrower exchange messages on a pending loan", async ({
      page,
      browser,
      withCommunityMember,
    }) => {
      const { borrowerMembership, borrowerContext, borrowerPage, loanPath } =
        await setUpLoan(browser, await withCommunityMember(), "pending");

      await page.goto(loanPath);
      await expect(page.getByText("No messages yet.")).toBeVisible();
      await page
        .getByRole("textbox", { name: "Message" })
        .fill("Someone has this until Tuesday, want to wait?");
      await page.getByRole("button", { name: "Send" }).click();

      const ownerThread = page.getByRole("region", { name: "Messages" });
      await expect(ownerThread.getByRole("listitem")).toHaveCount(1);
      await expect(ownerThread.getByRole("listitem").first()).toContainText(
        "You",
      );
      await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue(
        "",
      );

      await borrowerPage.goto(loanPath);
      const borrowerThread = borrowerPage.getByRole("region", {
        name: "Messages",
      });
      await expect(borrowerThread.getByRole("listitem").first()).toContainText(
        "A neighbor",
      );
      await borrowerPage
        .getByRole("textbox", { name: "Message" })
        .fill("Sure, I can wait.");
      await borrowerPage.getByRole("button", { name: "Send" }).click();
      await expect(borrowerThread.getByRole("listitem").nth(1)).toContainText(
        "You",
      );

      await page.reload();
      const ownerItems = ownerThread.getByRole("listitem");
      await expect(ownerItems).toHaveCount(2);
      await expect(ownerItems.nth(0)).toContainText(
        "Someone has this until Tuesday, want to wait?",
      );
      await expect(ownerItems.nth(1)).toContainText("Sure, I can wait.");
      await expect(ownerItems.nth(1)).toContainText(
        borrowerMembership.displayName,
      );
      await expectNoAxeViolations(page);

      await borrowerContext.close();
    });

    test("hides the owner's name on their messages from the borrower while the loan is pending", async ({
      browser,
      withCommunityMember,
    }) => {
      const {
        owner,
        ownerMembership,
        borrowerContext,
        borrowerPage,
        loan,
        loanPath,
      } = await setUpLoan(browser, await withCommunityMember(), "pending");
      await MessageFactory.create({
        loan: { connect: { id: loan.id } },
        sender: { connect: { id: owner.id } },
        body: "Hello from the owner",
      });

      const response = await borrowerPage.goto(loanPath);
      const body = (await response?.text()) ?? "";
      expect(body).toContain("Hello from the owner");
      expect(body).not.toContain(ownerMembership.displayName);

      const item = borrowerPage
        .getByRole("region", { name: "Messages" })
        .getByRole("listitem")
        .first();
      await expect(item).toContainText("A neighbor");
      await expect(item).toContainText("Hello from the owner");

      await borrowerContext.close();
    });

    test("relabels the owner's earlier messages with their name once the loan is accepted", async ({
      page,
      browser,
      withCommunityMember,
    }) => {
      const {
        owner,
        ownerMembership,
        borrowerContext,
        borrowerPage,
        loan,
        loanPath,
      } = await setUpLoan(browser, await withCommunityMember(), "pending");
      await MessageFactory.create({
        loan: { connect: { id: loan.id } },
        sender: { connect: { id: owner.id } },
        body: "Sent while pending",
      });

      await borrowerPage.goto(loanPath);
      const item = borrowerPage
        .getByRole("region", { name: "Messages" })
        .getByRole("listitem")
        .first();
      await expect(item).toContainText("A neighbor");

      await page.goto(loanPath);
      await page.getByRole("button", { name: "Accept" }).click();
      await expect(page.getByText("Status: Accepted")).toBeVisible();

      await borrowerPage.reload();
      await expect(item).toContainText(ownerMembership.displayName);
      await expect(item).not.toContainText("A neighbor");

      await borrowerContext.close();
    });

    test("preserves line breaks in a multi-line message", async ({
      page,
      browser,
      withCommunityMember,
    }) => {
      const { borrowerContext, loanPath } = await setUpLoan(
        browser,
        await withCommunityMember(),
        "pending",
      );

      await page.goto(loanPath);
      await page
        .getByRole("textbox", { name: "Message" })
        .fill("line one\nline two");
      await page.getByRole("button", { name: "Send" }).click();

      const bodyParagraph = page
        .getByRole("region", { name: "Messages" })
        .getByRole("listitem")
        .first()
        .getByRole("paragraph")
        .last();
      await expect(bodyParagraph).toHaveJSProperty(
        "innerHTML",
        "line one<br>line two",
      );

      await borrowerContext.close();
    });

    test("shows an error for a whitespace-only message", async ({
      page,
      browser,
      withCommunityMember,
    }) => {
      const { borrowerContext, loan, loanPath } = await setUpLoan(
        browser,
        await withCommunityMember(),
        "pending",
      );

      await page.goto(loanPath);
      await page.getByRole("textbox", { name: "Message" }).fill("   ");
      await page.getByRole("button", { name: "Send" }).click();

      await expect(page.getByRole("alert")).toHaveText("Enter a message.");
      expect(
        await prisma.message.findFirst({ where: { loanId: loan.id } }),
      ).toBeNull();

      await borrowerContext.close();
    });

    test("rejects a message over the max length with 400", async ({
      page,
      browser,
      withCommunityMember,
    }) => {
      const { borrowerContext, loan, loanPath } = await setUpLoan(
        browser,
        await withCommunityMember(),
        "pending",
      );

      const response = await page.request.post(loanPath, {
        form: { intent: "send_message", body: "a".repeat(BODY_MAX_LENGTH + 1) },
      });
      expect(response.status()).toBe(400);
      expect(
        await prisma.message.findFirst({ where: { loanId: loan.id } }),
      ).toBeNull();

      await borrowerContext.close();
    });

    for (const status of [
      "completed",
      "declined",
      "cancelled",
      "expired",
    ] as const) {
      test(`hides the thread from both parties and closes messaging while the loan is ${status}`, async ({
        page,
        browser,
        withCommunityMember,
      }) => {
        const { owner, borrowerContext, borrowerPage, loan, loanPath } =
          await setUpLoan(browser, await withCommunityMember(), status);
        await MessageFactory.create({
          loan: { connect: { id: loan.id } },
          sender: { connect: { id: owner.id } },
          body: "An earlier message",
        });

        for (const viewerPage of [page, borrowerPage]) {
          const response = await viewerPage.goto(loanPath);
          const body = (await response?.text()) ?? "";
          expect(body).not.toContain("An earlier message");

          await expect(
            viewerPage.getByText("Messaging is closed for this loan."),
          ).toBeVisible();
          await expect(
            viewerPage.getByRole("textbox", { name: "Message" }),
          ).toHaveCount(0);
        }

        await borrowerContext.close();
      });

      test(`cannot send a message while the loan is ${status}`, async ({
        page,
        browser,
        withCommunityMember,
      }) => {
        const { borrowerContext, loan, loanPath } = await setUpLoan(
          browser,
          await withCommunityMember(),
          status,
        );

        const response = await page.request.post(loanPath, {
          form: { intent: "send_message", body: "Too late" },
        });
        expect(response.status()).toBe(403);
        expect(
          await prisma.message.findFirst({ where: { loanId: loan.id } }),
        ).toBeNull();

        await borrowerContext.close();
      });
    }

    test("a community member who is not a party cannot send a message", async ({
      browser,
      withCommunityMember,
    }) => {
      const { community, borrowerContext, loan, loanPath } = await setUpLoan(
        browser,
        await withCommunityMember(),
        "pending",
      );

      const otherContext = await browser.newContext();
      const otherPage = await otherContext.newPage();
      const otherUser = await loginAsNewUser(
        otherContext,
        `other-${faker.string.uuid()}@example.com`,
      );
      await CommunityMembershipFactory.create({
        user: { connect: { id: otherUser.id } },
        community: { connect: { id: community.id } },
      });

      const response = await otherPage.request.post(loanPath, {
        form: { intent: "send_message", body: "Not my loan" },
      });
      expect(response.status()).toBe(404);
      expect(
        await prisma.message.findFirst({ where: { loanId: loan.id } }),
      ).toBeNull();

      await otherContext.close();
      await borrowerContext.close();
    });
  });
});
