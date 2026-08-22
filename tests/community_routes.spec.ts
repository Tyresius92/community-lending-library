import { expect, test } from "./fixtures";

test.describe("community-scoped route scaffolding", () => {
  test("items route resolves", async ({ page, withCommunityMember }) => {
    const { community } = await withCommunityMember();

    await page.goto(`/communities/${community.slug}/items`);

    await expect(page).toHaveURL(`/communities/${community.slug}/items`);
    await expect(page.getByRole("heading", { name: "Items" })).toBeVisible();
  });

  test("my_items/new route resolves", async ({ page, withCommunityMember }) => {
    const { community } = await withCommunityMember();

    await page.goto(`/communities/${community.slug}/my_items/new`);

    await expect(page).toHaveURL(`/communities/${community.slug}/my_items/new`);
    await expect(page.getByRole("heading", { name: "New item" })).toBeVisible();
  });

  test("members route resolves", async ({ page, withCommunityMember }) => {
    const { community } = await withCommunityMember();

    await page.goto(`/communities/${community.slug}/members`);

    await expect(page).toHaveURL(`/communities/${community.slug}/members`);
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  });

  test("loans route resolves", async ({ page, withCommunityMember }) => {
    const { community } = await withCommunityMember();

    await page.goto(`/communities/${community.slug}/loans`);

    await expect(page).toHaveURL(`/communities/${community.slug}/loans`);
    await expect(page.getByRole("heading", { name: "Loans" })).toBeVisible();
  });
});
