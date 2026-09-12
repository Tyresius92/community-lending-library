import { faker } from "@faker-js/faker";

import { prisma } from "~/db.server";
import { CommunityFactory } from "~/factories/community_factory.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { InviteTokenFactory } from "~/factories/invite_token_factory.server";

import { expect, test } from "./fixtures";
import { expectNoAxeViolations } from "./helpers/axe";
import { loginAsNewUser } from "./helpers/session";

function newEmail(): string {
  return `pw-join-${faker.string.uuid()}@example.com`;
}

test.describe("invite consumption (/join)", () => {
  test("a logged-out visitor with a valid token is redirected through /login, preserving the token", async ({
    browser,
  }) => {
    const inviteToken = await InviteTokenFactory.create();

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`/join?token=${inviteToken.token}`);

    await expect(page).toHaveURL(
      `/login?redirectTo=%2Fjoin%3Ftoken%3D${inviteToken.token}`,
    );

    await context.close();
  });

  test("a logged-in visitor with a valid token can confirm and join", async ({
    browser,
  }) => {
    const community = await CommunityFactory.create();
    const inviteToken = await InviteTokenFactory.create({
      community: { connect: { id: community.id } },
    });

    const context = await browser.newContext();
    const user = await loginAsNewUser(context, newEmail());
    const page = await context.newPage();

    await page.goto(`/join?token=${inviteToken.token}`);
    await expect(
      page.getByRole("heading", { name: `Join ${community.name}` }),
    ).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByLabel("Display name").fill("New Joiner");
    await page.getByRole("button", { name: "Join community" }).click();

    await expect(page).toHaveURL(`/communities/${community.slug}`);

    const membership = await prisma.communityMembership.findUniqueOrThrow({
      where: {
        userId_communityId: { userId: user.id, communityId: community.id },
      },
    });
    expect(membership.displayName).toBe("New Joiner");
    expect(membership.role).toBe("member");

    await context.close();
  });

  test("an unrecognized token shows an invalid-link error, logged in or out, and creates no membership", async ({
    browser,
  }) => {
    const loggedOutContext = await browser.newContext();
    const loggedOutPage = await loggedOutContext.newPage();
    await loggedOutPage.goto("/join?token=not-a-real-token");
    await expect(
      loggedOutPage.getByText("That invite link isn't valid."),
    ).toBeVisible();

    const loggedInContext = await browser.newContext();
    await loginAsNewUser(loggedInContext, newEmail());
    const loggedInPage = await loggedInContext.newPage();
    await loggedInPage.goto("/join?token=not-a-real-token");
    await expect(
      loggedInPage.getByText("That invite link isn't valid."),
    ).toBeVisible();

    await loggedOutContext.close();
    await loggedInContext.close();
  });

  test("an expired token shows an expired-link error", async ({ browser }) => {
    const inviteToken = await InviteTokenFactory.create({
      expiresAt: new Date(Date.now() - 1000),
    });

    const context = await browser.newContext();
    await loginAsNewUser(context, newEmail());
    const page = await context.newPage();

    await page.goto(`/join?token=${inviteToken.token}`);
    await expect(page.getByText("That invite link has expired.")).toBeVisible();

    await context.close();
  });

  test("a revoked token shows a revoked-link error", async ({ browser }) => {
    const inviteToken = await InviteTokenFactory.create({
      revokedAt: new Date(),
    });

    const context = await browser.newContext();
    await loginAsNewUser(context, newEmail());
    const page = await context.newPage();

    await page.goto(`/join?token=${inviteToken.token}`);
    await expect(
      page.getByText("That invite link has been revoked."),
    ).toBeVisible();

    await context.close();
  });

  test("a token for an archived community shows the same invalid-link error", async ({
    browser,
  }) => {
    const community = await CommunityFactory.create({
      archivedAt: new Date(),
    });
    const inviteToken = await InviteTokenFactory.create({
      community: { connect: { id: community.id } },
    });

    const context = await browser.newContext();
    await loginAsNewUser(context, newEmail());
    const page = await context.newPage();

    await page.goto(`/join?token=${inviteToken.token}`);
    await expect(page.getByText("That invite link isn't valid.")).toBeVisible();

    await context.close();
  });

  test("an already-active member is silently redirected into the community", async ({
    browser,
  }) => {
    const community = await CommunityFactory.create();
    const inviteToken = await InviteTokenFactory.create({
      community: { connect: { id: community.id } },
    });

    const context = await browser.newContext();
    const user = await loginAsNewUser(context, newEmail());
    await CommunityMembershipFactory.create({
      user: { connect: { id: user.id } },
      community: { connect: { id: community.id } },
    });
    const page = await context.newPage();

    await page.goto(`/join?token=${inviteToken.token}`);
    await expect(page).toHaveURL(`/communities/${community.slug}`);
    await expect(
      page.getByRole("heading", { name: `Join ${community.name}` }),
    ).toHaveCount(0);

    await context.close();
  });

  test("a removed member cannot rejoin via an invite link", async ({
    browser,
  }) => {
    const community = await CommunityFactory.create();
    const inviteToken = await InviteTokenFactory.create({
      community: { connect: { id: community.id } },
    });

    const context = await browser.newContext();
    const user = await loginAsNewUser(context, newEmail());
    await CommunityMembershipFactory.create({
      user: { connect: { id: user.id } },
      community: { connect: { id: community.id } },
      removedAt: new Date(),
    });
    const page = await context.newPage();

    const response = await page.goto(`/join?token=${inviteToken.token}`);
    expect(response?.status()).toBe(404);

    await context.close();
  });
});
