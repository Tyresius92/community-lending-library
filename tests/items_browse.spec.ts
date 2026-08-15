import { faker } from "@faker-js/faker";

import { prisma } from "~/db.server";
import { CommunityFactory } from "~/factories/community_factory.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { ItemFactory } from "~/factories/item_factory.server";

import { expect, test } from "./fixtures";
import { expectNoAxeViolations } from "./helpers/axe";
import { loginAsNewUser } from "./helpers/session";

test.describe("browse items", () => {
  test("shows the viewer's own item as 'You' and another member's item as 'a neighbor', never the owner's name", async ({
    browser,
    page,
    withCommunityMember,
  }) => {
    const { community, user: viewer } = await withCommunityMember();

    const viewerMembership =
      await prisma.communityMembership.findFirstOrThrow({
        where: { userId: viewer.id, communityId: community.id },
      });
    await ItemFactory.create({
      name: "Camping Tent",
      community: { connect: { id: community.id } },
      ownerMembership: { connect: { id: viewerMembership.id } },
    });

    const otherContext = await browser.newContext();
    const otherUser = await loginAsNewUser(
      otherContext,
      `other-${faker.string.uuid()}@example.com`,
    );
    const otherMembership = await CommunityMembershipFactory.create({
      user: { connect: { id: otherUser.id } },
      community: { connect: { id: community.id } },
    });
    await ItemFactory.create({
      name: "Cordless Drill",
      community: { connect: { id: community.id } },
      ownerMembership: { connect: { id: otherMembership.id } },
    });
    await otherContext.close();

    await page.goto(`/communities/${community.slug}/items`);
    await expectNoAxeViolations(page);

    const ownRow = page.getByRole("row", { name: /Camping Tent/ });
    await expect(ownRow.getByRole("cell", { name: "You" })).toBeVisible();

    const otherRow = page.getByRole("row", { name: /Cordless Drill/ });
    await expect(
      otherRow.getByRole("cell", { name: "a neighbor" }),
    ).toBeVisible();

    await expect(page.getByText(otherMembership.displayName)).toHaveCount(0);
  });

  test("a non-member cannot browse a private community's items", async ({
    browser,
    withCommunityMember,
  }) => {
    const { community } = await withCommunityMember();

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await loginAsNewUser(
      otherContext,
      `outsider-${faker.string.uuid()}@example.com`,
    );

    const response = await otherPage.goto(
      `/communities/${community.slug}/items`,
    );
    expect(response?.status()).toBe(404);

    await otherContext.close();
  });

  test("a logged-in non-member can browse a public community's items", async ({
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
    await ItemFactory.create({
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

    await outsiderPage.goto(`/communities/${community.slug}/items`);
    await expect(
      outsiderPage.getByRole("cell", { name: "a neighbor" }),
    ).toBeVisible();

    await outsiderContext.close();
  });
});
