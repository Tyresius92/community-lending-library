import { faker } from "@faker-js/faker";

import { prisma } from "~/db.server";
import { CommunityMembershipFactory } from "~/factories/community_membership_factory.server";
import { ItemFactory } from "~/factories/item_factory.server";

import { expect, test } from "./fixtures";
import { expectNoAxeViolations } from "./helpers/axe";
import { loginAsNewUser } from "./helpers/session";

test.describe("item management", () => {
  test("a member can create, view, edit, and delete their own item", async ({
    page,
    withCommunityMember,
  }) => {
    const { community } = await withCommunityMember();

    await page.goto(`/communities/${community.slug}/my_items/new`);
    await expectNoAxeViolations(page);

    await page.getByLabel("Name", { exact: true }).fill("Cordless Drill");
    await page.getByLabel("Description (optional)").fill("18V, barely used");
    await page.getByRole("button", { name: "Create item" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/communities/${community.slug}/my_items/[^/]+$`),
    );
    await expect(
      page.getByRole("heading", { name: "Cordless Drill" }),
    ).toBeVisible();
    await expect(page.getByText("18V, barely used")).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "Edit" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Cordless Drill 2");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(
      page.getByRole("heading", { name: "Cordless Drill 2" }),
    ).toBeVisible();

    await page.goto(`/communities/${community.slug}/my_items`);
    await expect(
      page.getByRole("link", { name: "Cordless Drill 2" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Cordless Drill 2" }).click();
    await page.getByRole("button", { name: "Delete" }).click();

    const dialog = page.getByRole("dialog", { name: "Delete this item?" });
    await expect(dialog).toBeVisible();
    await expectNoAxeViolations(page);

    await dialog.getByRole("button", { name: "Delete" }).click();

    await expect(page).toHaveURL(`/communities/${community.slug}/my_items`);
    await expect(
      page.getByRole("link", { name: "Cordless Drill 2" }),
    ).toBeHidden();

    await page.goto(`/communities/${community.slug}/items`);
    await expect(
      page.getByRole("link", { name: "Cordless Drill 2" }),
    ).toBeHidden();
  });

  test("shows a validation error for an empty name and does not navigate away", async ({
    page,
    withCommunityMember,
  }) => {
    const { community } = await withCommunityMember();

    await page.goto(`/communities/${community.slug}/my_items/new`);
    await page.getByRole("button", { name: "Create item" }).click();

    await expect(page.getByRole("alert")).toHaveText("Name is required");
    await expect(page).toHaveURL(`/communities/${community.slug}/my_items/new`);
  });

  test("rejects an over-length name server-side even if the client maxLength is bypassed", async ({
    page,
    withCommunityMember,
  }) => {
    const { community } = await withCommunityMember();

    const response = await page.request.post(
      `/communities/${community.slug}/my_items/new`,
      { form: { name: "a".repeat(101), description: "" } },
    );

    expect(response.status()).toBe(400);
    expect(await response.text()).toContain(
      "Name must be 100 characters or fewer",
    );
  });

  test("rejects an over-length description server-side even if the client maxLength is bypassed", async ({
    page,
    withCommunityMember,
  }) => {
    const { community } = await withCommunityMember();

    const response = await page.request.post(
      `/communities/${community.slug}/my_items/new`,
      { form: { name: "Valid Name", description: "a".repeat(1001) } },
    );

    expect(response.status()).toBe(400);
    expect(await response.text()).toContain(
      "Description must be 1000 characters or fewer",
    );
  });

  test("a non-owner, including an admin or owner, cannot view, edit, or delete another member's item", async ({
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

      const detailResponse = await otherPage.goto(
        `/communities/${community.slug}/my_items/${item.id}`,
      );
      expect(detailResponse?.status()).toBe(404);

      const editResponse = await otherPage.goto(
        `/communities/${community.slug}/my_items/${item.id}/edit`,
      );
      expect(editResponse?.status()).toBe(404);

      const deleteResponse = await otherPage.request.post(
        `/communities/${community.slug}/my_items/${item.id}/delete`,
      );
      expect(deleteResponse.status()).toBe(404);

      await otherContext.close();
    }
  });
});
